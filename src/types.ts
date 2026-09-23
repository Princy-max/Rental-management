export type UserRole = 'admin' | 'staff' | 'customer';

export type VehicleStatus = 'available' | 'booked' | 'active' | 'returned' | 'maintenance' | 'inactive';

export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'returned' | 'cancelled';

export type VehicleType =
  | 'Sedan'
  | 'SUV'
  | 'Truck'
  | 'Motorcycle'
  | 'Scooter'
  | 'Bicycle'
  | 'Van'
  | 'Bus'
  | 'Campervan / RV'
  | 'Commercial'
  | 'Luxury'
  | 'Electric'
  | 'Hatchback'
  | string;

export type FuelType =
  | 'Petrol'
  | 'Diesel'
  | 'Electric'
  | 'Hybrid'
  | 'Plug-in Hybrid'
  | 'Hydrogen'
  | 'Pedal / Human Powered'
  | string;

export type TransmissionType =
  | 'Automatic'
  | 'Manual'
  | 'CVT'
  | 'Direct Drive'
  | 'Pedal / Gear Shifter'
  | string;

export interface User {
  id: number;
  email: string;
  role: UserRole;
  fullName?: string;
  customerId?: number;
  created_at?: string;
  customer?: Customer;
  twoFactorVerified?: boolean;
}

export interface SecurityAuditLog {
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

export interface TwoFactorChallenge {
  requires2FA: boolean;
  tempToken: string;
  role: UserRole;
  email: string;
  fullName?: string;
  securityCode?: string;
  expiresInSeconds?: number;
  message?: string;
}

export interface Customer {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  driving_license: string;
  address: string;
  created_at?: string;
  total_bookings?: number;
  active_bookings?: number;
  total_spent?: number;
  email?: string;
}

export interface Vehicle {
  id: number;
  registration_number: string;
  brand: string;
  model: string;
  vehicle_type: VehicleType;
  year: number;
  fuel_type: FuelType;
  transmission: TransmissionType;
  seating_capacity: number;
  price_per_day: number;
  image_url: string;
  description: string;
  status: VehicleStatus;
  created_at?: string;
  updated_at?: string;
  // Computed availability properties from backend
  is_available_for_dates?: boolean;
  conflict_reason?: string | null;
  upcoming_bookings?: Array<{
    id: number;
    booking_code: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
  }>;
}

export interface Booking {
  id: number;
  booking_code: string;
  customer_id: number;
  vehicle_id: number;
  start_datetime: string;
  end_datetime: string;
  rental_duration_days: number;
  price_per_day: number;
  total_amount: number;
  status: BookingStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;

  // Joined fields
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_reg?: string;
  vehicle_type?: string;
  vehicle_image?: string;
  vehicle_fuel?: string;
  vehicle_transmission?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_license?: string;
  customer_email?: string;
  customer_address?: string;
}

export interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  activeVehicles: number;
  bookedVehicles: number;
  maintenanceVehicles: number;
  inactiveVehicles: number;
  totalCustomers: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  activeRentals: number;
  completedRentals: number;
  cancelledBookings: number;
  totalRevenue: number;
  categoryBreakdown: Array<{ vehicle_type: string; count: number }>;
  recentBookings: Array<{
    id: number;
    booking_code: string;
    start_datetime: string;
    end_datetime: string;
    total_amount: number;
    status: BookingStatus;
    created_at: string;
    brand: string;
    model: string;
    registration_number: string;
    customer_name: string;
  }>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

export interface AIRecommendationRequest {
  durationDays: number;
  startDate?: string;
  endDate?: string;
  passengers: number;
  budget: number;
  currency: 'INR' | 'USD';
  vehicleTypePreference?: string;
  rentalPurpose: string;
  fuelPreference?: string;
  transmissionPreference?: string;
}

export interface RecommendedVehicleItem {
  vehicleId: number;
  vehicle: Vehicle;
  matchScore: number;
  badge: string;
  fitReason: string;
  prosForTrip: string[];
  budgetAnalysis: string;
  totalCostInSelectedCurrency: number;
  totalCostInUSD: number;
}

export interface AIRecommendationResponse {
  executiveSummary: string;
  queryCriteria: {
    passengers: number;
    durationDays: number;
    budget: number;
    currency: 'INR' | 'USD';
    rentalPurpose: string;
    vehicleTypePreference: string;
    customerHistoryConsidered: boolean;
    previousBookingsCount?: number;
  };
  recommendations: RecommendedVehicleItem[];
  alternativeSuggestions?: string;
}

