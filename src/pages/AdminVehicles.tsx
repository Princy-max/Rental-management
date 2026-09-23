import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleType, FuelType, TransmissionType, VehicleStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge, VehicleTypeBadge } from '../components/StatusBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Wrench,
  PowerOff,
  CheckCircle2,
  X,
  Car,
  DollarSign,
  Bike,
  Truck,
  Bus,
  Tent,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';

const TYPE_PRESETS: Record<string, { seats: number; fuel: FuelType; trans: TransmissionType; image: string; rate: number }> = {
  'Motorcycle': {
    seats: 2,
    fuel: 'Petrol',
    trans: 'Manual',
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80',
    rate: 85
  },
  'Scooter': {
    seats: 2,
    fuel: 'Petrol',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1571188654248-7a89213915f7?w=800&auto=format&fit=crop&q=80',
    rate: 45
  },
  'Bicycle': {
    seats: 1,
    fuel: 'Electric',
    trans: 'Pedal / Gear Shifter',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&auto=format&fit=crop&q=80',
    rate: 28
  },
  'Truck': {
    seats: 5,
    fuel: 'Diesel',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&auto=format&fit=crop&q=80',
    rate: 140
  },
  'Commercial': {
    seats: 2,
    fuel: 'Diesel',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&auto=format&fit=crop&q=80',
    rate: 115
  },
  'Van': {
    seats: 12,
    fuel: 'Diesel',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=80',
    rate: 190
  },
  'Bus': {
    seats: 25,
    fuel: 'Diesel',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    rate: 280
  },
  'Campervan / RV': {
    seats: 4,
    fuel: 'Petrol',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800&auto=format&fit=crop&q=80',
    rate: 195
  },
  'Sedan': {
    seats: 5,
    fuel: 'Petrol',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
    rate: 85
  },
  'SUV': {
    seats: 5,
    fuel: 'Hybrid',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=800&auto=format&fit=crop&q=80',
    rate: 110
  },
  'Luxury': {
    seats: 4,
    fuel: 'Petrol',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
    rate: 220
  },
  'Electric': {
    seats: 5,
    fuel: 'Electric',
    trans: 'Automatic',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop&q=80',
    rate: 105
  },
  'Hatchback': {
    seats: 5,
    fuel: 'Petrol',
    trans: 'Manual',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
    rate: 70
  }
};

const STANDARD_TYPES = [
  'Motorcycle',
  'Scooter',
  'Bicycle',
  'Truck',
  'Commercial',
  'Van',
  'Bus',
  'Campervan / RV',
  'Sedan',
  'SUV',
  'Hatchback',
  'Luxury',
  'Electric'
];

export function AdminVehicles() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [regNumber, setRegNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('Motorcycle');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [year, setYear] = useState(2024);
  const [fuelType, setFuelType] = useState<string>('Petrol');
  const [transmission, setTransmission] = useState<string>('Automatic');
  const [seatingCapacity, setSeatingCapacity] = useState(2);
  const [pricePerDay, setPricePerDay] = useState(85);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('available');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to load fleet vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSelectVehicleType = (val: string) => {
    if (val === 'Custom') {
      setIsCustomType(true);
      setVehicleType('Custom');
    } else {
      setIsCustomType(false);
      setVehicleType(val);
      // Auto apply preset if creating new
      if (!editingVehicle && TYPE_PRESETS[val]) {
        const p = TYPE_PRESETS[val];
        setSeatingCapacity(p.seats);
        setFuelType(p.fuel);
        setTransmission(p.trans);
        setImageUrl(p.image);
        setPricePerDay(p.rate);
      }
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setRegNumber('');
    setBrand('');
    setModel('');
    setIsCustomType(false);
    setCustomTypeName('');
    setVehicleType('Motorcycle');
    setYear(2024);
    setFuelType('Petrol');
    setTransmission('Manual');
    setSeatingCapacity(2);
    setPricePerDay(85);
    setImageUrl('https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80');
    setDescription('');
    setStatus('available');
    setIsModalOpen(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setRegNumber(v.registration_number);
    setBrand(v.brand);
    setModel(v.model);
    if (STANDARD_TYPES.includes(v.vehicle_type)) {
      setIsCustomType(false);
      setVehicleType(v.vehicle_type);
      setCustomTypeName('');
    } else {
      setIsCustomType(true);
      setVehicleType('Custom');
      setCustomTypeName(v.vehicle_type);
    }
    setYear(v.year);
    setFuelType(v.fuel_type);
    setTransmission(v.transmission);
    setSeatingCapacity(v.seating_capacity);
    setPricePerDay(v.price_per_day);
    setImageUrl(v.image_url);
    setDescription(v.description);
    setStatus(v.status);
    setIsModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const finalType = isCustomType ? (customTypeName.trim() || 'Custom Vehicle') : vehicleType;
      const url = editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          registrationNumber: regNumber,
          brand,
          model,
          vehicleType: finalType,
          year,
          fuelType,
          transmission,
          seatingCapacity,
          pricePerDay,
          imageUrl,
          description,
          status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to save vehicle', 'Error');
        return;
      }

      showToast(
        'success',
        `Vehicle ${brand} ${model} (${regNumber}) [${finalType}] saved successfully!`,
        editingVehicle ? 'Vehicle Updated' : 'Vehicle Registered'
      );
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      showToast('error', 'Network error saving vehicle', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusToggle = async (v: Vehicle, newStatus: VehicleStatus) => {
    try {
      const res = await authFetch(`/api/vehicles/${v.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast('success', `${v.brand} ${v.model} status updated to '${newStatus}'.`, 'Status Updated');
        fetchVehicles();
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to change status', 'Error');
      }
    } catch (err) {
      showToast('error', 'Network error', 'Error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/vehicles/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Vehicle deleted or deactivated.', 'Fleet Action');
        setDeleteTarget(null);
        fetchVehicles();
      } else {
        showToast('error', data.error || 'Failed to delete vehicle', 'Error');
      }
    } catch (err) {
      showToast('error', 'Network error during vehicle deletion', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = vehicles.filter((v) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.registration_number.toLowerCase().includes(term);
    const matchesType =
      filterType === 'all' ||
      v.vehicle_type.toLowerCase() === filterType.toLowerCase() ||
      v.vehicle_type.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Asset Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register all vehicle categories (motorcycles, trucks, RVs, vans, cars & micromobility), modify rates, and manage fleet lifecycle.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Vehicle</span>
        </button>
      </div>

      {/* Filter Surface */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search registration, brand, model..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          >
            <option value="all">All Vehicle Types</option>
            <optgroup label="Two-Wheelers & Micromobility">
              <option value="Motorcycle">Motorcycle</option>
              <option value="Scooter">Scooter / Moped</option>
              <option value="Bicycle">Bicycle / E-Bike</option>
            </optgroup>
            <optgroup label="Trucks & Heavy Haulers">
              <option value="Truck">Truck / Pickup</option>
              <option value="Commercial">Commercial / Cargo</option>
            </optgroup>
            <optgroup label="Vans & Group Transport">
              <option value="Van">Passenger Van</option>
              <option value="Bus">Bus / Coach</option>
              <option value="Campervan / RV">Campervan / RV</option>
            </optgroup>
            <optgroup label="Automobiles & Cars">
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV / Crossover</option>
              <option value="Luxury">Luxury & Sports</option>
              <option value="Electric">Electric Vehicle</option>
              <option value="Hatchback">Hatchback</option>
            </optgroup>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Class & Fuel</th>
                <th className="py-3 px-4">Daily Rate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading vehicle inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No vehicles found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Vehicle */}
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-12 h-9 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img
                          src={v.image_url}
                          alt={v.model}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {v.brand} {v.model}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">Year {v.year}</div>
                      </div>
                    </td>

                    {/* Registration */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {v.registration_number}
                    </td>

                    {/* Class & Fuel */}
                    <td className="py-3 px-4">
                      <VehicleTypeBadge type={v.vehicle_type} />
                      <div className="text-[11px] text-slate-400 mt-1">
                        {v.fuel_type} · {v.transmission} · {v.seating_capacity} {v.seating_capacity === 1 ? 'seat' : 'seats'}
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      ${v.price_per_day.toFixed(2)}/day
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} />
                    </td>

                    {/* Controls */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Maintenance Toggle */}
                        {v.status !== 'maintenance' ? (
                          <button
                            onClick={() => handleQuickStatusToggle(v, 'maintenance')}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Flag for Maintenance (removes from booking availability)"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickStatusToggle(v, 'available')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Restore to Available"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit vehicle details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete / Deactivate */}
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete or Deactivate vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingVehicle ? `Edit Vehicle: ${editingVehicle.brand} ${editingVehicle.model}` : 'Add New Fleet Vehicle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registration #</label>
                  <input
                    type="text"
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. AF-8820"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Porsche"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. 911 Carrera"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Category Templates */}
              {!editingVehicle && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Quick Vehicle Templates (Auto-fills defaults)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'Motorcycle', label: '🏍️ Motorcycle' },
                      { id: 'Scooter', label: '🛵 Scooter' },
                      { id: 'Bicycle', label: '🚲 E-Bike' },
                      { id: 'Truck', label: '🛻 Pickup Truck' },
                      { id: 'Commercial', label: '📦 Cargo Van' },
                      { id: 'Van', label: '🚐 Passenger Van' },
                      { id: 'Campervan / RV', label: '🏕️ Campervan / RV' },
                      { id: 'Sedan', label: '🚗 Sedan' },
                      { id: 'SUV', label: '🚙 SUV' },
                      { id: 'Luxury', label: '🏎️ Luxury Sports' },
                      { id: 'Electric', label: '⚡ Electric EV' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleSelectVehicleType(item.id)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                          !isCustomType && vehicleType === item.id
                            ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Category / Type
                  </label>
                  <select
                    value={isCustomType ? 'Custom' : vehicleType}
                    onChange={(e) => handleSelectVehicleType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none font-medium"
                  >
                    <optgroup label="Two-Wheelers & Micromobility">
                      <option value="Motorcycle">Motorcycle (Sport / Cruiser / Tourer)</option>
                      <option value="Scooter">Scooter / Moped</option>
                      <option value="Bicycle">Bicycle / E-Bike</option>
                    </optgroup>
                    <optgroup label="Trucks & Heavy Utility">
                      <option value="Truck">Truck / Pickup</option>
                      <option value="Commercial">Commercial / Cargo Hauler</option>
                    </optgroup>
                    <optgroup label="Vans & Group Mobility">
                      <option value="Van">Passenger Van</option>
                      <option value="Bus">Bus / Minibus / Shuttle</option>
                      <option value="Campervan / RV">Campervan / RV / Motorhome</option>
                    </optgroup>
                    <optgroup label="Automobiles & Passenger Cars">
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV / Crossover</option>
                      <option value="Luxury">Luxury / Sports Car</option>
                      <option value="Electric">Electric Vehicle (EV)</option>
                      <option value="Hatchback">Hatchback</option>
                    </optgroup>
                    <optgroup label="Other Vehicles">
                      <option value="Custom">Custom / Other Vehicle Type...</option>
                    </optgroup>
                  </select>

                  {isCustomType && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        value={customTypeName}
                        onChange={(e) => setCustomTypeName(e.target.value)}
                        placeholder="Enter custom type (e.g. ATV, Quad Bike, Boat, Jet Ski, Trailer)..."
                        className="w-full px-3 py-1.5 text-xs border border-blue-400 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model Year</label>
                  <input
                    type="number"
                    min={1990}
                    max={2030}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel / Propulsion</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Petrol">Petrol (Gasoline)</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric (Battery)</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid (PHEV)</option>
                    <option value="Hydrogen">Hydrogen Fuel Cell</option>
                    <option value="Pedal / Human Powered">Pedal / Human Powered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transmission / Drive</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT (Continuously Variable)</option>
                    <option value="Direct Drive">Direct Drive (Single Speed)</option>
                    <option value="Pedal / Gear Shifter">Pedal / Gear Shifter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seating / Rider Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={seatingCapacity}
                    onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono"
                    title="1 for bicycles/solo bikes, 2 for motorcycles, 5 for cars/trucks, 12+ for vans/buses"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Daily Rental Rate ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Operational Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="available">Available (Publicly Bookable)</option>
                    <option value="booked">Booked</option>
                    <option value="active">Active (Dispatched on Road)</option>
                    <option value="returned">Returned</option>
                    <option value="maintenance">Maintenance (Hidden from Booking)</option>
                    <option value="inactive">Inactive (Decommissioned)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specifications, luxury options, performance notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Remove or Deactivate Vehicle"
        message={`Are you sure you want to remove ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.registration_number})? If historical bookings exist, the vehicle will be safely deactivated (set to Inactive) to maintain data integrity.`}
        confirmLabel="Confirm Action"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
