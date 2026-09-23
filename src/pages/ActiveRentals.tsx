import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Car,
  RotateCcw,
  Clock,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export function ActiveRentals() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return modal
  const [returnBooking, setReturnBooking] = useState<Booking | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchActiveRentals = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/bookings?status=active');
      if (res.ok) {
        const data = await res.json();
        setActiveBookings(data);
      }
    } catch (err) {
      console.error('Failed to load active rentals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRentals();
  }, []);

  const handleReturnConfirm = async () => {
    if (!returnBooking) return;
    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/bookings/${returnBooking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'returned',
          notes: returnNotes || 'Inspected and returned to fleet inventory'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to process return', 'Error');
        return;
      }

      showToast(
        'success',
        `Vehicle ${returnBooking.vehicle_reg} marked as returned and is now Available!`,
        'Vehicle Check-In Complete'
      );
      setReturnBooking(null);
      fetchActiveRentals();
    } catch (err) {
      showToast('error', 'Network error during return processing', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Rentals Dispatch Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking of vehicles currently checked out with customers on the road.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
            {activeBookings.length} On Road
          </span>
          <button
            onClick={fetchActiveRentals}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            title="Refresh active list"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-32 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : activeBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No active vehicles currently on road</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            All fleet vehicles are presently parked at the branch or undergoing scheduled maintenance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeBookings.map((b) => {
            const endDate = new Date(b.end_datetime);
            const isOverdue = new Date() > endDate;

            return (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video relative bg-slate-100">
                    {b.vehicle_image ? (
                      <img
                        src={b.vehicle_image}
                        alt={`${b.vehicle_brand} ${b.vehicle_model}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Car className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded shadow-xs">
                      Active On Road
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-base font-bold text-slate-900">
                        {b.vehicle_brand} {b.vehicle_model}
                      </h3>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {b.vehicle_reg}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.customer_name}</span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.customer_phone || 'No phone'}</span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        DL: {b.customer_license}
                      </div>
                    </div>

                    {/* Rental Timing */}
                    <div className="text-xs space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Out: {b.start_datetime.replace('T', ' ')}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 font-semibold' : ''}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Return Due: {b.end_datetime.replace('T', ' ')}</span>
                      </div>
                      {isOverdue && (
                        <div className="flex items-center gap-1 text-rose-600 text-[11px] bg-rose-50 p-1.5 rounded border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Vehicle return is past due schedule!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Return Action Button */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => {
                      setReturnBooking(b);
                      setReturnNotes('');
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Process Vehicle Return & Check-In</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Process Return Modal */}
      <ConfirmationModal
        isOpen={!!returnBooking}
        title="Process Vehicle Return & Re-stock"
        message={`Check-in vehicle ${returnBooking?.vehicle_brand} ${returnBooking?.vehicle_model} (${returnBooking?.vehicle_reg}) from customer ${returnBooking?.customer_name}. The vehicle status will be automatically restored to 'Available' for immediate booking.`}
        confirmLabel="Complete Return & Mark Available"
        variant="primary"
        inputPlaceholder="Return inspection notes (mileage, fuel level, pristine condition)..."
        inputValue={returnNotes}
        onInputChange={setReturnNotes}
        isLoading={isProcessing}
        onConfirm={handleReturnConfirm}
        onCancel={() => setReturnBooking(null)}
      />
    </div>
  );
}
