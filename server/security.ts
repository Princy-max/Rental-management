import crypto from 'crypto';
import { Request } from 'express';
import { dbGet, dbRun, dbQuery } from './db.js';

export interface SecurityLogEntry {
  id: number;
  user_id?: number;
  email: string;
  role: string;
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  created_at: string;
}

// In-memory brute force protection tracking
// Key is email or IP
interface AttemptRecord {
  failures: number;
  lockedUntil?: number;
  lastAttempt: number;
}

const attemptTracker = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000; // 15-minute failure window

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

export function getUserAgent(req: Request): string {
  return (req.headers['user-agent'] || 'Unknown Client').substring(0, 200);
}

export function isRateLimited(identifier: string): { limited: boolean; retryAfterSeconds: number } {
  const record = attemptTracker.get(identifier.toLowerCase());
  if (!record) return { limited: false, retryAfterSeconds: 0 };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { limited: true, retryAfterSeconds: remaining };
  }

  // If lockout expired or window expired, reset
  if (record.lockedUntil && now >= record.lockedUntil) {
    attemptTracker.delete(identifier.toLowerCase());
  } else if (now - record.lastAttempt > WINDOW_DURATION_MS) {
    attemptTracker.delete(identifier.toLowerCase());
  }

  return { limited: false, retryAfterSeconds: 0 };
}

export function recordFailedAttempt(identifier: string): { locked: boolean; remainingAttempts: number } {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const record = attemptTracker.get(key) || { failures: 0, lastAttempt: now };

  record.failures += 1;
  record.lastAttempt = now;

  if (record.failures >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    attemptTracker.set(key, record);
    return { locked: true, remainingAttempts: 0 };
  }

  attemptTracker.set(key, record);
  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.failures };
}

export function clearFailedAttempts(identifier: string): void {
  attemptTracker.delete(identifier.toLowerCase());
}

export function logSecurityEvent(params: {
  userId?: number;
  email: string;
  role: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}): void {
  try {
    dbRun(
      `INSERT INTO security_audit_logs (user_id, email, role, event_type, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.userId || null,
        params.email.toLowerCase(),
        params.role,
        params.eventType,
        params.ipAddress || '127.0.0.1',
        params.userAgent || 'Web Client',
        params.details || ''
      ]
    );
  } catch (err) {
    console.error('Failed to write security audit log:', err);
  }
}

export function generate6DigitCode(): string {
  // Generate cryptographically strong 6-digit numeric verification code
  const codeInt = crypto.randomInt(100000, 999999);
  return codeInt.toString();
}

export function create2FAChallenge(
  user: { id: number; email: string; role: string },
  req: Request
): { tempToken: string; code: string; expiresInSeconds: number } {
  const tempToken = crypto.randomUUID();
  const code = generate6DigitCode();
  const expiresInSeconds = 300; // 5 minutes validity
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  // Invalidate any active previous verifications for this user
  dbRun('UPDATE security_verifications SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

  dbRun(
    `INSERT INTO security_verifications (user_id, temp_token, code, expires_at, attempts, used)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [user.id, tempToken, code, expiresAt]
  );

  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  logSecurityEvent({
    userId: user.id,
    email: user.email,
    role: user.role,
    eventType: '2FA_CHALLENGE_ISSUED',
    ipAddress: ip,
    userAgent: ua,
    details: `Security verification challenge issued for privileged [${user.role.toUpperCase()}] session.`
  });

  return { tempToken, code, expiresInSeconds };
}

export function verify2FAChallenge(
  tempToken: string,
  enteredCode: string,
  req: Request
): { success: boolean; error?: string; user?: any } {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  if (!tempToken || !enteredCode) {
    return { success: false, error: 'Verification token and 6-digit security code are required.' };
  }

  const record = dbGet<{
    id: number;
    user_id: number;
    temp_token: string;
    code: string;
    expires_at: string;
    attempts: number;
    used: number;
  }>('SELECT * FROM security_verifications WHERE temp_token = ?', [tempToken]);

  if (!record || record.used === 1) {
    return {
      success: false,
      error: 'Invalid or expired security session. Please return to login.'
    };
  }

  const user = dbGet<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE id = ?',
    [record.user_id]
  );

  if (!user) {
    return { success: false, error: 'User account not found.' };
  }

  // Check expiry
  if (new Date(record.expires_at).getTime() < Date.now()) {
    dbRun('UPDATE security_verifications SET used = 1 WHERE id = ?', [record.id]);
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      eventType: '2FA_EXPIRED',
      ipAddress: ip,
      userAgent: ua,
      details: 'Expired 2FA code verification attempt.'
    });
    return { success: false, error: 'Security code has expired. Please request a new code.' };
  }

  // Check attempts
  const newAttempts = record.attempts + 1;
  dbRun('UPDATE security_verifications SET attempts = ? WHERE id = ?', [newAttempts, record.id]);

  if (newAttempts > 3) {
    dbRun('UPDATE security_verifications SET used = 1 WHERE id = ?', [record.id]);
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      eventType: '2FA_ATTEMPTS_EXCEEDED',
      ipAddress: ip,
      userAgent: ua,
      details: 'Maximum verification attempts (3) exceeded. Session invalidated.'
    });
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Security session invalidated. Please log in again.'
    };
  }

  const cleanEntered = enteredCode.toString().trim().replace(/\D/g, '');
  if (record.code !== cleanEntered) {
    const remaining = 3 - newAttempts;
    logSecurityEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      eventType: '2FA_FAILED_ATTEMPT',
      ipAddress: ip,
      userAgent: ua,
      details: `Incorrect code entered. ${remaining} attempts remaining.`
    });
    return {
      success: false,
      error: `Invalid security verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Success!
  dbRun('UPDATE security_verifications SET used = 1 WHERE id = ?', [record.id]);
  clearFailedAttempts(user.email);
  clearFailedAttempts(ip);

  logSecurityEvent({
    userId: user.id,
    email: user.email,
    role: user.role,
    eventType: '2FA_VERIFIED_SUCCESS',
    ipAddress: ip,
    userAgent: ua,
    details: `Multi-factor identity verified successfully for [${user.role.toUpperCase()}] user.`
  });

  return { success: true, user };
}

export function resend2FAChallenge(
  tempToken: string,
  req: Request
): { success: boolean; error?: string; code?: string; expiresInSeconds?: number } {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const record = dbGet<{
    id: number;
    user_id: number;
    temp_token: string;
    used: number;
  }>('SELECT * FROM security_verifications WHERE temp_token = ? AND used = 0', [tempToken]);

  if (!record) {
    return { success: false, error: 'Active security session not found. Please log in again.' };
  }

  const user = dbGet<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE id = ?',
    [record.user_id]
  );

  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  const newCode = generate6DigitCode();
  const expiresInSeconds = 300;
  const newExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  dbRun(
    'UPDATE security_verifications SET code = ?, expires_at = ?, attempts = 0 WHERE id = ?',
    [newCode, newExpiresAt, record.id]
  );

  logSecurityEvent({
    userId: user.id,
    email: user.email,
    role: user.role,
    eventType: '2FA_CODE_RESENT',
    ipAddress: ip,
    userAgent: ua,
    details: 'New 2FA code reissued upon client request.'
  });

  return { success: true, code: newCode, expiresInSeconds };
}

export function getRecentSecurityLogs(limit = 50): SecurityLogEntry[] {
  return dbQuery<SecurityLogEntry>(
    `SELECT id, user_id, email, role, event_type, ip_address, user_agent, details, created_at
     FROM security_audit_logs
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
}
