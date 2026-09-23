import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Zap,
  Car,
  RefreshCw,
  Info,
  Award,
  TrendingUp,
  History,
  Check,
  Shield,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Vehicle, RecommendedVehicleItem, AIRecommendationResponse } from '../types';

interface AIRecommenderPageProps {
  onSelectVehicleToBook: (vehicle: Vehicle, prefillDuration?: number) => void;
  onNavigateFleet: () => void;
}

const PURPOSE_PRESETS = [
  { id: 'family', label: 'Family Road Trip', icon: '👨‍👩‍👧‍👦', desc: 'Comfort, child safety, spacious luggage trunk' },
  { id: 'business', label: 'Business & Executive', icon: '💼', desc: 'Sleek styling, whisper-quiet cabin, premium tech' },
  { id: 'weekend', label: 'Weekend Getaway', icon: '🏖️', desc: 'Fun driving dynamics, scenic open-road touring' },
  { id: 'cargo', label: 'Luggage & Cargo Hauling', icon: '📦', desc: 'Maximum cargo volume, high ceiling, loading ease' },
  { id: 'eco', label: 'Eco-Friendly Commute', icon: '⚡', desc: 'Zero-emission electric or high MPG hybrid drive' },
  { id: 'luxury', label: 'Special Occasion / Luxury', icon: '🌟', desc: 'Prestige, sports acceleration, heads-turning presence' }
];

const ONE_CLICK_TEST_PRESETS = [
  {
    title: '5 People · 3 Days · ₹5,000',
    subtitle: 'User Brief: Family trip on ₹5,000 budget',
    passengers: 5,
    durationDays: 3,
    budget: 5000,
    currency: 'INR' as const,
    purpose: 'Family road trip with 5 passengers and luggage',
    type: 'Any'
  },
  {
    title: 'Executive EV · $250 · 2 Days',
    subtitle: 'High-tech electric business trip',
    passengers: 2,
    durationDays: 2,
    budget: 250,
    currency: 'USD' as const,
    purpose: 'Business travel & client meetings in city center',
    type: 'Electric'
  },
  {
    title: 'Group Tour · 8 People · 4 Days',
    subtitle: 'Spacious passenger van or multi-seater',
    passengers: 8,
    durationDays: 4,
    budget: 800,
    currency: 'USD' as const,
    purpose: 'Group family vacation & sightseeing tour',
    type: 'Van'
  },
  {
    title: 'Couples Scenic Drive · ₹12,000',
    subtitle: 'Comfortable 3-day holiday cruise',
    passengers: 2,
    durationDays: 3,
    budget: 12000,
    currency: 'INR' as const,
    purpose: 'Scenic mountain holiday and couple getaway',
    type: 'SUV'
  }
];

export function AIRecommenderPage({ onSelectVehicleToBook, onNavigateFleet }: AIRecommenderPageProps) {
  const { user, authFetch } = useAuth();

  // Form states
  const [passengers, setPassengers] = useState<number>(5);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [budget, setBudget] = useState<number>(5000);
  const [rentalPurpose, setRentalPurpose] = useState<string>('Family road trip');
  const [customPurpose, setCustomPurpose] = useState<string>('');
  const [vehicleTypePref, setVehicleTypePref] = useState<string>('Any');
  const [fuelPref, setFuelPref] = useState<string>('Any');

  // Request & Result states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-run recommendation on mount so user immediately sees recommendations
  useEffect(() => {
    handleGenerateRecommendation();
  }, []);

  const handleApplyPreset = (preset: (typeof ONE_CLICK_TEST_PRESETS)[0]) => {
    setPassengers(preset.passengers);
    setDurationDays(preset.durationDays);
    setCurrency(preset.currency);
    setBudget(preset.budget);
    setRentalPurpose(preset.purpose);
    setCustomPurpose('');
    setVehicleTypePref(preset.type);
    // Run recommendation immediately
    triggerRecommendationWithValues(
      preset.passengers,
      preset.durationDays,
      preset.budget,
      preset.currency,
      preset.purpose,
      preset.type
    );
  };

  const triggerRecommendationWithValues = async (
    p: number,
    d: number,
    b: number,
    curr: 'INR' | 'USD',
    purp: string,
    type: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/vehicles/recommend', {
        method: 'POST',
        body: JSON.stringify({
          passengers: p,
          durationDays: d,
          budget: b,
          currency: curr,
          rentalPurpose: purp,
          vehicleTypePreference: type,
          fuelPreference: fuelPref !== 'Any' ? fuelPref : undefined
        })
      });

      if (res.ok) {
        const data: AIRecommendationResponse = await res.json();
        setResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to generate recommendations.');
      }
    } catch (err) {
      console.error('Failed to get recommendation:', err);
      setError('Connection error reaching AI recommendation service.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRecommendation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activePurpose = customPurpose.trim() ? customPurpose.trim() : rentalPurpose;
    await triggerRecommendationWithValues(
      passengers,
      durationDays,
      budget,
      currency,
      activePurpose,
      vehicleTypePref
    );
  };

  const dailyBudgetApprox = Math.round(budget / Math.max(1, durationDays));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-10 text-white relative overflow-hidden shadow-xl border border-blue-900/40">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Bot className="w-3.5 h-3.5 text-blue-300" />
            <span>AI Fleet Matching Engine · Gemini 3.8 Flash Powered</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            AI-Based Vehicle Recommendation
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Instead of manually browsing hundreds of fleet models, our AI concierge analyzes your group size,
            rental duration, budget, trip purpose, and past booking habits to recommend the ideal vehicles and explain <em>exactly why</em> they fit.
          </p>

          {/* Quick preset scenario bar */}
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              ⚡ Instant 1-Click Test Scenarios:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {ONE_CLICK_TEST_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className={`text-left p-2.5 rounded-xl border transition-all text-xs backdrop-blur-xs ${
                    passengers === p.passengers && durationDays === p.durationDays && budget === p.budget
                      ? 'bg-blue-600/40 border-blue-400 text-white font-bold shadow-sm'
                      : 'bg-white/10 border-white/10 text-slate-200 hover:bg-white/20 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>{p.title}</span>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form & Criteria Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Configure Your Rental Requirements</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize passengers, trip duration, target budget, and specific travel purpose.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateFleet}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <span>View All Fleet Units</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleGenerateRecommendation} className="space-y-5">
          {/* Row 1: Passengers, Duration, Budget */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passengers */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Passengers</span>
                </label>
                <span className="text-xs font-mono font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-2xs">
                  {passengers} {passengers === 1 ? 'Seat' : 'Seats'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 4, 5, 7, 8, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPassengers(num)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all text-center ${
                      passengers === num
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Rental Duration</span>
                </label>
                <span className="text-xs font-mono font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded shadow-2xs">
                  {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationDays(d)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all text-center ${
                      durationDays === d
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span>Target Budget</span>
                </label>
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      if (currency !== 'INR') {
                        setCurrency('INR');
                        setBudget(5000);
                      }
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currency === 'INR' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ₹ INR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currency !== 'USD') {
                        setCurrency('USD');
                        setBudget(250);
                      }
                    }}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currency === 'USD' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative mt-2">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                  {currency === 'INR' ? '₹' : '$'}
                </span>
                <input
                  type="number"
                  min="50"
                  step={currency === 'INR' ? '250' : '10'}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(1, Number(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                <span>≈ {currency === 'INR' ? '₹' : '$'}{dailyBudgetApprox.toLocaleString()} / day</span>
                <span>{currency === 'INR' ? `≈ $${Math.round(budget / 83)} USD` : `≈ ₹${(budget * 83).toLocaleString()} INR`}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Purpose */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Purpose of Rental
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {PURPOSE_PRESETS.map((p) => {
                const isSelected = rentalPurpose === p.label && !customPurpose;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setRentalPurpose(p.label);
                      setCustomPurpose('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xl mb-1">{p.icon}</div>
                    <div className="font-bold text-xs">{p.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <input
                type="text"
                value={customPurpose}
                onChange={(e) => setCustomPurpose(e.target.value)}
                placeholder="Or specify custom requirements: e.g. Airport pickup for 5 delegates with heavy suitcases, or off-road hill station trip..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              />
            </div>
          </div>

          {/* Row 3: Category & Fuel Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Type Preference
              </label>
              <select
                value={vehicleTypePref}
                onChange={(e) => setVehicleTypePref(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
              >
                <option value="Any">Any Category (Best Fit Evaluated by AI)</option>
                <option value="Hatchback">Hatchback (Agile, High Mileage, Economical)</option>
                <option value="Sedan">Sedan (Executive Comfort & Smooth Cruising)</option>
                <option value="SUV">SUV & 4x4 (High Ground Clearance, Road Trips)</option>
                <option value="Electric">Electric / EV (Zero Emissions & Instant Power)</option>
                <option value="Luxury">Luxury & Sports Performance</option>
                <option value="Van">Passenger Van (8-12 Passenger Multi-Seater)</option>
                <option value="Truck">Pickup Truck & Cargo Hauler</option>
                <option value="Campervan / RV">Campervan / Adventure RV</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Engine & Propulsion
              </label>
              <select
                value={fuelPref}
                onChange={(e) => setFuelPref(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
              >
                <option value="Any">Any Propulsion (Petrol, Diesel, EV, Hybrid)</option>
                <option value="Petrol">Petrol (Gasoline)</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric (Battery EV)</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Customer History Status Bar */}
          {user?.role === 'customer' ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Personalized for {(user as any).fullName || user.email}:</strong> AI considers your past booking history for vehicle class and comfort affinity.
                </span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                Personalized
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center gap-2 text-xs">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Standard Guest Mode active. Sign in to your Customer Account to automatically personalize recommendations with your past rental records!
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Fleet with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Re-run AI Recommendation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Recommendations Results Section */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>AI Fleet Evaluation & Reasoning</span>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                      {result.recommendations.length} Recommended Vehicles
                    </span>
                  </h3>
                  <div className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                    {result.queryCriteria.passengers} Passengers · {result.queryCriteria.durationDays} Days · {result.queryCriteria.currency === 'INR' ? '₹' : '$'}{result.queryCriteria.budget.toLocaleString()} Target
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed font-medium">
                  {result.executiveSummary}
                </p>
                {result.alternativeSuggestions && (
                  <p className="text-xs text-blue-800 font-semibold mt-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{result.alternativeSuggestions}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.recommendations.map((item, index) => {
              const v = item.vehicle;
              const isTopPick = index === 0;

              return (
                <div
                  key={item.vehicleId}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-lg ${
                    isTopPick
                      ? 'border-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Vehicle Image Header */}
                  <div className="aspect-video relative bg-slate-100 overflow-hidden">
                    <img
                      src={v.image_url}
                      alt={`${v.brand} ${v.model}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-xs flex items-center gap-1.5 ${
                          isTopPick ? 'bg-blue-600 text-white' : 'bg-slate-900/90 text-white'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>{item.badge}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/95 text-slate-800 border border-slate-200 shadow-2xs">
                        {item.matchScore}% Match Score
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] text-white font-mono">
                      {v.registration_number}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Name & Pricing */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-bold text-slate-900">
                              {v.brand} {v.model}
                            </h4>
                            <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                              {v.vehicle_type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Year {v.year} · {v.transmission} · {v.seating_capacity} Seats · {v.fuel_type}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-slate-900 font-mono">
                            {currency === 'INR' ? '₹' : '$'}{item.totalCostInSelectedCurrency.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Total for {durationDays} days
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ${v.price_per_day.toFixed(0)}/day ({currency === 'INR' ? `₹${Math.round(v.price_per_day * 83).toLocaleString()}/d` : `$${v.price_per_day.toFixed(0)}/d`})
                          </div>
                        </div>
                      </div>

                      {/* Why this fits callout */}
                      <div className="mt-3.5 bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 text-xs">
                        <div className="font-bold text-blue-950 flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Why Recommended by AI:</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs">
                          {item.fitReason}
                        </p>
                      </div>

                      {/* Pros & Budget Analysis */}
                      <div className="space-y-2 mt-3 text-xs">
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Trip Highlights:
                          </span>
                          <div className="space-y-1">
                            {item.prosForTrip.map((pro, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1.5 text-slate-600 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{pro}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                            Budget Analysis:
                          </span>
                          <p className="text-xs text-slate-600 leading-normal">
                            {item.budgetAnalysis}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Book Button */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 font-medium">
                        Instant reservation & overlap check
                      </span>

                      <button
                        onClick={() => onSelectVehicleToBook(v, durationDays)}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-2"
                      >
                        <span>Reserve This Vehicle</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
