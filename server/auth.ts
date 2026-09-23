import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'autofleet-super-secret-jwt-key-2026-prod';

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  customerId?: number;
  fullName?: string;
  twoFactorVerified?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      fullName: user.fullName,
      twoFactorVerified: user.twoFactorVerified ?? (user.role === 'customer' ? false : true)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Verify user still exists in DB
    const dbUser = dbGet<{ id: number; email: string; role: 'admin' | 'staff' | 'customer' }>(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!dbUser) {
      res.status(401).json({ error: 'User account no longer exists' });
      return;
    }

    // Query customer profile directly from DB to ensure customerId is always valid
    let customerId = decoded.customerId;
    let fullName = decoded.fullName;

    const cust = dbGet<{ id: number; full_name: string }>(
      'SELECT id, full_name FROM customers WHERE user_id = ?',
      [dbUser.id]
    );

    if (cust) {
      customerId = cust.id;
      if (cust.full_name) fullName = cust.full_name;
    } else {
      // Check for orphaned customer record or auto-provision
      const unlinked = dbGet<{ id: number; full_name: string }>(
        'SELECT id, full_name FROM customers WHERE user_id = 0 ORDER BY id DESC LIMIT 1'
      );
      if (unlinked) {
        dbRun('UPDATE customers SET user_id = ? WHERE id = ?', [dbUser.id, unlinked.id]);
        customerId = unlinked.id;
        fullName = unlinked.full_name;
      } else {
        const defaultName = decoded.fullName || dbUser.email.split('@')[0];
        const ins = dbRun(
          'INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)',
          [dbUser.id, defaultName, '+1 (555) 019-2834', 'DL-PENDING', 'Customer Address']
        );
        const autoCust = dbGet<{ id: number; full_name: string }>(
          'SELECT id, full_name FROM customers WHERE user_id = ?',
          [dbUser.id]
        );
        if (autoCust) {
          customerId = autoCust.id;
          fullName = autoCust.full_name;
        }
      }
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      customerId,
      fullName: fullName || dbUser.email
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const dbUser = dbGet<{ id: number; email: string; role: 'admin' | 'staff' | 'customer' }>(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.id]
    );

    if (dbUser) {
      let customerId = decoded.customerId;
      let fullName = decoded.fullName;

      const cust = dbGet<{ id: number; full_name: string }>(
        'SELECT id, full_name FROM customers WHERE user_id = ?',
        [dbUser.id]
      );

      if (cust) {
        customerId = cust.id;
        if (cust.full_name) fullName = cust.full_name;
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        customerId,
        fullName: fullName || dbUser.email
      };
    }
  } catch (err) {
    // Ignore invalid token for optional auth
  }
  next();
}

export function requireRole(allowedRoles: ('admin' | 'staff' | 'customer')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
      return;
    }

    next();
  };
}
