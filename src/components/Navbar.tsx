import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, User, Car, LogOut, Key, Check, ShieldCheck, Bot, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
}

export function Navbar({ currentTab, onSelectTab, onOpenAuth }: NavbarProps) {
  const { user, logout, demoLogin } = useAuth();

  const handleRoleSwitch = async (role: UserRole) => {
    const result = await demoLogin(role);
    if (result.requires2FA) {
      // Open modal to prompt for 2FA verification
      onOpenAuth('login');
      return;
    }
    if (role === 'admin') onSelectTab('admin-dashboard');
    else if (role === 'staff') onSelectTab('staff-dashboard');
    else onSelectTab('vehicles');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Quick Demo Switcher Strip for rapid evaluation */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="font-semibold text-white">Live Role Switcher:</span>
          <span>Switch instant test accounts without typing credentials</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              user?.role === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Switch to Administrator (Full system, vehicles & user control)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
            {user?.role === 'admin' && <Check className="w-3 h-3 text-white" />}
          </button>

          <button
            onClick={() => handleRoleSwitch('staff')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              user?.role === 'staff'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Switch to Rental Staff (Confirm, Dispatch Active, Return)"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff</span>
            {user?.role === 'staff' && <Check className="w-3 h-3 text-white" />}
          </button>

          <button
            onClick={() => handleRoleSwitch('customer')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
              user?.role === 'customer'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Switch to Customer (Browse, Check Availability, Book, Cancel)"
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer</span>
            {user?.role === 'customer' && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectTab(user?.role === 'admin' ? 'admin-dashboard' : user?.role === 'staff' ? 'staff-dashboard' : 'home')}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-blue-600 transition-colors">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">AutoFleet</span>
              <span className="block text-[10px] text-slate-500 font-medium tracking-wide uppercase">Rental Engine</span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {/* Admin Navigation */}
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => onSelectTab('admin-dashboard')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'admin-dashboard' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onSelectTab('admin-vehicles')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'admin-vehicles' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Fleet Management
              </button>
              <button
                onClick={() => onSelectTab('admin-bookings')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'admin-bookings' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                All Bookings
              </button>
              <button
                onClick={() => onSelectTab('admin-users')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'admin-users' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Customers & Users
              </button>
            </>
          )}

          {/* Staff Navigation */}
          {user?.role === 'staff' && (
            <>
              <button
                onClick={() => onSelectTab('staff-dashboard')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'staff-dashboard' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Staff Dashboard
              </button>
              <button
                onClick={() => onSelectTab('staff-bookings')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'staff-bookings' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Booking Management
              </button>
              <button
                onClick={() => onSelectTab('staff-active')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'staff-active' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Active Rentals
              </button>
              <button
                onClick={() => onSelectTab('vehicles')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'vehicles' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Fleet Inventory
              </button>
            </>
          )}

          {/* Customer Navigation */}
          {user?.role === 'customer' && (
            <>
              <button
                onClick={() => onSelectTab('vehicles')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'vehicles' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Browse Vehicles
              </button>
              <button
                onClick={() => onSelectTab('ai-recommender')}
                className={`transition-colors flex items-center gap-1 hover:text-slate-900 ${
                  currentTab === 'ai-recommender' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : 'text-indigo-600'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Recommender</span>
              </button>
              <button
                onClick={() => onSelectTab('customer-bookings')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'customer-bookings' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                My Bookings
              </button>
              <button
                onClick={() => onSelectTab('customer-profile')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'customer-profile' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                My Profile
              </button>
            </>
          )}

          {/* Public / Unauthenticated Navigation */}
          {!user && (
            <>
              <button
                onClick={() => onSelectTab('home')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'home' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onSelectTab('vehicles')}
                className={`transition-colors hover:text-slate-900 ${
                  currentTab === 'vehicles' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : ''
                }`}
              >
                Explore Vehicles
              </button>
              <button
                onClick={() => onSelectTab('ai-recommender')}
                className={`transition-colors flex items-center gap-1 hover:text-slate-900 ${
                  currentTab === 'ai-recommender' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1' : 'text-indigo-600 font-semibold'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Recommender</span>
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Account Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {(user as any).fullName || user.email}
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 capitalize">
                    {user.role} Account
                  </span>
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                      title="Identity Protected: Multi-Factor Security (2FA) Active"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>2FA Verified</span>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
