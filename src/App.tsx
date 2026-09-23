import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { VehicleBookingModal } from './components/VehicleBookingModal';
import { PublicHome } from './pages/PublicHome';
import { VehiclesCatalog } from './pages/VehiclesCatalog';
import { CustomerBookings } from './pages/CustomerBookings';
import { CustomerProfile } from './pages/CustomerProfile';
import { StaffBookings } from './pages/StaffBookings';
import { ActiveRentals } from './pages/ActiveRentals';
import { AdminVehicles } from './pages/AdminVehicles';
import { AdminUsers } from './pages/AdminUsers';
import { DashboardOverview } from './pages/DashboardOverview';
import { AIRecommenderPage } from './pages/AIRecommenderPage';
import { AIRecommenderModal } from './components/AIRecommenderModal';
import { Vehicle } from './types';
import { Shield, Sparkles, Bot } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();

  // Current selected tab / view
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modal dialog states
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [selectedVehicleForBooking, setSelectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [aiRecommenderOpen, setAiRecommenderOpen] = useState<boolean>(false);
  const [prefillDurationDays, setPrefillDurationDays] = useState<number>(3);

  // Sync default view when user signs in or role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && (currentTab === 'home' || currentTab === 'customer-bookings')) {
        setCurrentTab('admin-dashboard');
      } else if (user.role === 'staff' && (currentTab === 'home' || currentTab === 'customer-bookings')) {
        setCurrentTab('staff-dashboard');
      } else if (user.role === 'customer' && (currentTab.startsWith('admin-') || currentTab.startsWith('staff-'))) {
        setCurrentTab('vehicles');
      }
    } else {
      if (currentTab.startsWith('admin-') || currentTab.startsWith('staff-') || currentTab.startsWith('customer-')) {
        setCurrentTab('home');
      }
    }
  }, [user]);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectVehicle = (vehicle: Vehicle, duration?: number) => {
    if (duration) {
      setPrefillDurationDays(duration);
    }
    setSelectedVehicleForBooking(vehicle);
  };

  const handleBookingCreated = () => {
    if (user?.role === 'customer') {
      setCurrentTab('customer-bookings');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar with Live Role Switcher */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {/* Public Landing View */}
        {currentTab === 'home' && (
          <PublicHome
            onNavigateVehicles={() => setCurrentTab('vehicles')}
            onSelectVehicle={handleSelectVehicle}
            onOpenAuth={handleOpenAuth}
            onOpenAIRecommender={() => setAiRecommenderOpen(true)}
          />
        )}

        {/* Fleet Vehicles Catalog (Public & All Roles) */}
        {currentTab === 'vehicles' && (
          <VehiclesCatalog
            onSelectVehicle={handleSelectVehicle}
            onOpenAIRecommender={() => setAiRecommenderOpen(true)}
          />
        )}

        {/* AI Smart Recommendation Page */}
        {currentTab === 'ai-recommender' && (
          <AIRecommenderPage
            onSelectVehicleToBook={handleSelectVehicle}
            onNavigateFleet={() => setCurrentTab('vehicles')}
          />
        )}

        {/* Customer Specific Views */}
        {currentTab === 'customer-bookings' && (
          <CustomerBookings onNavigateVehicles={() => setCurrentTab('vehicles')} />
        )}

        {currentTab === 'customer-profile' && <CustomerProfile />}

        {/* Staff Specific Views */}
        {currentTab === 'staff-dashboard' && (
          <DashboardOverview onNavigateTab={setCurrentTab} />
        )}

        {currentTab === 'staff-bookings' && <StaffBookings />}

        {currentTab === 'staff-active' && <ActiveRentals />}

        {/* Admin Specific Views */}
        {currentTab === 'admin-dashboard' && (
          <DashboardOverview onNavigateTab={setCurrentTab} />
        )}

        {currentTab === 'admin-vehicles' && <AdminVehicles />}

        {currentTab === 'admin-bookings' && <StaffBookings />}

        {currentTab === 'admin-users' && <AdminUsers />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">AutoFleet Operational Engine</span>
            <span>· Enterprise Multi-Role Fleet Management System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>Algorithmic Overlap Validation</span>
            <span>·</span>
            <span>REST API Active</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Vehicle Booking & Date Availability Modal */}
      <VehicleBookingModal
        vehicle={selectedVehicleForBooking}
        isOpen={!!selectedVehicleForBooking}
        initialDurationDays={prefillDurationDays}
        onClose={() => setSelectedVehicleForBooking(null)}
        onBookingSuccess={handleBookingCreated}
        onOpenAuth={() => {
          setSelectedVehicleForBooking(null);
          handleOpenAuth('login');
        }}
      />

      {/* AI Smart Recommender Modal */}
      <AIRecommenderModal
        isOpen={aiRecommenderOpen}
        onClose={() => setAiRecommenderOpen(false)}
        onSelectVehicleToBook={handleSelectVehicle}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
