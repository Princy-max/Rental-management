import React from 'react';
import { VehicleStatus, BookingStatus } from '../types';

interface StatusBadgeProps {
  status: VehicleStatus | BookingStatus | string;
  type?: 'vehicle' | 'booking';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (normalized) {
    case 'available':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Available';
      break;
    case 'active':
      styles = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Active';
      break;
    case 'booked':
      styles = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Booked';
      break;
    case 'returned':
      styles = 'bg-teal-50 text-teal-700 border-teal-200';
      label = 'Returned';
      break;
    case 'pending':
      styles = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'Pending Review';
      break;
    case 'confirmed':
      styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      label = 'Confirmed';
      break;
    case 'maintenance':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Maintenance';
      break;
    case 'inactive':
      styles = 'bg-slate-100 text-slate-600 border-slate-300';
      label = 'Inactive';
      break;
    case 'cancelled':
      styles = 'bg-rose-50 text-rose-600 border-rose-200';
      label = 'Cancelled';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border tracking-tight whitespace-nowrap ${styles} ${className}`}
    >
      {label}
    </span>
  );
}

import { Bike, Truck, Bus, Car, Zap, Tent, Layers } from 'lucide-react';

export function getVehicleTypeIcon(type: string, className = 'w-3.5 h-3.5') {
  const norm = (type || '').toLowerCase();
  if (norm.includes('motorcycle') || norm.includes('scooter') || norm.includes('bicycle') || norm.includes('bike')) {
    return <Bike className={className} />;
  }
  if (norm.includes('truck') || norm.includes('commercial') || norm.includes('pickup') || norm.includes('cargo')) {
    return <Truck className={className} />;
  }
  if (norm.includes('bus') || norm.includes('coach') || norm.includes('shuttle')) {
    return <Bus className={className} />;
  }
  if (norm.includes('camper') || norm.includes('rv')) {
    return <Tent className={className} />;
  }
  if (norm.includes('electric') || norm.includes('ev')) {
    return <Zap className={className} />;
  }
  return <Car className={className} />;
}

export function VehicleTypeBadge({ type, className = '' }: { type: string; className?: string }) {
  const norm = (type || '').toLowerCase();
  let color = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm.includes('motorcycle') || norm.includes('scooter') || norm.includes('bicycle')) {
    color = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (norm.includes('truck') || norm.includes('commercial')) {
    color = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (norm.includes('van') || norm.includes('bus')) {
    color = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (norm.includes('camper') || norm.includes('rv')) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm.includes('electric')) {
    color = 'bg-cyan-50 text-cyan-700 border-cyan-200';
  } else if (norm.includes('luxury')) {
    color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color} ${className}`}
    >
      {getVehicleTypeIcon(type, 'w-3 h-3')}
      <span>{type}</span>
    </span>
  );
}
