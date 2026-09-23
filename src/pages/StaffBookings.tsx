import React, { useState, useEffect } from 'react';
import { Booking, BookingStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Search,
  CheckCircle,
  Play,
  RotateCcw,
  XCircle,
  Calendar,
  Clock,
  User,
  Phone,
  FileText,
  Filter,
  Car
} from 'lucide-react';

export function StaffBookings() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Transition Dialog States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalAction, setModalAction] = useState<'confirm' | 'start' | 'return' | 'cancel' | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Error fetching staff bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const openActionModal = (booking: Booking, action: 'confirm' | 'start' | 'return' | 'cancel') => {
    setSelectedBooking(booking);
    setModalAction(action);
    setModalNotes('');
  };

  const handleExecuteStatusChange = async () => {
    if (!selectedBooking || !modalAction) return;

    let targetStatus: BookingStatus = 'confirmed';
    if (modalAction === 'start') targetStatus = 'active';
    else if (modalAction === 'return') targetStatus = 'returned';
    else if (modalAction === 'cancel') targetStatus = 'cancelled';

    setIsProcessing(true);
    try {
      const res = await authFetch(`/api/bookings/${selectedBooking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          cancellationReason: modalAction === 'cancel' ? modalNotes || 'Cancelled by staff operations' : undefined,
          notes: modalAction !== 'cancel' ? modalNotes || undefined : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to update booking', 'Error');
        return;
      }

      showToast(
        'success',
        `Booking #${selectedBooking.booking_code} transitioned to '${targetStatus}'.`,
        'Operation Completed'
      );
      setModalAction(null);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      showToast('error', 'Network error modifying booking', 'Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      b.booking_code.toLowerCase().includes(term) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
      (b.vehicle_brand && b.vehicle_brand.toLowerCase().includes(term)) ||
      (b.vehicle_model && b.vehicle_model.toLowerCase().includes(term)) ||
      (b.vehicle_reg && b.vehicle_reg.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const statuses = ['all', 'pending', 'confirmed', 'active', 'returned', 'cancelled'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Booking Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review incoming requests, confirm rentals, dispatch vehicles to active road status, and process returns.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking #, customer, car..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs w-full md:w-auto">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 font-medium rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'all' ? 'All Requests' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Booking Code</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Rental Window</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading booking records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Booking Code */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                      {b.booking_code}
                      <span className="block text-[11px] font-sans text-slate-400 font-normal">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{b.customer_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{b.customer_phone || b.customer_email}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Lic: {b.customer_license}
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {b.vehicle_brand} {b.vehicle_model}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {b.vehicle_reg}
                      </div>
                    </td>

                    {/* Rental Window */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="text-slate-900 font-medium">
                        {b.start_datetime.replace('T', ' ')}
                      </div>
                      <div className="text-slate-500">
                        to {b.end_datetime.replace('T', ' ')}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({b.rental_duration_days} days)
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      ${b.total_amount.toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={b.status} />
                    </td>

                    {/* Action Buttons based on status flow */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* If Pending -> Can Confirm or Cancel */}
                        {b.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openActionModal(b, 'confirm')}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              title="Confirm booking request"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              onClick={() => openActionModal(b, 'cancel')}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Cancel booking"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* If Confirmed -> Can Start Rental (Dispatch) or Cancel */}
                        {b.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => openActionModal(b, 'start')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              title="Customer picked up keys: start rental"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Rental</span>
                            </button>
                            <button
                              onClick={() => openActionModal(b, 'cancel')}
                              className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Cancel booking"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* If Active -> Can Mark Vehicle Returned */}
                        {b.status === 'active' && (
                          <button
                            onClick={() => openActionModal(b, 'return')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium transition-colors flex items-center gap-1 shadow-2xs"
                            title="Vehicle returned by customer: complete rental"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Mark Returned</span>
                          </button>
                        )}

                        {/* Terminal statuses */}
                        {(b.status === 'returned' || b.status === 'cancelled') && (
                          <span className="text-slate-400 text-[11px] italic">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modals for Staff Operations */}
      <ConfirmationModal
        isOpen={modalAction === 'confirm'}
        title="Confirm Booking Request"
        message={`Confirm reservation #${selectedBooking?.booking_code} for ${selectedBooking?.customer_name} (${selectedBooking?.vehicle_brand} ${selectedBooking?.vehicle_model})? The vehicle status will be updated to Booked.`}
        confirmLabel="Confirm Reservation"
        variant="primary"
        isLoading={isProcessing}
        onConfirm={handleExecuteStatusChange}
        onCancel={() => setModalAction(null)}
      />

      <ConfirmationModal
        isOpen={modalAction === 'start'}
        title="Start Rental Dispatch"
        message={`Hand over keys for #${selectedBooking?.booking_code}? This marks the booking and vehicle ${selectedBooking?.vehicle_reg} as 'Active' on the road.`}
        confirmLabel="Start Rental"
        variant="success"
        isLoading={isProcessing}
        onConfirm={handleExecuteStatusChange}
        onCancel={() => setModalAction(null)}
      />

      <ConfirmationModal
        isOpen={modalAction === 'return'}
        title="Process Vehicle Return"
        message={`Confirm that vehicle ${selectedBooking?.vehicle_brand} ${selectedBooking?.vehicle_model} (${selectedBooking?.vehicle_reg}) has been inspected and returned? The vehicle will automatically revert to 'Available' for future bookings.`}
        confirmLabel="Mark as Returned"
        variant="primary"
        inputPlaceholder="Return notes (mileage, fuel level, vehicle condition)..."
        inputValue={modalNotes}
        onInputChange={setModalNotes}
        isLoading={isProcessing}
        onConfirm={handleExecuteStatusChange}
        onCancel={() => setModalAction(null)}
      />

      <ConfirmationModal
        isOpen={modalAction === 'cancel'}
        title="Cancel Booking"
        message={`Are you sure you want to cancel booking #${selectedBooking?.booking_code}? Any vehicle locks will be released immediately.`}
        confirmLabel="Confirm Cancellation"
        variant="danger"
        inputPlaceholder="Provide cancellation explanation..."
        inputValue={modalNotes}
        onInputChange={setModalNotes}
        isLoading={isProcessing}
        onConfirm={handleExecuteStatusChange}
        onCancel={() => setModalAction(null)}
      />
    </div>
  );
}
