import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  X,
  Zap,
  Car,
  RefreshCw,
  Info,
  Fuel,
  Gauge,
  Award,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  History,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Vehicle, RecommendedVehicleItem, AIRecommendationResponse } from '../types';

interface AIRecommenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVehicleToBook: (vehicle: Vehicle, prefillDuration?: number) => void;
}

const PURPOSE_PRESETS = [
  { id: 'family', label: 'Family Road Trip', icon: '👨‍👩‍👧‍👦', desc: 'Comfort, child safety, spacious cargo trunk' },
  { id: 'business', label: 'Business & Executive', icon: '💼', desc: 'Sleek styling, quiet ride, premium connectivity' },
  { id: 'weekend', label: 'Weekend Getaway', icon: '🏖️', desc: 'Fun driving dynamics, scenic touring' },
  { id: 'cargo', label: 'Luggage & Cargo Hauling', icon: '📦', desc: 'Maximum cargo volume, high ceiling space' },
  { id: 'eco', label: 'Eco-Friendly Commute', icon: '⚡', desc: 'Electric or hybrid, low emissions and fuel savings' },
  { id: 'luxury', label: 'Special Occasion / Luxury', icon: '🌟', desc: 'Prestige, sporty performance, heads-turning styling' }
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

export function AIRecommenderModal({
  isOpen,
  onClose,
  onSelectVehicleToBook
}: AIRecommenderModalProps) {
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

  if (!isOpen) return null;

  const handleApplyPreset = (preset: (typeof ONE_CLICK_TEST_PRESETS)[0]) => {
    setPassengers(preset.passengers);
    setDurationDays(preset.durationDays);
    setCurrency(preset.currency);
    setBudget(preset.budget);
    setRentalPurpose(preset.purpose);
    setCustomPurpose('');
    setVehicleTypePref(preset.type);
    setResult(null);
  };

  const handleGenerateRecommendation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

    const activePurpose = customPurpose.trim() ? customPurpose.trim() : rentalPurpose;

    try {
      const res = await authFetch('/api/vehicles/recommend', {
        method: 'POST',
        body: JSON.stringify({
          passengers,
          durationDays,
          budget,
          currency,
          rentalPurpose: activePurpose,
          vehicleTypePreference: vehicleTypePref,
          fuelPreference: fuelPref !== 'Any' ? fuelPref : undefined
        })
      });

      if (res.ok) {
        const data: AIRecommendationResponse = await res.json();
        setResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to generate recommendations. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to get recommendation:', err);
      setError('Connection error reaching AI recommendation service.');
    } finally {
      setIsLoading(false);
    }
  };

  const dailyBudgetApprox = Math.round(budget / Math.max(1, durationDays));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white px-6 py-4 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-10 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md border border-blue-400/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>AI-Powered Vehicle Recommendation Concierge</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <Sparkles className="w-3 h-3 text-emerald-300" />
                    <span>Smart Match</span>
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Intelligently matches passengers, trip duration, budget & purpose with real fleet inventory.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors relative z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 text-slate-800">
          {/* Quick One-Click Test Presets Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Example Scenarios:</span>
              </span>
              <span className="text-[11px] text-slate-400">Click to autofill parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {ONE_CLICK_TEST_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`text-left p-2.5 rounded-lg border transition-all text-xs ${
                    passengers === p.passengers && durationDays === p.durationDays && budget === p.budget
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{p.title}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{p.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleGenerateRecommendation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Passengers */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Number of Passengers</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {passengers} {passengers === 1 ? 'Person' : 'People'}
                  </span>
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 4, 5, 7, 8, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPassengers(num)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all text-center ${
                        passengers === num
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Days */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rental Duration (Days)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
                  </span>
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationDays(d)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all text-center ${
                        durationDays === d
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Budget */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    <span>Total Trip Budget</span>
                  </label>
                  <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        if (currency !== 'INR') {
                          setCurrency('INR');
                          setBudget(5000);
                        }
                      }}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        currency === 'INR' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
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
                        currency === 'USD' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
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
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>≈ {currency === 'INR' ? '₹' : '$'}{dailyBudgetApprox.toLocaleString()} / day</span>
                  <span>{currency === 'INR' ? `≈ $${Math.round(budget / 83)} USD` : `≈ ₹${(budget * 83).toLocaleString()} INR`}</span>
                </div>
              </div>
            </div>

            {/* Purpose Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Purpose of Rental</span>
                <span className="text-[11px] text-slate-400 font-normal">Select travel intent or customize below</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{p.icon}</span>
                        <span className="font-bold text-xs leading-tight">{p.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Custom Purpose Input */}
              <div className="mt-2">
                <input
                  type="text"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="Or describe specific requirements: e.g. 5 friends with camping luggage visiting hill station for 3 days..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
              </div>
            </div>

            {/* Vehicle Type & Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Category Preference
                </label>
                <select
                  value={vehicleTypePref}
                  onChange={(e) => setVehicleTypePref(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
                >
                  <option value="Any">Any Category (Let AI Choose Best Match)</option>
                  <option value="SUV">SUV & 4x4 (High Ground Clearance & Cargo)</option>
                  <option value="Sedan">Sedan (Comfort & Executive Styling)</option>
                  <option value="Hatchback">Hatchback (Agile, High Mileage, Budget Friendly)</option>
                  <option value="Electric">Electric / EV (Zero Emissions & Instant Torque)</option>
                  <option value="Luxury">Luxury & Sports Performance</option>
                  <option value="Van">Passenger Van (Spacious 8-12 Seater)</option>
                  <option value="Truck">Pickup Truck & Hauler</option>
                  <option value="Campervan / RV">Campervan / Adventure RV</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Propulsion / Fuel Type
                </label>
                <select
                  value={fuelPref}
                  onChange={(e) => setFuelPref(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 font-medium"
                >
                  <option value="Any">Any Propulsion (Petrol, Diesel, EV, Hybrid)</option>
                  <option value="Electric">Electric (Battery EV)</option>
                  <option value="Hybrid">Hybrid (Gas + Electric Assist)</option>
                  <option value="Petrol">Petrol (Gasoline)</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
            </div>

            {/* Customer Past Booking Badge */}
            {user?.role === 'customer' ? (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Personalized for {(user as any).fullName || user.email}:</strong> AI automatically inspects your previous booking history to tune preferences.
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  History Active
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center gap-2 text-xs">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Guest Mode: AI will optimize for your specified requirements. Sign in as a customer to enable past rental habit tuning.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Fleet with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate AI Recommendations</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Results Presentation */}
          {result && (
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>AI Fleet Analysis & Recommendations</span>
                        <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          {result.recommendations.length} Match{result.recommendations.length === 1 ? '' : 'es'}
                        </span>
                      </h3>
                      <div className="text-[11px] font-mono text-slate-500">
                        {result.queryCriteria.passengers} pax · {result.queryCriteria.durationDays}d · {result.queryCriteria.currency === 'INR' ? '₹' : '$'}{result.queryCriteria.budget.toLocaleString()}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {result.executiveSummary}
                    </p>
                    {result.alternativeSuggestions && (
                      <p className="text-[11px] text-blue-800 font-medium mt-2 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{result.alternativeSuggestions}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommended Cards */}
              <div className="space-y-4">
                {result.recommendations.map((item, index) => {
                  const v = item.vehicle;
                  const isTopPick = index === 0;

                  return (
                    <div
                      key={item.vehicleId}
                      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                        isTopPick
                          ? 'border-blue-400 ring-2 ring-blue-500/15'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Vehicle Image & Match Badges */}
                        <div className="md:w-64 h-48 md:h-auto relative bg-slate-100 shrink-0 overflow-hidden">
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
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-xs flex items-center gap-1 ${
                                isTopPick
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-900/90 text-white'
                              }`}
                            >
                              <Award className="w-3 h-3 text-amber-300" />
                              <span>{item.badge}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/95 text-slate-800 border border-slate-200 shadow-2xs">
                              {item.matchScore}% Match
                            </span>
                          </div>

                          <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-white font-mono">
                            {v.registration_number}
                          </div>
                        </div>

                        {/* Content & AI Reasoning */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-base font-bold text-slate-900">
                                    {v.brand} {v.model}
                                  </h4>
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                                    {v.vehicle_type}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {v.year} · {v.transmission} · {v.seating_capacity} Passenger Capacity · {v.fuel_type}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-slate-900 font-mono">
                                  {currency === 'INR' ? '₹' : '$'}{item.totalCostInSelectedCurrency.toLocaleString()}
                                  <span className="text-[11px] font-normal text-slate-500 ml-1">Total ({durationDays}d)</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  ${v.price_per_day.toFixed(0)}/day ({currency === 'INR' ? `₹${Math.round(v.price_per_day * 83).toLocaleString()}/d` : `$${v.price_per_day.toFixed(0)}/d`})
                                </div>
                              </div>
                            </div>

                            {/* Why this fits explanation */}
                            <div className="mt-3 bg-blue-50/50 rounded-xl p-3 border border-blue-100 text-xs">
                              <div className="font-bold text-blue-950 flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                <span>Why This Vehicle Fits Your Request:</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                                {item.fitReason}
                              </p>
                            </div>

                            {/* Pros for trip & Budget breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-xs">
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                  Trip Advantages:
                                </span>
                                {item.prosForTrip.map((pro, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{pro}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-0.5">
                                  Budget Evaluation:
                                </span>
                                <p className="text-[11px] text-slate-600 leading-normal">
                                  {item.budgetAnalysis}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 1-Click Booking Action */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500 font-medium">
                              Instant booking verification & overlap check available
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                onSelectVehicleToBook(v, durationDays);
                                onClose();
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1.5 shrink-0"
                            >
                              <span>Reserve This Vehicle</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
