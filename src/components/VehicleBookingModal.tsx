import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from './StatusBadge';
import {
  X,
  Calendar,
  Clock,
  Fuel,
  Gauge,
  Users,
  AlertCircle,
  CheckCircle2,
  Car,
  DollarSign,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Receipt
} from 'lucide-react';

interface VehicleBookingModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: () => void;
  onOpenAuth: () => void;
  initialDurationDays?: number;
}

export function VehicleBookingModal({
  vehicle,
  isOpen,
  onClose,
  onBookingSuccess,
  onOpenAuth,
  initialDurationDays
}: VehicleBookingModalProps) {
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();

  // Helper to format ISO datetime-local
  const getDefaultDates = (daysCount = initialDurationDays || 3) => {
    const now = new Date();
    // Default tomorrow 10:00
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    start.setHours(10, 0, 0, 0);
    // Default days later 10:00
    const end = new Date(start.getTime() + daysCount * 24 * 60 * 60 * 1000);
    end.setHours(10, 0, 0, 0);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    return {
      start: toLocalISO(start),
      end: toLocalISO(end)
    };
  };

  const [startDatetime, setStartDatetime] = useState<string>(getDefaultDates().start);
  const [endDatetime, setEndDatetime] = useState<string>(getDefaultDates().end);
  const [notes, setNotes] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    reason?: string;
  } | null>(null);
  const [showSurchargesGuide, setShowSurchargesGuide] = useState<boolean>(false);
  const [showItemizedBreakdown, setShowItemizedBreakdown] = useState<boolean>(true);

  // Reset dates when vehicle changes
  useEffect(() => {
    if (isOpen && vehicle) {
      const dates = getDefaultDates(initialDurationDays || 3);
      setStartDatetime(dates.start);
      setEndDatetime(dates.end);
      setNotes('');
      setAvailabilityResult(null);
    }
  }, [isOpen, vehicle, initialDurationDays]);

  // Check availability with backend
  useEffect(() => {
    if (!vehicle || !startDatetime || !endDatetime) return;

    const checkAvailability = async () => {
      if (new Date(endDatetime) <= new Date(startDatetime)) {
        setAvailabilityResult({
          available: false,
          reason: 'End date/time must be strictly after start date/time.'
        });
        return;
      }

      setIsChecking(true);
      try {
        const res = await fetch(
          `/api/vehicles/${vehicle.id}/availability?start=${encodeURIComponent(
            startDatetime
          )}&end=${encodeURIComponent(endDatetime)}`
        );
        const data = await res.json();
        setAvailabilityResult(data);
      } catch (err) {
        console.error('Error verifying vehicle availability:', err);
      } finally {
        setIsChecking(false);
      }
    };

    const timer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timer);
  }, [vehicle, startDatetime, endDatetime]);

  if (!isOpen || !vehicle) return null;

  // Calculate duration & price
  const startDate = new Date(startDatetime);
  const endDate = new Date(endDatetime);
  let durationDays = 0;
  let totalAmount = 0;

  if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    durationDays = Math.max(1, Math.round((diffHours / 24) * 10) / 10);
    totalAmount = Math.round(durationDays * vehicle.price_per_day * 100) / 100;
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('info', 'Please sign in or register to complete your reservation.', 'Sign In Required');
      onOpenAuth();
      return;
    }

    if (availabilityResult && !availabilityResult.available) {
      showToast('error', availabilityResult.reason || 'Vehicle is not available for the chosen timeframe.', 'Booking Conflict');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          vehicleId: vehicle.id,
          startDatetime,
          endDatetime,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to create booking', 'Booking Error');
        return;
      }

      showToast('success', `Booking #${data.booking.booking_code} created! Our rental staff will review and confirm it shortly.`, 'Booking Requested');
      onBookingSuccess();
      onClose();
    } catch (err) {
      showToast('error', 'Network error while creating booking', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBlocked = vehicle.status === 'maintenance' || vehicle.status === 'inactive';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {vehicle.brand} {vehicle.model}
              </h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                {vehicle.registration_number}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehicle.year} · {vehicle.vehicle_type} · ${vehicle.price_per_day.toFixed(2)}/day
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Vehicle Showcase Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-200 relative">
              <img
                src={vehicle.image_url}
                alt={`${vehicle.brand} ${vehicle.model}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute top-2 left-2">
                <StatusBadge status={vehicle.status} />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                  <Fuel className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fuel: <strong className="text-slate-900">{vehicle.fuel_type}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  <span>Trans: <strong className="text-slate-900">{vehicle.transmission}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Seats: <strong className="text-slate-900">{vehicle.seating_capacity}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rate: <strong className="text-slate-900 tabular-nums">${vehicle.price_per_day}</strong>/day</span>
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed pt-1">{vehicle.description}</p>
            </div>
          </div>

          {/* Maintenance / Inactive Warning */}
          {isBlocked && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Vehicle Currently Unavailable:</strong> This vehicle is flagged as{' '}
                <span className="font-semibold uppercase">{vehicle.status}</span> and cannot be booked until restored
                by an administrator.
              </div>
            </div>
          )}

          {/* Booking & Availability Form */}
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Rental Dates & Check Availability
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Rental Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  disabled={isBlocked}
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Rental Return Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  disabled={isBlocked}
                  value={endDatetime}
                  onChange={(e) => setEndDatetime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Live Availability Status Callout */}
            {!isBlocked && (
              <div className="text-xs rounded-lg p-3 border transition-colors">
                {isChecking ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying backend availability & schedule conflicts...</span>
                  </div>
                ) : availabilityResult ? (
                  availabilityResult.available ? (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 p-2 rounded">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Available:</strong> No booking overlap detected for these dates. Back-to-back rental rules verified.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-rose-700 bg-rose-50/70 p-2 rounded">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Not Available:</strong> {availabilityResult.reason || 'This vehicle is reserved during the chosen timeframe.'}
                      </span>
                    </div>
                  )
                ) : null}
              </div>
            )}

            {/* Notes / Special Requests */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Special Requests or Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                disabled={isBlocked}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Airport pick-up, booster seat, GPS preference..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Pricing & Surcharges Breakdown Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  Rate Calculation & Surcharges
                </span>
                <button
                  type="button"
                  onClick={() => setShowSurchargesGuide(true)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 underline underline-offset-2"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>What surcharges are involved?</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Daily Rental Rate:</span>
                  <span className="font-mono tabular-nums font-medium">${vehicle.price_per_day.toFixed(2)} / day</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Rental Duration:</span>
                  <span className="font-mono tabular-nums font-medium">{durationDays} day(s)</span>
                </div>

                {/* Surcharges Itemized */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>• Vehicle Licensing & Road Recovery Fee ($3.50/day):</span>
                    </span>
                    <span className="text-emerald-700 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>• State & Municipal Rental Tax (8%):</span>
                    </span>
                    <span className="text-emerald-700 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>• Collision Damage Waiver (CDW):</span>
                    </span>
                    <span className="text-emerald-700 font-semibold">Included ($0 Deductible)</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <span>• Refundable Security Deposit:</span>
                    </span>
                    <span className="font-mono text-slate-700">$200.00 (Hold only)</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline text-sm font-bold text-slate-900">
                  <span>Total Estimated Rental Charge:</span>
                  <span className="text-blue-600 text-base font-mono tabular-nums">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isBlocked ||
                  isSubmitting ||
                  isChecking ||
                  (availabilityResult !== null && !availabilityResult.available)
                }
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors shadow-xs"
              >
                {isSubmitting ? 'Confirming Reservation...' : user ? 'Create Booking Request' : 'Sign In to Book'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

      {/* Educational Modal: What Surcharges are Involved in Calculating Rates? */}
      {showSurchargesGuide && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Vehicle Rental Rate & Surcharges Explained
                </h3>
              </div>
              <button
                onClick={() => setShowSurchargesGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              <p className="text-slate-700 font-medium">
                Rental rates in our vehicle management system are calculated with 100% price transparency. Here is the full breakdown of all mandatory components, statutory surcharges, and optional fees:
              </p>

              <div className="space-y-3">
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Base Daily Rental Rate</span>
                  </div>
                  <p className="text-slate-600 pl-6.5 text-[11px]">
                    The core rate per 24-hour cycle corresponding to the vehicle class (Sedan, SUV, Luxury, Electric, or Van). Multiplied by the verified duration days.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Vehicle Licensing & Road Safety Recovery Fee ($3.50/day)</span>
                  </div>
                  <p className="text-slate-600 pl-6.5 text-[11px]">
                    A statutory surcharge covering government motor vehicle registration, annual fleet roadworthiness inspections, safety telemetry certifications, and highway infrastructure contributions.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>State & Municipal Rental Tax (8%)</span>
                  </div>
                  <p className="text-slate-600 pl-6.5 text-[11px]">
                    Mandatory state sales tax and municipal public transit / mobility surcharges applicable to short-term commercial motor vehicle leases.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Collision Damage Waiver (CDW) & Third-Party Liability</span>
                  </div>
                  <p className="text-slate-600 pl-6.5 text-[11px]">
                    Comprehensive protection covering accidental damage, vandalism, fire, and collision liability with <strong>$0 customer deductible</strong> during authorized use.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">5</span>
                    <span>Refundable Security Deposit ($200.00 Pre-Authorization Hold)</span>
                  </div>
                  <p className="text-slate-600 pl-6.5 text-[11px]">
                    A temporary hold placed on the payment card during dispatch. It is <strong>never charged</strong> and is released back immediately upon vehicle check-in and damage inspection.
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Avoidable Conditional Surcharges (Zero When Returned in Order)</span>
                  </div>
                  <ul className="text-amber-800 list-disc pl-5 space-y-1 text-[11px]">
                    <li><strong>Refueling / Recharging Charge:</strong> Incurred only if returned below pickup fuel/battery level ($15 flat service fee + market fuel rate).</li>
                    <li><strong>Late Return Overstay:</strong> 59-minute grace period included; overdue beyond grace incurs prorated hourly extension fees.</li>
                    <li><strong>Cleaning Fee:</strong> Incurred only in cases of excessive dirt, pet hair, or smoking inside cabin ($150 detailing fee).</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowSurchargesGuide(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              >
                Got It, Return to Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
