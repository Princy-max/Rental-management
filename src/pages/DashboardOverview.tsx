import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  Car,
  CheckCircle2,
  Activity,
  Wrench,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Shield,
  Layers,
  RotateCcw
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export function DashboardOverview({ onNavigateTab }: DashboardOverviewProps) {
  const { authFetch, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Fleet Vehicles',
      value: stats.totalVehicles,
      icon: Car,
      color: 'text-slate-900',
      bg: 'bg-slate-100',
      tabTarget: user?.role === 'admin' ? 'admin-vehicles' : 'vehicles'
    },
    {
      title: 'Available for Booking',
      value: stats.availableVehicles,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      tabTarget: 'vehicles'
    },
    {
      title: 'Active Rentals on Road',
      value: stats.activeRentals,
      icon: Activity,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      tabTarget: user?.role === 'staff' ? 'staff-active' : 'staff-bookings'
    },
    {
      title: 'Under Maintenance',
      value: stats.maintenanceVehicles,
      icon: Wrench,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      tabTarget: user?.role === 'admin' ? 'admin-vehicles' : 'vehicles'
    },
    {
      title: 'Registered Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      tabTarget: 'admin-users'
    },
    {
      title: 'Pending Bookings',
      value: stats.pendingBookings,
      icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      tabTarget: user?.role === 'admin' ? 'admin-bookings' : 'staff-bookings'
    },
    {
      title: 'Completed Rentals',
      value: stats.completedRentals,
      icon: CheckCircle,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      tabTarget: user?.role === 'admin' ? 'admin-bookings' : 'staff-bookings'
    },
    {
      title: 'Cancelled Bookings',
      value: stats.cancelledBookings,
      icon: XCircle,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      tabTarget: user?.role === 'admin' ? 'admin-bookings' : 'staff-bookings'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {user?.role === 'admin' ? 'Executive Operations Dashboard' : 'Rental Operations Dashboard'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
              {user?.role}
            </span>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>2FA Session Verified</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time telemetry, fleet availability statuses, and booking throughput overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            title="Refresh metrics"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-2xs">
            <span className="text-xs text-slate-400 block">Total Revenue</span>
            <span className="text-sm font-bold font-mono text-emerald-700 tabular-nums">
              ${stats.totalRevenue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 8 Primary Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigateTab(card.tabTarget)}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all text-left group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 leading-tight">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {card.value}
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Two Column Layout: Fleet Category Distribution & Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Composition Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Fleet Class Distribution</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{stats.totalVehicles} units</span>
          </div>

          <div className="space-y-3 pt-1">
            {stats.categoryBreakdown.map((cat, i) => {
              const pct = stats.totalVehicles > 0 ? Math.round((cat.count / stats.totalVehicles) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>{cat.vehicle_type}</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {cat.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Fleet Utilization:</span>
            <strong className="font-mono text-slate-900">
              {stats.totalVehicles > 0
                ? `${Math.round((stats.activeRentals / stats.totalVehicles) * 100)}%`
                : '0%'}
            </strong>
          </div>
        </div>

        {/* Recent Bookings Queue */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs lg:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recent Booking Activity
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab(user?.role === 'admin' ? 'admin-bookings' : 'staff-bookings')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Vehicle</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Start Date</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stats.recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No recent bookings.
                    </td>
                  </tr>
                ) : (
                  stats.recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-semibold text-blue-700">
                        {b.booking_code}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {b.brand} {b.model}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {b.customer_name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {b.start_datetime.replace('T', ' ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold tabular-nums text-slate-900">
                        ${b.total_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
