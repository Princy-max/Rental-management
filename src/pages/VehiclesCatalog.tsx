import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleType, VehicleStatus } from '../types';
import { StatusBadge, VehicleTypeBadge } from '../components/StatusBadge';
import {
  Search,
  SlidersHorizontal,
  Calendar,
  Fuel,
  Gauge,
  Users,
  AlertCircle,
  CheckCircle2,
  Car,
  RotateCcw,
  Bike,
  Truck,
  Bus,
  Tent,
  Zap,
  Layers,
  Bot,
  Sparkles
} from 'lucide-react';

interface VehiclesCatalogProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenAIRecommender?: () => void;
}

const VEHICLE_CATEGORIES = [
  { id: 'all', label: 'All Fleet Units', icon: Layers },
  { id: 'Motorcycle', label: 'Motorcycles', icon: Bike },
  { id: 'Scooter', label: 'Scooters', icon: Bike },
  { id: 'Bicycle', label: 'E-Bikes', icon: Bike },
  { id: 'Truck', label: 'Trucks & Haulers', icon: Truck },
  { id: 'Commercial', label: 'Cargo & Commercial', icon: Truck },
  { id: 'Van', label: 'Passenger Vans', icon: Bus },
  { id: 'Campervan / RV', label: 'Campervans & RVs', icon: Tent },
  { id: 'SUV', label: 'SUVs & 4x4', icon: Car },
  { id: 'Sedan', label: 'Sedans', icon: Car },
  { id: 'Electric', label: 'Electric & EVs', icon: Zap },
  { id: 'Luxury', label: 'Luxury & Sports', icon: Car }
];

export function VehiclesCatalog({ onSelectVehicle, onOpenAIRecommender }: VehiclesCatalogProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedTrans, setSelectedTrans] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedFuel !== 'all') params.set('fuel', selectedFuel);
      if (selectedTrans !== 'all') params.set('transmission', selectedTrans);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (startDate && endDate) {
        params.set('start', startDate);
        params.set('end', endDate);
      }

      const res = await fetch(`/api/vehicles?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to load vehicles catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchVehicles, 250);
    return () => clearTimeout(timer);
  }, [search, selectedType, selectedFuel, selectedTrans, selectedStatus, startDate, endDate]);

  const resetFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedFuel('all');
    setSelectedTrans('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Category Fleet Inventory & Booking</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse our complete multi-modal fleet — including motorcycles, pickup trucks, campervans, passenger vans, cars & e-bikes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAIRecommender && (
            <button
              onClick={onOpenAIRecommender}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Bot className="w-4 h-4 text-white" />
              <span>AI Recommender</span>
            </button>
          )}
          <span className="text-xs font-mono tabular-nums text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs font-semibold">
            {vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'} Available
          </span>
        </div>
      </div>

      {/* AI Recommendation Banner Callout */}
      {onOpenAIRecommender && (
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-blue-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md border border-blue-400/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>AI Smart Vehicle Recommendation Engine</span>
                </h3>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>Gemini 3.8 Flash</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Need a vehicle for 5 people for 3 days with a ₹5,000 budget? Tell our AI your passenger count, duration, budget, and trip purpose — the system recommends suitable available vehicles and explains <em>why</em>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 shrink-0 w-full md:w-auto">
            <button
              onClick={onOpenAIRecommender}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ask AI Recommender</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        {/* Top search & quick controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by brand, model, type, or registration (e.g. Ducati, Ford, Tesla, Vespa)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-700"
            >
              <option value="all">All Vehicle Statuses</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="active">Active (On Road)</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <select
              value={selectedFuel}
              onChange={(e) => setSelectedFuel(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-slate-700"
            >
              <option value="all">All Fuel / Propulsion Types</option>
              <option value="Petrol">Petrol (Gasoline)</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric (EV / Battery)</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Plug-in Hybrid">Plug-in Hybrid</option>
              <option value="Pedal / Human Powered">Pedal / Human Powered</option>
            </select>
          </div>
        </div>

        {/* Date Filter & Vehicle Type Tabs */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          {/* Segmented Type Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
            {VEHICLE_CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={`px-3 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                    selectedType === cat.id
                      ? 'bg-white text-blue-700 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date range picker for timeframe availability */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Dates:
            </span>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              title="Rental Start Date/Time"
            />
            <span className="text-slate-400">to</span>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
              title="Rental End Date/Time"
            />
            {(search || selectedType !== 'all' || selectedFuel !== 'all' || selectedStatus !== 'all' || startDate || endDate) && (
              <button
                onClick={resetFilters}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ml-1 flex items-center gap-1 text-xs"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-200 w-full" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No vehicles match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try adjusting your search query, clear active date range filters, or broaden vehicle class selections.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => {
            const hasDates = !!(startDate && endDate);
            const isConflicted = hasDates && v.is_available_for_dates === false;
            const isAvailableForSelected = hasDates && v.is_available_for_dates === true;
            const isMaintenanceOrInactive = v.status === 'maintenance' || v.status === 'inactive';

            return (
              <div
                key={v.id}
                className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col overflow-hidden ${
                  isConflicted
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Vehicle Image Container */}
                <div className="aspect-video relative bg-slate-100 overflow-hidden">
                  <img
                    src={v.image_url}
                    alt={`${v.brand} ${v.model}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Status badge pinned to corner */}
                  <div className="absolute top-3 left-3">
                    <StatusBadge status={v.status} />
                  </div>

                  {/* Overlap / Availability Callout Pill */}
                  {hasDates && (
                    <div className="absolute bottom-3 left-3 right-3">
                      {isAvailableForSelected ? (
                        <div className="bg-emerald-950/80 backdrop-blur-xs text-emerald-200 text-[11px] px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Available for selected dates</span>
                        </div>
                      ) : (
                        <div className="bg-rose-950/80 backdrop-blur-xs text-rose-200 text-[11px] px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="truncate">{v.conflict_reason || 'Overlap conflict detected'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {v.brand} {v.model}
                          </h3>
                          <VehicleTypeBadge type={v.vehicle_type} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Model Year {v.year} · {v.transmission}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {v.registration_number}
                      </span>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-slate-600 text-xs">
                      <div className="flex items-center gap-1 truncate" title={v.fuel_type}>
                        <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{v.fuel_type}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate" title={v.transmission}>
                        <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{v.transmission}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {v.seating_capacity} {v.seating_capacity === 1 ? (v.vehicle_type === 'Bicycle' ? 'Rider' : 'Seat') : 'Seats'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-500 block">Daily Rate</span>
                      <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                        ${v.price_per_day.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectVehicle(v)}
                      disabled={isMaintenanceOrInactive}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors shadow-2xs ${
                        isMaintenanceOrInactive
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isMaintenanceOrInactive
                        ? `Unavailable (${v.status})`
                        : 'Book / Check Dates'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
