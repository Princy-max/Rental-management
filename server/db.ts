import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'autofleet.sqlite');

let dbInstance: Database | null = null;

// Helper to save DB to disk
export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

// Database helper functions
export function dbRun(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);

  const resId = dbInstance.exec('SELECT last_insert_rowid() as id');
  const lastId = resId.length > 0 && resId[0].values.length > 0 ? Number(resId[0].values[0][0]) : 0;
  
  const resChanges = dbInstance.exec('SELECT changes() as cnt');
  const changes = resChanges.length > 0 && resChanges[0].values.length > 0 ? Number(resChanges[0].values[0][0]) : 0;

  saveDatabase();

  return { lastInsertRowid: lastId, changes };
}

export function dbQuery<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function dbGet<T = any>(sql: string, params: any[] = []): T | null {
  const rows = dbQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Failed to load existing database file, creating fresh DB:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Create Relational Schema: users, customers, vehicles, bookings
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'customer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      driving_license TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_number TEXT UNIQUE NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      year INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      transmission TEXT NOT NULL,
      seating_capacity INTEGER NOT NULL,
      price_per_day REAL NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'booked', 'active', 'returned', 'maintenance', 'inactive')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      rental_duration_days REAL NOT NULL,
      price_per_day REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'active', 'returned', 'cancelled')),
      notes TEXT,
      cancellation_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_dates ON bookings(vehicle_id, start_datetime, end_datetime, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS security_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      temp_token TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sec_verif_token ON security_verifications(temp_token);
    CREATE INDEX IF NOT EXISTS idx_sec_logs_created ON security_audit_logs(created_at DESC);
  `);

  // Check if seed data is needed
  const userCountRes = dbInstance.exec('SELECT COUNT(*) as count FROM users');
  const count = Number(userCountRes[0]?.values[0]?.[0] || 0);

  if (count === 0) {
    await seedInitialData();
  } else {
    ensureBudgetFriendlyVehicles();
  }

  saveDatabase();
  return dbInstance;
}

export function ensureBudgetFriendlyVehicles(): void {
  try {
    const existingBudget = dbGet('SELECT id FROM vehicles WHERE registration_number = ?', ['AF-IN20']);
    if (!existingBudget) {
      dbRun(
        `INSERT INTO vehicles (registration_number, brand, model, vehicle_type, year, fuel_type, transmission, seating_capacity, price_per_day, image_url, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'AF-IN20',
          'Hyundai',
          'i20 Asta Turbo',
          'Hatchback',
          2024,
          'Petrol',
          'Manual',
          5,
          20.0,
          'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
          'Ultra-economical 5-passenger city & highway hatchback with class-leading mileage, responsive handling, and Apple CarPlay / Android Auto.',
          'available'
        ]
      );
    }

    const existingSedan = dbGet('SELECT id FROM vehicles WHERE registration_number = ?', ['AF-IN35']);
    if (!existingSedan) {
      dbRun(
        `INSERT INTO vehicles (registration_number, brand, model, vehicle_type, year, fuel_type, transmission, seating_capacity, price_per_day, image_url, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'AF-IN35',
          'Honda',
          'City ZX i-VTEC',
          'Sedan',
          2024,
          'Petrol',
          'Automatic',
          5,
          35.0,
          'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=80',
          'Comfortable executive mid-size sedan with spacious rear legroom, 506L boot space, and smooth CVT automatic for family trips.',
          'available'
        ]
      );
    }
  } catch (e) {
    console.warn('Could not check budget friendly vehicles:', e);
  }
}

export async function seedInitialData(): Promise<void> {
  if (!dbInstance) return;
  console.log('Seeding initial relational dataset...');

  // Passwords
  const adminPass = await bcrypt.hash('admin123', 10);
  const staffPass = await bcrypt.hash('staff123', 10);
  const custPass = await bcrypt.hash('customer123', 10);

  // 1. Users
  dbRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
    'admin@autofleet.com',
    adminPass,
    'admin'
  ]);
  const adminUserId = 1;

  dbRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
    'staff@autofleet.com',
    staffPass,
    'staff'
  ]);
  const staffUserId = 2;

  dbRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
    'john.doe@example.com',
    custPass,
    'customer'
  ]);
  const cust1UserId = 3;

  dbRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
    'sarah.jenkins@example.com',
    custPass,
    'customer'
  ]);
  const cust2UserId = 4;

  dbRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
    'marcus.chen@example.com',
    custPass,
    'customer'
  ]);
  const cust3UserId = 5;

  // 2. Customers
  dbRun(
    `INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)`,
    [cust1UserId, 'John Doe', '+1 (555) 234-5678', 'DL-CA-8921445', '742 Evergreen Terrace, Springfield, OR']
  );
  dbRun(
    `INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)`,
    [cust2UserId, 'Sarah Jenkins', '+1 (555) 876-5432', 'DL-NY-4109823', '350 5th Avenue, New York, NY']
  );
  dbRun(
    `INSERT INTO customers (user_id, full_name, phone, driving_license, address) VALUES (?, ?, ?, ?, ?)`,
    [cust3UserId, 'Marcus Chen', '+1 (555) 432-1098', 'DL-WA-7732910', '1201 3rd Ave, Seattle, WA']
  );

  // 3. Vehicles
  const sampleVehicles = [
    {
      reg: 'AF-7492',
      brand: 'Tesla',
      model: 'Model 3 Long Range',
      type: 'Electric',
      year: 2024,
      fuel: 'Electric',
      trans: 'Automatic',
      seats: 5,
      price: 95.0,
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop&q=80',
      desc: 'Sleek all-electric sedan featuring 333 miles of range, instant dual-motor torque, and full glass panoramic roof.',
      status: 'available'
    },
    {
      reg: 'AF-3180',
      brand: 'BMW',
      model: 'X5 xDrive40i',
      type: 'SUV',
      year: 2023,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 5,
      price: 145.0,
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
      desc: 'Executive sports activity vehicle with adaptive air suspension, Harman Kardon audio, and commanding road presence.',
      status: 'booked'
    },
    {
      reg: 'AF-9921',
      brand: 'Mercedes-Benz',
      model: 'C300 4MATIC',
      type: 'Luxury',
      year: 2024,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 5,
      price: 130.0,
      image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&auto=format&fit=crop&q=80',
      desc: 'Refined German luxury sedan with Burmester surround sound, ambient lighting, and intelligent drive assists.',
      status: 'active'
    },
    {
      reg: 'AF-5012',
      brand: 'Porsche',
      model: 'Taycan 4S',
      type: 'Luxury',
      year: 2024,
      fuel: 'Electric',
      trans: 'Automatic',
      seats: 4,
      price: 240.0,
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
      desc: 'High-performance electric sports car delivering 522 hp, launch control, and blistering precision handling.',
      status: 'available'
    },
    {
      reg: 'AF-1845',
      brand: 'Toyota',
      model: 'RAV4 Hybrid AWD',
      type: 'SUV',
      year: 2023,
      fuel: 'Hybrid',
      trans: 'Automatic',
      seats: 5,
      price: 75.0,
      image: 'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=800&auto=format&fit=crop&q=80',
      desc: 'Economical and dependable hybrid crossover with generous cargo space, roof racks, and 40 MPG efficiency.',
      status: 'available'
    },
    {
      reg: 'AF-8820',
      brand: 'Ford',
      model: 'Mustang GT Premium',
      type: 'Luxury',
      year: 2023,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 4,
      price: 155.0,
      image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800&auto=format&fit=crop&q=80',
      desc: 'Iconic 5.0L V8 muscle coupe with active quad exhaust, Brembo brakes, and customizable digital instrument cluster.',
      status: 'maintenance'
    },
    {
      reg: 'AF-6240',
      brand: 'Audi',
      model: 'A6 55 TFSI Quattro',
      type: 'Sedan',
      year: 2023,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 5,
      price: 125.0,
      image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&auto=format&fit=crop&q=80',
      desc: 'Business-class luxury sedan with dual MMI touchscreens, Matrix LED headlights, and Quattro all-wheel grip.',
      status: 'available'
    },
    {
      reg: 'AF-2094',
      brand: 'Volkswagen',
      model: 'Golf GTI Clubsport',
      type: 'Hatchback',
      year: 2023,
      fuel: 'Petrol',
      trans: 'Manual',
      seats: 5,
      price: 70.0,
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
      desc: 'Agile enthusiast hot hatch with 6-speed manual transmission, sport bucket seats, and DCC adaptive dampers.',
      status: 'available'
    },
    {
      reg: 'AF-4411',
      brand: 'Mercedes-Benz',
      model: 'Sprinter Passenger 2500',
      type: 'Van',
      year: 2023,
      fuel: 'Diesel',
      trans: 'Automatic',
      seats: 12,
      price: 190.0,
      image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=80',
      desc: 'Spacious passenger transporter featuring high roof ceiling, individual reclining seats, and massive luggage capacity.',
      status: 'available'
    },
    {
      reg: 'AF-9103',
      brand: 'Hyundai',
      model: 'Ioniq 5 Limited AWD',
      type: 'Electric',
      year: 2024,
      fuel: 'Electric',
      trans: 'Automatic',
      seats: 5,
      price: 88.0,
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
      desc: 'Ultra-fast 800V charging futuristic crossover with relaxation comfort seats and heads-up augmented reality display.',
      status: 'inactive'
    },
    {
      reg: 'AF-M501',
      brand: 'Ducati',
      model: 'Monster Plus 937',
      type: 'Motorcycle',
      year: 2024,
      fuel: 'Petrol',
      trans: 'Manual',
      seats: 2,
      price: 85.0,
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
      desc: 'Iconic Italian naked sport motorcycle with 937cc Testastretta engine, Brembo M4.32 brakes, and quick-shifter.',
      status: 'available'
    },
    {
      reg: 'AF-M880',
      brand: 'Harley-Davidson',
      model: 'Street Glide Special',
      type: 'Motorcycle',
      year: 2023,
      fuel: 'Petrol',
      trans: 'Manual',
      seats: 2,
      price: 120.0,
      image: 'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=800&auto=format&fit=crop&q=80',
      desc: 'Classic American touring motorcycle with Milwaukee-Eight 114 V-Twin engine, Boom! Box GTS infotainment, and stretched saddlebags.',
      status: 'available'
    },
    {
      reg: 'AF-SC12',
      brand: 'Vespa',
      model: 'Primavera 150 Tech',
      type: 'Scooter',
      year: 2024,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 2,
      price: 45.0,
      image: 'https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=800&auto=format&fit=crop&q=80',
      desc: 'Charming Italian city scooter featuring full-color TFT display, ABS braking, and lightweight agile maneuvering.',
      status: 'available'
    },
    {
      reg: 'AF-TR15',
      brand: 'Ford',
      model: 'F-150 Lightning Lariat',
      type: 'Truck',
      year: 2024,
      fuel: 'Electric',
      trans: 'Automatic',
      seats: 5,
      price: 140.0,
      image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&auto=format&fit=crop&q=80',
      desc: 'All-electric full-size pickup with 580 hp, Mega Power Frunk, 10,000 lbs towing capacity, and Pro Power Onboard generator.',
      status: 'available'
    },
    {
      reg: 'AF-TR88',
      brand: 'Chevrolet',
      model: 'Silverado 2500HD High Country',
      type: 'Truck',
      year: 2023,
      fuel: 'Diesel',
      trans: 'Automatic',
      seats: 5,
      price: 155.0,
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
      desc: 'Heavy-duty commercial hauler with Duramax 6.6L Turbo-Diesel V8, Allison 10-speed transmission, and advanced trailering cameras.',
      status: 'available'
    },
    {
      reg: 'AF-RV04',
      brand: 'Winnebago',
      model: 'Solis Pocket 36A Campervan',
      type: 'Campervan / RV',
      year: 2024,
      fuel: 'Petrol',
      trans: 'Automatic',
      seats: 4,
      price: 195.0,
      image: 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800&auto=format&fit=crop&q=80',
      desc: 'Adventure-ready campervan with pop-top sleeping loft, kitchenette, fold-down sofa bed, and solar power array.',
      status: 'available'
    },
    {
      reg: 'AF-EB99',
      brand: 'Specialized',
      model: 'Turbo Vado 4.0 E-Bike',
      type: 'Bicycle',
      year: 2024,
      fuel: 'Electric',
      trans: 'Pedal / Gear Shifter',
      seats: 1,
      price: 28.0,
      image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&auto=format&fit=crop&q=80',
      desc: 'Premium urban electric bicycle with 28 mph pedal-assist motor, integrated LED lighting, and removable 710Wh long-range battery.',
      status: 'available'
    },
    {
      reg: 'AF-CG70',
      brand: 'Ford',
      model: 'Transit Cargo 350 High Roof',
      type: 'Commercial',
      year: 2023,
      fuel: 'Diesel',
      trans: 'Automatic',
      seats: 2,
      price: 115.0,
      image: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&auto=format&fit=crop&q=80',
      desc: 'High-capacity commercial cargo van with standing walk-through clearance, heavy-duty cargo tie-downs, and rear backup cam.',
      status: 'available'
    }
  ];

  for (const v of sampleVehicles) {
    dbRun(
      `INSERT INTO vehicles (registration_number, brand, model, vehicle_type, year, fuel_type, transmission, seating_capacity, price_per_day, image_url, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.reg, v.brand, v.model, v.type, v.year, v.fuel, v.trans, v.seats, v.price, v.image, v.desc, v.status]
    );
  }

  // 4. Sample Bookings (covering pending, confirmed, active, returned, cancelled)
  const bookingsData = [
    {
      code: 'BK-2026-901',
      cust_id: 1, // John Doe
      veh_id: 2, // BMW X5
      start: '2026-09-24T10:00',
      end: '2026-09-27T10:00',
      days: 3,
      price: 145.0,
      total: 435.0,
      status: 'confirmed',
      notes: 'Customer requested child safety seat in second row.'
    },
    {
      code: 'BK-2026-894',
      cust_id: 2, // Sarah Jenkins
      veh_id: 3, // Mercedes C300
      start: '2026-09-21T09:00',
      end: '2026-09-25T18:00',
      days: 4.5,
      price: 130.0,
      total: 585.0,
      status: 'active',
      notes: 'Active rental dispatched from Central Branch. Mileage recorded.'
    },
    {
      code: 'BK-2026-912',
      cust_id: 3, // Marcus Chen
      veh_id: 1, // Tesla Model 3
      start: '2026-09-28T14:00',
      end: '2026-09-30T14:00',
      days: 2,
      price: 95.0,
      total: 190.0,
      status: 'pending',
      notes: 'Airport pick-up requested.'
    },
    {
      code: 'BK-2026-780',
      cust_id: 1, // John Doe
      veh_id: 5, // Toyota RAV4
      start: '2026-09-10T08:00',
      end: '2026-09-14T18:00',
      days: 4.5,
      price: 75.0,
      total: 337.5,
      status: 'returned',
      notes: 'Returned in pristine condition, full fuel tank verified.'
    },
    {
      code: 'BK-2026-745',
      cust_id: 2, // Sarah Jenkins
      veh_id: 7, // Audi A6
      start: '2026-09-02T10:00',
      end: '2026-09-05T10:00',
      days: 3,
      price: 125.0,
      total: 375.0,
      status: 'returned',
      notes: 'Completed without incidents.'
    },
    {
      code: 'BK-2026-815',
      cust_id: 3, // Marcus Chen
      veh_id: 4, // Porsche Taycan
      start: '2026-09-15T12:00',
      end: '2026-09-18T12:00',
      days: 3,
      price: 240.0,
      total: 720.0,
      status: 'cancelled',
      notes: 'Customer requested cancellation due to flight reschedule.',
      reason: 'Travel plans postponed by customer.'
    }
  ];

  for (const b of bookingsData) {
    dbRun(
      `INSERT INTO bookings (booking_code, customer_id, vehicle_id, start_datetime, end_datetime, rental_duration_days, price_per_day, total_amount, status, notes, cancellation_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.code, b.cust_id, b.veh_id, b.start, b.end, b.days, b.price, b.total, b.status, b.notes || null, b.reason || null]
    );
  }

  console.log('Seed data successfully inserted!');
}
