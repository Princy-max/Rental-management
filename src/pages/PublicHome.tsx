import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldCheck,
  CalendarCheck2,
  Clock,
  Car,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  CheckCircle2,
  Bot,
  DollarSign,
  TrendingUp,
  Award
} from 'lucide-react';

interface PublicHomeProps {
  onNavigateVehicles: () => void;
  onSelectVehicle: (v: Vehicle) => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenAIRecommender?: () => void;
}

export function PublicHome({
  onNavigateVehicles,
  onSelectVehicle,
  onOpenAuth,
  onOpenAIRecommender
}: PublicHomeProps) {
  const [featuredVehicles, setFeaturedVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetch('/api/vehicles')
      .then((res) => res.json())
      .then((data: Vehicle[]) => {
        setFeaturedVehicles(data.slice(0, 3));
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="space-y-16 py-6 pb-16">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-2xl text-white p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-xl">
          {/* Subtle geometric background accent */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-1/4 -top-20 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Conflict-Free Enterprise Rental Engine</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Smarter fleet rentals with zero booking collisions.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Engineered with algorithmic schedule overlap validation, multi-role dispatch workflows,
              and real-time fleet telematics for administrators, rental staff, and customers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onNavigateVehicles}
                className="px-6 py-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <span>Browse Fleet Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onOpenAIRecommender && (
                <button
                  onClick={onOpenAIRecommender}
                  className="px-6 py-3 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-lg transition-all shadow-md flex items-center gap-2 border border-blue-400/30"
                >
                  <Bot className="w-4 h-4 text-amber-300" />
                  <span>🤖 AI Vehicle Matchmaker</span>
                </button>
              )}

              <button
                onClick={() => onOpenAuth('register')}
                className="px-6 py-3 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg border border-slate-700 transition-colors"
              >
                Create Customer Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600">Enterprise Operations</h2>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Built for reliability across the complete rental lifecycle
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Zero Overlapping Rentals</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every booking reservation is mathematically validated on the backend before write operations.
              Back-to-back rentals are permitted while preventing fractional date overlaps.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Three-Tier Role Security</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Strict RBAC enforcement across Administrators, Rental Staff, and Customers.
              Staff process active key dispatches and vehicle returns with verified audit trails.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Automated Vehicle Availability</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Maintenance and inactive vehicles are automatically sequestered from public booking.
              Returned vehicles instantly transition back to available status.
            </p>
          </div>
        </div>
      </section>

      {/* AI Recommendation Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-2xl text-white p-8 sm:p-12 relative overflow-hidden shadow-xl border border-blue-900/50">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Novel AI / Smart Rental Angle</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              🤖 AI-Based Vehicle Recommendation
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Instead of simply showing available vehicles, the system analyzes your rental requirements and explains <em>why</em> each vehicle is recommended:
            </p>

            {/* Feature pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>⏱️ Rental Duration</span>
                </div>
                <div className="text-slate-300 text-[11px]">Optimizes mileage and multi-day rates</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>👥 Passenger Seating</span>
                </div>
                <div className="text-slate-300 text-[11px]">Strict seat count & luggage match</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>💰 Budget (₹ & $)</span>
                </div>
                <div className="text-slate-300 text-[11px]">Accurate currency match & savings</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>🚗 Vehicle Preference</span>
                </div>
                <div className="text-slate-300 text-[11px]">SUV, Sedan, EV, Van, or Luxury</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>🎯 Rental Purpose</span>
                </div>
                <div className="text-slate-300 text-[11px]">Family trips, business, or getaways</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <span>📜 Previous Bookings</span>
                </div>
                <div className="text-slate-300 text-[11px]">Personalized to customer history</div>
              </div>
            </div>

            {/* Example Card from Brief */}
            <div className="bg-blue-900/40 border border-blue-400/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Interactive Real-World Example:</span>
                </div>
                <p className="text-xs text-slate-200">
                  "Customer needs a vehicle for <strong>5 people for 3 days with a ₹5,000 budget</strong> → system recommends suitable available vehicles and explains why."
                </p>
              </div>

              {onOpenAIRecommender && (
                <button
                  onClick={onOpenAIRecommender}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Test This Scenario</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Fleet Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Premium Fleet</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore our most popular high-performance vehicles</p>
          </div>
          <button
            onClick={onNavigateVehicles}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View All Fleet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredVehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="aspect-video relative bg-slate-100">
                <img
                  src={v.image_url}
                  alt={`${v.brand} ${v.model}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3">
                  <StatusBadge status={v.status} />
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-bold text-slate-900">
                      {v.brand} {v.model}
                    </h3>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {v.registration_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {v.year} · {v.fuel_type} · {v.transmission} · {v.seating_capacity} Seats
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Daily</span>
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      ${v.price_per_day.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectVehicle(v)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Check & Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Workflow Demo Explanation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="max-w-xl">
            <h3 className="text-base font-bold text-slate-900">Complete Lifecycle Verification</h3>
            <p className="text-xs text-slate-600 mt-1">
              Test the end-to-end multi-role flow seamlessly using the role switcher in the header:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-blue-700 mb-1">1. Admin Adds Vehicle</div>
              <p className="text-slate-500">Add or manage registration, vehicle specs, daily rates, and status.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-emerald-700 mb-1">2. Customer Books</div>
              <p className="text-slate-500">Select dates, verify zero conflicts, and submit booking request.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-indigo-700 mb-1">3. Staff Dispatches</div>
              <p className="text-slate-500">Confirm booking and start rental. Vehicle moves to 'Active'.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="font-semibold text-teal-700 mb-1">4. Vehicle Returned</div>
              <p className="text-slate-500">Mark vehicle returned. System updates status back to 'Available'.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
