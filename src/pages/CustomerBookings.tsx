import React, { useState, useEffect } from 'react';
import { Booking, BookingStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Calendar,
  Clock,
  Car,
  XCircle,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Receipt
} from 'lucide-react';

interface CustomerBookingsProps {
  onNavigateVehicles: () => void;
}

export function CustomerBookings({ onNavigateVehicles }: CustomerBookingsProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Receipt modal state
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelClick = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);
    try {
      const res = await authFetch(`/api/bookings/${bookingToCancel.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: cancellationReason || 'Cancelled by customer'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to cancel booking', 'Cancellation Error');
        return;
      }

      showToast('success', `Booking #${bookingToCancel.booking_code} has been cancelled.`, 'Booking Cancelled');
      setCancelModalOpen(false);
      fetchBookings();
    } catch (err) {
      showToast('error', 'Network error during cancellation', 'Error');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'all') return true;
    return b.status === filterStatus;
  });

  const statuses: (BookingStatus | 'all')[] = ['all', 'pending', 'confirmed', 'active', 'returned', 'cancelled'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Rental Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track current reservations, upcoming trips, and rental history.
          </p>
        </div>

        <button
          onClick={onNavigateVehicles}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          Book Another Vehicle
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs max-w-fit">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 font-medium rounded-md capitalize transition-colors ${
              filterStatus === st
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {st === 'all' ? 'All Bookings' : st}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No bookings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {filterStatus === 'all'
              ? 'You have not reserved any vehicles yet. Explore our fleet catalog to make your first rental.'
              : `No bookings found with status '${filterStatus}'.`}
          </p>
          <button
            onClick={onNavigateVehicles}
            className="mt-4 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Browse Available Vehicles
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const canCancel = b.status === 'pending' || b.status === 'confirmed';

            return (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all p-5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Vehicle and Booking Metadata */}
                  <div className="flex items-start gap-4">
                    {b.vehicle_image && (
                      <div className="w-24 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 hidden sm:block">
                        <img
                          src={b.vehicle_image}
                          alt={`${b.vehicle_brand} ${b.vehicle_model}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {b.booking_code}
                        </span>
                        <StatusBadge status={b.status} />
                        <span className="text-xs text-slate-400 font-mono">
                          Booked on {new Date(b.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 pt-0.5">
                        {b.vehicle_brand} {b.vehicle_model}
                        <span className="ml-2 text-xs font-mono text-slate-500 font-normal">
                          ({b.vehicle_reg})
                        </span>
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Start: <strong>{b.start_datetime.replace('T', ' ')}</strong></span>
                        </div>
                        <span className="text-slate-300">→</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Return: <strong>{b.end_datetime.replace('T', ' ')}</strong></span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <span>{b.rental_duration_days} Day(s)</span>
                      </div>

                      {b.cancellation_reason && (
                        <p className="text-xs text-rose-600 italic pt-1">
                          Cancellation note: {b.cancellation_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Cost & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Total Rental Fee</span>
                      <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                        ${b.total_amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReceiptBooking(b)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      {canCancel && (
                        <button
                          onClick={() => handleCancelClick(b)}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel Booking Request"
        message={`Are you sure you want to cancel booking #${bookingToCancel?.booking_code}? Once cancelled, the vehicle will be immediately released for other customers.`}
        confirmLabel="Confirm Cancellation"
        cancelLabel="Keep Booking"
        variant="danger"
        inputPlaceholder="Reason for cancellation (optional)..."
        inputValue={cancellationReason}
        onInputChange={setCancellationReason}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
      />

      {/* Receipt Modal */}
      {receiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Rental Invoice & Receipt</h3>
              </div>
              <button
                onClick={() => setReceiptBooking(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Invoice / Code:</span>
                <span className="font-mono text-slate-900 font-semibold">{receiptBooking.booking_code}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Vehicle:</span>
                <span className="text-slate-900 font-medium">
                  {receiptBooking.vehicle_brand} {receiptBooking.vehicle_model}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Registration #:</span>
                <span className="font-mono text-slate-900">{receiptBooking.vehicle_reg}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Rental Period:</span>
                <span className="text-slate-900 text-right">
                  {receiptBooking.start_datetime.replace('T', ' ')}
                  <br />to {receiptBooking.end_datetime.replace('T', ' ')}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Daily Rate:</span>
                <span className="font-mono tabular-nums">${receiptBooking.price_per_day.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Duration:</span>
                <span className="font-mono tabular-nums">{receiptBooking.rental_duration_days} Day(s)</span>
              </div>

              {/* Surcharges Breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>• Vehicle Licensing & Road Recovery Fee ($3.50/day):</span>
                  <span className="text-emerald-700 font-semibold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>• State & Municipal Rental Tax (8%):</span>
                  <span className="text-emerald-700 font-semibold">Included</span>
                </div>
                <div className="flex justify-between">
                  <span>• Collision Damage Waiver (CDW):</span>
                  <span className="text-emerald-700 font-semibold">Included ($0 Deductible)</span>
                </div>
                <div className="flex justify-between">
                  <span>• Security Deposit Hold ($200.00):</span>
                  <span className="text-slate-700 font-semibold">Released Upon Return</span>
                </div>
              </div>

              <div className="flex justify-between text-slate-500 pt-1">
                <span>Booking Status:</span>
                <StatusBadge status={receiptBooking.status} />
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Amount Paid / Due:</span>
                <span className="text-blue-600 font-mono tabular-nums">
                  ${receiptBooking.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setReceiptBooking(null)}
                className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
