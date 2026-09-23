import express, { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbGet, dbQuery, dbRun, saveDatabase, seedInitialData } from './db.js';
import {
  generateToken,
  requireAuth,
  requireRole,
  optionalAuth,
  AuthenticatedRequest,
  AuthUser
} from './auth.js';
import { generateVehicleRecommendations } from './recommendation.js';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  logSecurityEvent,
  create2FAChallenge,
  verify2FAChallenge,
  resend2FAChallenge,
  getRecentSecurityLogs,
  getClientIp,
  getUserAgent
} from './security.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================

// Register customer
apiRouter.post('/auth/register', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, fullName, phone, drivingLicense, address } = req.body;

    if (!email || !password || !fullName || !phone || !drivingLicense) {
      res.status(400).json({ error: 'All required fields (email, password, fullName, phone, drivingLicense) must be provided.' });
      return;
    }

    // Check duplicate
    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    dbRun(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'customer')`,
      [email.toLowerCase().trim(), passwordHash]
    );
    const userRow = dbGet<{ id: number }>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    const userId = userRow!.id;

    // Insert customer record
    dbRun(
      `INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)`,
      [userId, fullName.trim(), phone.trim(), drivingLicense.trim(), (address || '').trim()]
    );
    const custRow = dbGet<{ id: number }>('SELECT id FROM customers WHERE user_id = ?', [userId]);
    const customerId = custRow!.id;

    const authUser: AuthUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      role: 'customer',
      customerId,
      fullName: fullName.trim()
    };

    const token = generateToken(authUser);
    res.status(201).json({
      token,
      user: authUser,
      message: 'Account registered successfully'
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login with Rate Limiting & Admin/Staff 2FA Verification
apiRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check Rate Limiting / Lockout on Email & IP
    const emailLimit = isRateLimited(cleanEmail);
    if (emailLimit.limited) {
      logSecurityEvent({
        email: cleanEmail,
        role: 'unknown',
        eventType: 'RATE_LIMITED',
        ipAddress: clientIp,
        userAgent,
        details: `Login blocked: Account locked. Retry in ${emailLimit.retryAfterSeconds}s.`
      });
      res.status(429).json({
        error: `Security Lockout: Too many failed login attempts. Please wait ${emailLimit.retryAfterSeconds} seconds before retrying.`
      });
      return;
    }

    const ipLimit = isRateLimited(clientIp);
    if (ipLimit.limited) {
      res.status(429).json({
        error: `Security Lockout: Terminal locked due to repeated failures. Please wait ${ipLimit.retryAfterSeconds} seconds.`
      });
      return;
    }

    // 2. Fetch User
    const user = dbGet<{ id: number; email: string; password_hash: string; role: 'admin' | 'staff' | 'customer' }>(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (!user) {
      const emailAttempt = recordFailedAttempt(cleanEmail);
      recordFailedAttempt(clientIp);
      logSecurityEvent({
        email: cleanEmail,
        role: 'unknown',
        eventType: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        details: 'Failed login attempt: Account does not exist.'
      });
      res.status(401).json({
        error: emailAttempt.locked
          ? 'Security Lockout: Maximum login attempts exceeded. Account locked for 60 seconds.'
          : 'Invalid email or password.'
      });
      return;
    }

    // 3. Password Verification
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const emailAttempt = recordFailedAttempt(cleanEmail);
      recordFailedAttempt(clientIp);
      logSecurityEvent({
        userId: user.id,
        email: cleanEmail,
        role: user.role,
        eventType: 'LOGIN_FAILED',
        ipAddress: clientIp,
        userAgent,
        details: `Invalid password provided for [${user.role.toUpperCase()}]. Attempts remaining: ${emailAttempt.remainingAttempts}.`
      });
      res.status(401).json({
        error: emailAttempt.locked
          ? 'Security Lockout: Maximum login attempts exceeded. Account locked for 60 seconds.'
          : 'Invalid email or password.'
      });
      return;
    }

    // Clear password failure counters on password match
    clearFailedAttempts(cleanEmail);
    clearFailedAttempts(clientIp);

    // 4. Role-based Extra Security Check
    // If the account is an Admin or Staff (Elevated Operations / Fleet Control),
    // require Multi-Factor Security Verification (2FA) challenge!
    if (user.role === 'admin' || user.role === 'staff') {
      const challenge = create2FAChallenge(user, req);
      res.json({
        requires2FA: true,
        tempToken: challenge.tempToken,
        role: user.role,
        email: user.email,
        fullName: user.role === 'admin' ? 'Fleet Administrator' : 'Rental Operations Staff',
        securityCode: challenge.code,
        expiresInSeconds: challenge.expiresInSeconds,
        message: `Two-Factor Security Verification Required: Elevated ${user.role.toUpperCase()} privileges detected.`
      });
      return;
    }

    // For Customer accounts, standard login is permitted
    let customerId: number | undefined;
    let fullName: string | undefined;

    const cust = dbGet<{ id: number; full_name: string }>(
      'SELECT id, full_name FROM customers WHERE user_id = ?',
      [user.id]
    );
    if (cust) {
      customerId = cust.id;
      fullName = cust.full_name;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId,
      fullName: fullName || user.email.split('@')[0],
      twoFactorVerified: false
    };

    logSecurityEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      eventType: 'PASSWORD_LOGIN_SUCCESS',
      ipAddress: clientIp,
      userAgent,
      details: 'Customer session authenticated successfully.'
    });

    const token = generateToken(authUser);
    res.json({
      token,
      user: authUser,
      message: 'Login successful'
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// 2FA Code Verification Endpoint for Admin & Staff
apiRouter.post('/auth/verify-2fa', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    if (!tempToken || !code) {
      res.status(400).json({ error: 'Verification session token and 6-digit code are required.' });
      return;
    }

    const verificationResult = verify2FAChallenge(tempToken, code, req);
    if (!verificationResult.success || !verificationResult.user) {
      res.status(401).json({ error: verificationResult.error || 'Verification failed.' });
      return;
    }

    const dbUser = verificationResult.user;
    const fullName = dbUser.role === 'admin' ? 'Fleet Administrator' : 'Rental Operations Staff';

    const authUser: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      fullName,
      twoFactorVerified: true
    };

    const token = generateToken(authUser);
    res.json({
      token,
      user: authUser,
      message: `Identity verified. Welcome back, ${fullName}!`
    });
  } catch (err: any) {
    console.error('2FA verification error:', err);
    res.status(500).json({ error: 'Security verification failed. Please try again.' });
  }
});

// Resend / Regenerate 2FA Code
apiRouter.post('/auth/resend-2fa', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      res.status(400).json({ error: 'Verification token required.' });
      return;
    }

    const result = resend2FAChallenge(tempToken, req);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to reissue security token.' });
      return;
    }

    res.json({
      securityCode: result.code,
      expiresInSeconds: result.expiresInSeconds,
      message: 'New 6-digit security code generated.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reissue code.' });
  }
});

// 1-Click Demo Login with 2FA Challenge for Privileged Roles
apiRouter.post('/auth/demo-login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, bypass2FA } = req.body;
    let email = 'admin@autofleet.com';
    if (role === 'staff') email = 'staff@autofleet.com';
    else if (role === 'customer') email = 'john.doe@example.com';

    const user = dbGet<{ id: number; email: string; role: 'admin' | 'staff' | 'customer' }>(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      res.status(404).json({ error: 'Demo account not found' });
      return;
    }

    // If Admin or Staff and 2FA is not explicitly bypassed for automated testing, issue 2FA challenge!
    if ((user.role === 'admin' || user.role === 'staff') && !bypass2FA) {
      const challenge = create2FAChallenge(user, req);
      res.json({
        requires2FA: true,
        tempToken: challenge.tempToken,
        role: user.role,
        email: user.email,
        fullName: user.role === 'admin' ? 'Fleet Administrator' : 'Rental Operations Staff',
        securityCode: challenge.code,
        expiresInSeconds: challenge.expiresInSeconds,
        message: `Security Verification: Elevated [${user.role.toUpperCase()}] credentials require 2FA identity validation.`
      });
      return;
    }

    let customerId: number | undefined;
    let fullName: string | undefined;

    if (user.role === 'customer') {
      const cust = dbGet<{ id: number; full_name: string }>(
        'SELECT id, full_name FROM customers WHERE user_id = ?',
        [user.id]
      );
      if (cust) {
        customerId = cust.id;
        fullName = cust.full_name;
      }
    } else {
      fullName = user.role === 'admin' ? 'Fleet Administrator' : 'Rental Operations Staff';
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      customerId,
      fullName: fullName || user.email,
      twoFactorVerified: user.role !== 'customer'
    };

    const token = generateToken(authUser);
    res.json({ token, user: authUser });
  } catch (err: any) {
    res.status(500).json({ error: 'Demo login failed.' });
  }
});

// Current user profile
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = dbGet<{ id: number; email: string; role: string; created_at: string }>(
    'SELECT id, email, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  let customerDetails = null;
  if (req.user.role === 'customer' && req.user.customerId) {
    customerDetails = dbGet(
      'SELECT id, full_name, phone, driving_license, address FROM customers WHERE id = ?',
      [req.user.customerId]
    );
  }

  res.json({
    user: {
      ...user,
      customer: customerDetails
    }
  });
});

// Update Customer Profile
apiRouter.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { fullName, phone, drivingLicense, address } = req.body;
  if (req.user.role === 'customer' && req.user.customerId) {
    dbRun(
      `UPDATE customers SET full_name = ?, phone = ?, driving_license = ?, address = ?, updated_at = datetime('now') WHERE id = ?`,
      [fullName, phone, drivingLicense, address, req.user.customerId]
    );
    res.json({ message: 'Profile updated successfully' });
  } else {
    res.status(400).json({ error: 'Profile update only available for customers' });
  }
});

// ==========================================
// 2. VEHICLE MANAGEMENT & AI RECOMMENDATION
// ==========================================

// AI-Based Vehicle Recommendation Engine
apiRouter.post('/vehicles/recommend', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      durationDays,
      startDate,
      endDate,
      passengers,
      budget,
      currency,
      vehicleTypePreference,
      rentalPurpose,
      fuelPreference,
      transmissionPreference
    } = req.body;

    const customerId = req.user?.customerId;

    const result = await generateVehicleRecommendations(
      {
        durationDays: Number(durationDays) || 1,
        startDate,
        endDate,
        passengers: Number(passengers) || 1,
        budget: Number(budget) || 1000,
        currency: currency === 'USD' ? 'USD' : 'INR',
        vehicleTypePreference: vehicleTypePreference || 'Any',
        rentalPurpose: rentalPurpose || 'General vacation & road travel',
        fuelPreference,
        transmissionPreference
      },
      customerId
    );

    res.json(result);
  } catch (err: any) {
    console.error('Error generating AI vehicle recommendations:', err);
    res.status(500).json({
      error: 'Failed to generate vehicle recommendations. Please try again with adjusted parameters.'
    });
  }
});

// List vehicles with search, filters, and optional timeframe availability filter
apiRouter.get('/vehicles', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, type, fuel, transmission, status, minPrice, maxPrice, start, end } = req.query;

    let query = `SELECT * FROM vehicles WHERE 1=1`;
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(brand) LIKE ? OR LOWER(model) LIKE ? OR LOWER(registration_number) LIKE ?)`;
      params.push(term, term, term);
    }

    if (type && typeof type === 'string' && type !== 'all') {
      query += ` AND (LOWER(vehicle_type) = LOWER(?) OR LOWER(vehicle_type) LIKE LOWER(?))`;
      params.push(type, `%${type}%`);
    }

    if (fuel && typeof fuel === 'string' && fuel !== 'all') {
      query += ` AND fuel_type = ?`;
      params.push(fuel);
    }

    if (transmission && typeof transmission === 'string' && transmission !== 'all') {
      query += ` AND transmission = ?`;
      params.push(transmission);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (minPrice && !isNaN(Number(minPrice))) {
      query += ` AND price_per_day >= ?`;
      params.push(Number(minPrice));
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      query += ` AND price_per_day <= ?`;
      params.push(Number(maxPrice));
    }

    query += ` ORDER BY brand ASC, model ASC`;
    let vehicles = dbQuery(query, params);

    // If start and end dates are provided, evaluate conflict status for each vehicle
    if (start && end && typeof start === 'string' && typeof end === 'string') {
      vehicles = vehicles.map(veh => {
        // Vehicles under Maintenance or Inactive are never bookable
        if (veh.status === 'maintenance' || veh.status === 'inactive') {
          return { ...veh, is_available_for_dates: false, conflict_reason: `Vehicle is currently ${veh.status}` };
        }

        // Check backend overlapping rule:
        // existingStart < requestedEnd AND existingEnd > requestedStart
        const conflict = dbGet(
          `SELECT id, booking_code, start_datetime, end_datetime, status FROM bookings
           WHERE vehicle_id = ?
             AND status IN ('pending', 'confirmed', 'active')
             AND (start_datetime < ? AND end_datetime > ?)
           LIMIT 1`,
          [veh.id, end, start]
        );

        if (conflict) {
          return {
            ...veh,
            is_available_for_dates: false,
            conflict_reason: `Reserved for ${conflict.start_datetime.slice(0, 10)} - ${conflict.end_datetime.slice(0, 10)} (${conflict.status})`
          };
        }

        return { ...veh, is_available_for_dates: true, conflict_reason: null };
      });
    }

    res.json(vehicles);
  } catch (err: any) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ error: 'Failed to retrieve vehicles.' });
  }
});

// Single vehicle details + active bookings schedule
apiRouter.get('/vehicles/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    // Include upcoming/active bookings schedule
    const schedule = dbQuery(
      `SELECT id, booking_code, start_datetime, end_datetime, status
       FROM bookings
       WHERE vehicle_id = ? AND status IN ('pending', 'confirmed', 'active')
       ORDER BY start_datetime ASC`,
      [id]
    );

    res.json({ ...vehicle, upcoming_bookings: schedule });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load vehicle details.' });
  }
});

// Dedicated Availability Check Endpoint for a vehicle
apiRouter.get('/vehicles/:id/availability', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { start, end } = req.query;

    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      res.status(400).json({ error: 'Both start and end datetime parameters are required.' });
      return;
    }

    const vehicle = dbGet<{ id: number; status: string; brand: string; model: string }>(
      'SELECT id, status, brand, model FROM vehicles WHERE id = ?',
      [id]
    );

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (vehicle.status === 'maintenance' || vehicle.status === 'inactive') {
      res.json({
        available: false,
        reason: `The vehicle is currently set to '${vehicle.status}' and cannot be booked.`
      });
      return;
    }

    // Backend rule: existingStart < requestedEnd AND existingEnd > requestedStart
    const conflict = dbGet<{ id: number; booking_code: string; start_datetime: string; end_datetime: string; status: string }>(
      `SELECT id, booking_code, start_datetime, end_datetime, status FROM bookings
       WHERE vehicle_id = ?
         AND status IN ('pending', 'confirmed', 'active')
         AND (start_datetime < ? AND end_datetime > ?)
       LIMIT 1`,
      [id, end, start]
    );

    if (conflict) {
      res.json({
        available: false,
        reason: `Overlapping booking detected (${conflict.booking_code}: ${conflict.start_datetime} to ${conflict.end_datetime}, status: ${conflict.status}).`,
        conflictingBooking: conflict
      });
      return;
    }

    res.json({
      available: true,
      message: 'Vehicle is available for the specified timeframe.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Availability check failed.' });
  }
});

// Admin: Add new vehicle
apiRouter.post('/vehicles', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      registrationNumber,
      brand,
      model,
      vehicleType,
      year,
      fuelType,
      transmission,
      seatingCapacity,
      pricePerDay,
      imageUrl,
      description,
      status
    } = req.body;

    if (!registrationNumber || !brand || !model || !vehicleType || !pricePerDay) {
      res.status(400).json({ error: 'Missing required vehicle fields' });
      return;
    }

    // Check unique registration
    const existing = dbGet('SELECT id FROM vehicles WHERE registration_number = ?', [registrationNumber.trim().toUpperCase()]);
    if (existing) {
      res.status(400).json({ error: `Registration number ${registrationNumber} is already registered.` });
      return;
    }

    const defaultImg = imageUrl || 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80';

    const insertRes = dbRun(
      `INSERT INTO vehicles (
        registration_number, brand, model, vehicle_type, year,
        fuel_type, transmission, seating_capacity, price_per_day,
        image_url, description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        registrationNumber.trim().toUpperCase(),
        brand.trim(),
        model.trim(),
        vehicleType.trim(),
        Number(year) || 2024,
        fuelType || 'Petrol',
        transmission || 'Automatic',
        seatingCapacity !== undefined && !isNaN(Number(seatingCapacity)) ? Math.max(1, Number(seatingCapacity)) : 2,
        Number(pricePerDay),
        defaultImg,
        description || '',
        status || 'available'
      ]
    );

    const newVehicle = dbGet('SELECT * FROM vehicles WHERE registration_number = ?', [registrationNumber.trim().toUpperCase()]);
    res.status(201).json({ vehicle: newVehicle, message: 'Vehicle added successfully' });
  } catch (err: any) {
    console.error('Error creating vehicle:', err);
    res.status(500).json({ error: 'Failed to add vehicle.' });
  }
});

// Admin: Update vehicle
apiRouter.put('/vehicles/:id', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const existing = dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const {
      registrationNumber,
      brand,
      model,
      vehicleType,
      year,
      fuelType,
      transmission,
      seatingCapacity,
      pricePerDay,
      imageUrl,
      description,
      status
    } = req.body;

    // Check registration uniqueness if changed
    if (registrationNumber && registrationNumber.toUpperCase() !== existing.registration_number) {
      const duplicate = dbGet('SELECT id FROM vehicles WHERE registration_number = ? AND id != ?', [registrationNumber.toUpperCase(), id]);
      if (duplicate) {
        res.status(400).json({ error: `Registration number ${registrationNumber} is already in use.` });
        return;
      }
    }

    dbRun(
      `UPDATE vehicles SET
        registration_number = ?, brand = ?, model = ?, vehicle_type = ?, year = ?,
        fuel_type = ?, transmission = ?, seating_capacity = ?, price_per_day = ?,
        image_url = ?, description = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        (registrationNumber || existing.registration_number).toUpperCase(),
        brand || existing.brand,
        model || existing.model,
        vehicleType ? vehicleType.trim() : existing.vehicle_type,
        Number(year) || existing.year,
        fuelType || existing.fuel_type,
        transmission || existing.transmission,
        seatingCapacity !== undefined && !isNaN(Number(seatingCapacity)) ? Math.max(1, Number(seatingCapacity)) : existing.seating_capacity,
        Number(pricePerDay) || existing.price_per_day,
        imageUrl || existing.image_url,
        description !== undefined ? description : existing.description,
        status || existing.status,
        id
      ]
    );

    const updated = dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
    res.json({ vehicle: updated, message: 'Vehicle updated successfully' });
  } catch (err: any) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ error: 'Failed to update vehicle.' });
  }
});

// Admin: Delete or Deactivate vehicle
apiRouter.delete('/vehicles/:id', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const vehicle = dbGet('SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    // Check if there are existing bookings
    const bookingCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE vehicle_id = ?', [id]);
    
    if (bookingCount && bookingCount.count > 0) {
      // Soft-deactivate if vehicle has booking history to preserve relational integrity
      dbRun(`UPDATE vehicles SET status = 'inactive', updated_at = datetime('now') WHERE id = ?`, [id]);
      res.json({ message: 'Vehicle has booking history and was successfully deactivated (set to Inactive).' });
    } else {
      // Hard delete if clean
      dbRun('DELETE FROM vehicles WHERE id = ?', [id]);
      res.json({ message: 'Vehicle deleted successfully.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete vehicle.' });
  }
});

// ==========================================
// 3. BOOKING SYSTEM & AVAILABILITY ENGINE
// ==========================================

// List Bookings (Filtered by role: Customer sees own, Admin & Staff see all)
apiRouter.get('/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, vehicleId, customerId, search } = req.query;
    const user = req.user!;

    let sql = `
      SELECT 
        b.*,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        v.registration_number as vehicle_reg,
        v.vehicle_type,
        v.image_url as vehicle_image,
        c.full_name as customer_name,
        c.phone as customer_phone,
        c.driving_license as customer_license,
        u.email as customer_email
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based boundary
    if (user.role === 'customer') {
      if (!user.customerId) {
        res.json([]);
        return;
      }
      sql += ` AND b.customer_id = ?`;
      params.push(user.customerId);
    } else if (customerId && !isNaN(Number(customerId))) {
      // Admin/staff filtering by customer
      sql += ` AND b.customer_id = ?`;
      params.push(Number(customerId));
    }

    if (status && typeof status === 'string' && status !== 'all') {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    if (vehicleId && !isNaN(Number(vehicleId))) {
      sql += ` AND b.vehicle_id = ?`;
      params.push(Number(vehicleId));
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(b.booking_code) LIKE ? OR LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ? OR LOWER(c.full_name) LIKE ?)`;
      params.push(term, term, term, term);
    }

    sql += ` ORDER BY b.created_at DESC`;

    const bookings = dbQuery(sql, params);
    res.json(bookings);
  } catch (err: any) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// Single Booking Details
apiRouter.get('/bookings/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const user = req.user!;

    const booking = dbGet(
      `SELECT 
        b.*,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        v.registration_number as vehicle_reg,
        v.vehicle_type,
        v.fuel_type,
        v.transmission,
        v.image_url as vehicle_image,
        c.full_name as customer_name,
        c.phone as customer_phone,
        c.driving_license as customer_license,
        c.address as customer_address,
        u.email as customer_email
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN customers c ON b.customer_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE b.id = ?`,
      [id]
    );

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Role check: customer cannot view other customers' bookings
    if (user.role === 'customer' && booking.customer_id !== user.customerId) {
      res.status(403).json({ error: 'Unauthorized to view this booking' });
      return;
    }

    res.json(booking);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load booking details.' });
  }
});

// Create Booking with Strict Backend Availability Check
apiRouter.post('/bookings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { vehicleId, startDatetime, endDatetime, notes, customerId: reqCustomerId } = req.body;
    const user = req.user!;

    if (!vehicleId || !startDatetime || !endDatetime) {
      res.status(400).json({ error: 'Vehicle, start date/time, and end date/time are required.' });
      return;
    }

    // Determine target customerId
    let effectiveCustomerId: number;
    if (user.role === 'customer') {
      if (user.customerId) {
        effectiveCustomerId = user.customerId;
      } else {
        let cust = dbGet<{ id: number }>('SELECT id FROM customers WHERE user_id = ?', [user.id]);
        if (!cust) {
          dbRun(
            'INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.fullName || user.email.split('@')[0], '+1 (555) 019-2834', 'DL-PENDING', 'Customer Address']
          );
          cust = dbGet<{ id: number }>('SELECT id FROM customers WHERE user_id = ?', [user.id]);
        }
        effectiveCustomerId = cust ? cust.id : 1;
      }
    } else {
      // Staff or Admin creating booking
      if (reqCustomerId) {
        effectiveCustomerId = Number(reqCustomerId);
      } else {
        let staffCust = dbGet<{ id: number }>('SELECT id FROM customers WHERE user_id = ?', [user.id]);
        if (!staffCust) {
          dbRun(
            'INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.fullName || 'Fleet Operations User', '+1 (555) 999-0000', 'DL-FLEET-STAFF', 'Fleet Operations']
          );
          staffCust = dbGet<{ id: number }>('SELECT id FROM customers WHERE user_id = ?', [user.id]);
        }
        effectiveCustomerId = staffCust ? staffCust.id : 1;
      }
    }

    const startDate = new Date(startDatetime);
    const endDate = new Date(endDatetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ error: 'Invalid date/time format.' });
      return;
    }

    if (endDate <= startDate) {
      res.status(400).json({ error: 'End date/time must be strictly after the start date/time.' });
      return;
    }

    // Verify Vehicle existence and status
    const vehicle = dbGet<{ id: number; brand: string; model: string; price_per_day: number; status: string }>(
      'SELECT id, brand, model, price_per_day, status FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    if (!vehicle) {
      res.status(404).json({ error: 'Selected vehicle does not exist.' });
      return;
    }

    // Status check: maintenance or inactive vehicles must not be bookable
    if (vehicle.status === 'maintenance' || vehicle.status === 'inactive') {
      res.status(400).json({
        error: `Vehicle ${vehicle.brand} ${vehicle.model} is currently under '${vehicle.status}' and cannot be booked.`
      });
      return;
    }

    // =========================================================================
    // CRITICAL AVAILABILITY RULE:
    // Reject booking if:
    // existingStart < requestedEnd AND existingEnd > requestedStart
    // Cancelled bookings ('cancelled') and returned rentals ('returned') do not block.
    // Back-to-back rentals are allowed when existingEnd = requestedStart.
    // =========================================================================
    const conflict = dbGet<{ id: number; booking_code: string; start_datetime: string; end_datetime: string; status: string }>(
      `SELECT id, booking_code, start_datetime, end_datetime, status
       FROM bookings
       WHERE vehicle_id = ?
         AND status IN ('pending', 'confirmed', 'active')
         AND (start_datetime < ? AND end_datetime > ?)
       LIMIT 1`,
      [vehicleId, endDatetime, startDatetime]
    );

    if (conflict) {
      res.status(409).json({
        error: `Booking conflict: This vehicle is already reserved for the selected period (${conflict.start_datetime} to ${conflict.end_datetime}, booking #${conflict.booking_code}). Please choose a different timeframe.`,
        conflictingBooking: conflict
      });
      return;
    }

    // Calculate rental duration in days (minimum 1 day, half-day precision)
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const durationDays = Math.max(1, Math.round((diffHours / 24) * 10) / 10);
    const totalAmount = Math.round(durationDays * vehicle.price_per_day * 100) / 100;

    // Generate unique booking code: BK-YYYY-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `BK-${new Date().getFullYear()}-${randomSuffix}`;

    const insertRes = dbRun(
      `INSERT INTO bookings (
        booking_code, customer_id, vehicle_id, start_datetime, end_datetime,
        rental_duration_days, price_per_day, total_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        bookingCode,
        effectiveCustomerId,
        vehicleId,
        startDatetime,
        endDatetime,
        durationDays,
        vehicle.price_per_day,
        totalAmount,
        notes || null
      ]
    );

    // If vehicle was available, mark as 'booked' or keep current if pending
    dbRun(`UPDATE vehicles SET status = 'booked', updated_at = datetime('now') WHERE id = ? AND status = 'available'`, [vehicleId]);

    const createdBooking = dbGet('SELECT * FROM bookings WHERE booking_code = ?', [bookingCode]);
    res.status(201).json({
      booking: createdBooking,
      message: 'Booking request created successfully. Awaiting staff confirmation.'
    });
  } catch (err: any) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// Update Booking Status Workflow
// Status Flow: Pending -> Confirmed -> Active -> Returned (or Cancelled)
apiRouter.patch('/bookings/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status: newStatus, cancellationReason, notes } = req.body;
    const user = req.user!;

    const booking = dbGet<{
      id: number;
      booking_code: string;
      customer_id: number;
      vehicle_id: number;
      status: string;
    }>('SELECT id, booking_code, customer_id, vehicle_id, status FROM bookings WHERE id = ?', [id]);

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Role-based permissions
    if (user.role === 'customer') {
      // Customers can only cancel their own booking, and only if it's currently pending or confirmed
      if (booking.customer_id !== user.customerId) {
        res.status(403).json({ error: 'Unauthorized to modify this booking' });
        return;
      }

      if (newStatus !== 'cancelled') {
        res.status(403).json({ error: 'Customers can only cancel bookings.' });
        return;
      }

      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        res.status(400).json({ error: `Cannot cancel a booking that is already '${booking.status}'.` });
        return;
      }
    }

    // Staff and Admin status transition validations
    if (['confirmed', 'active', 'returned', 'cancelled'].indexOf(newStatus) === -1) {
      res.status(400).json({ error: 'Invalid status requested.' });
      return;
    }

    // Update booking
    dbRun(
      `UPDATE bookings SET
        status = ?,
        cancellation_reason = COALESCE(?, cancellation_reason),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
       WHERE id = ?`,
      [newStatus, cancellationReason || null, notes || null, id]
    );

    // Synchronize Vehicle Status based on rental lifecycle:
    if (newStatus === 'active') {
      // Rental started! Mark vehicle as active
      dbRun(`UPDATE vehicles SET status = 'active', updated_at = datetime('now') WHERE id = ?`, [booking.vehicle_id]);
    } else if (newStatus === 'returned') {
      // Rental finished and vehicle returned! Check if vehicle has other active/booked reservations
      const nextActive = dbGet(
        `SELECT id FROM bookings WHERE vehicle_id = ? AND status IN ('active') AND id != ?`,
        [booking.vehicle_id, id]
      );
      if (!nextActive) {
        dbRun(`UPDATE vehicles SET status = 'available', updated_at = datetime('now') WHERE id = ?`, [booking.vehicle_id]);
      }
    } else if (newStatus === 'cancelled') {
      // If cancelled, return vehicle to available if it doesn't have other active bookings
      const hasOther = dbGet(
        `SELECT id FROM bookings WHERE vehicle_id = ? AND status IN ('active', 'confirmed', 'pending') AND id != ?`,
        [booking.vehicle_id, id]
      );
      if (!hasOther) {
        dbRun(`UPDATE vehicles SET status = 'available', updated_at = datetime('now') WHERE id = ? AND status IN ('booked', 'active')`, [booking.vehicle_id]);
      }
    } else if (newStatus === 'confirmed') {
      dbRun(`UPDATE vehicles SET status = 'booked', updated_at = datetime('now') WHERE id = ? AND status = 'available'`, [booking.vehicle_id]);
    }

    const updatedBooking = dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    res.json({
      booking: updatedBooking,
      message: `Booking ${booking.booking_code} status updated to '${newStatus}'.`
    });
  } catch (err: any) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// ==========================================
// 4. CUSTOMER & USER MANAGEMENT (Staff / Admin)
// ==========================================

// List all customers
apiRouter.get('/customers', requireAuth, requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const customers = dbQuery(`
      SELECT 
        c.*,
        u.email,
        u.created_at as registered_at,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as active_bookings,
        SUM(CASE WHEN b.status = 'returned' THEN b.total_amount ELSE 0 END) as total_spent
      FROM customers c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN bookings b ON c.id = b.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// List all users (Admin only)
apiRouter.get('/users', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = dbQuery(`
      SELECT 
        u.id, u.email, u.role, u.created_at, u.updated_at,
        c.full_name, c.phone, c.driving_license
      FROM users u
      LEFT JOIN customers c ON u.id = c.user_id
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Admin: Create staff or admin user
apiRouter.post('/users', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      res.status(400).json({ error: 'Email, password, and role are required.' });
      return;
    }

    if (!['admin', 'staff', 'customer'].includes(role)) {
      res.status(400).json({ error: 'Role must be admin, staff, or customer.' });
      return;
    }

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = dbRun(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, role]
    );

    if (role === 'customer') {
      dbRun(
        `INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, '', '', '')`,
        [insertRes.lastInsertRowid, fullName || email.split('@')[0]]
      );
    }

    res.status(201).json({ message: `User created with role ${role}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Admin: Update user role
apiRouter.patch('/users/:id/role', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!['admin', 'staff', 'customer'].includes(role)) {
      res.status(400).json({ error: 'Invalid role.' });
      return;
    }

    // Prevent removing last admin
    if (role !== 'admin') {
      const adminCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
      const targetUser = dbGet<{ role: string }>('SELECT role FROM users WHERE id = ?', [id]);
      if (targetUser?.role === 'admin' && adminCount && adminCount.count <= 1) {
        res.status(400).json({ error: 'Cannot downgrade the only administrator.' });
        return;
      }
    }

    dbRun(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`, [role, id]);
    res.json({ message: `User role updated to ${role}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// ==========================================
// 5. DASHBOARD STATS & REPORTS
// ==========================================

apiRouter.get('/dashboard/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Vehicle counts
    const totalVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles')?.count || 0;
    const availableVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles WHERE status = "available"')?.count || 0;
    const activeVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles WHERE status = "active"')?.count || 0;
    const bookedVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles WHERE status = "booked"')?.count || 0;
    const maintenanceVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles WHERE status = "maintenance"')?.count || 0;
    const inactiveVehicles = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM vehicles WHERE status = "inactive"')?.count || 0;

    // 2. Customer counts
    const totalCustomers = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers')?.count || 0;

    // 3. Booking counts
    const totalBookings = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings')?.count || 0;
    const pendingBookings = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = "pending"')?.count || 0;
    const confirmedBookings = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"')?.count || 0;
    const activeRentals = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = "active"')?.count || 0;
    const completedRentals = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = "returned"')?.count || 0;
    const cancelledBookings = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM bookings WHERE status = "cancelled"')?.count || 0;

    // 4. Financial totals
    const totalRevenue = dbGet<{ total: number }>(
      'SELECT SUM(total_amount) as total FROM bookings WHERE status IN ("returned", "active")'
    )?.total || 0;

    // 5. Fleet Category Breakdown
    const categoryBreakdown = dbQuery(`
      SELECT vehicle_type, COUNT(*) as count
      FROM vehicles
      GROUP BY vehicle_type
    `);

    // 6. Recent Bookings
    const recentBookings = dbQuery(`
      SELECT 
        b.id, b.booking_code, b.start_datetime, b.end_datetime, b.total_amount, b.status, b.created_at,
        v.brand, v.model, v.registration_number,
        c.full_name as customer_name
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN customers c ON b.customer_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 8
    `);

    res.json({
      totalVehicles,
      availableVehicles,
      activeVehicles,
      bookedVehicles,
      maintenanceVehicles,
      inactiveVehicles,
      totalCustomers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      activeRentals,
      completedRentals,
      cancelledBookings,
      totalRevenue,
      categoryBreakdown,
      recentBookings
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to compile dashboard metrics.' });
  }
});

// Admin: Security Audit Logs Viewer (inspects 2FA, logins, IP, rate limits)
apiRouter.get('/admin/security-logs', requireAuth, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = getRecentSecurityLogs(100);
    res.json(logs);
  } catch (err: any) {
    console.error('Failed to retrieve security logs:', err);
    res.status(500).json({ error: 'Failed to load security audit logs.' });
  }
});

// Convenience reset demo data endpoint
apiRouter.post('/system/reset-demo', requireAuth, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    dbRun('DELETE FROM bookings');
    dbRun('DELETE FROM vehicles');
    dbRun('DELETE FROM customers');
    dbRun('DELETE FROM users');
    await seedInitialData();
    res.json({ message: 'Demo system database has been reset to pristine initial state.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset demo dataset.' });
  }
});
