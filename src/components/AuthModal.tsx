import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  FileText,
  MapPin,
  Shield,
  Users,
  ShieldCheck,
  Clock,
  ArrowLeft,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export function AuthModal({ isOpen, initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | '2fa'>(initialMode);
  const { login, register, demoLogin, verify2FA, resend2FA, active2FAChallenge, setActive2FAChallenge } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [address, setAddress] = useState('');

  // 2FA Security states
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [countdown, setCountdown] = useState<number>(300);

  // Sync mode when modal opens or active2FAChallenge changes
  useEffect(() => {
    if (active2FAChallenge) {
      setMode('2fa');
      setCountdown(active2FAChallenge.expiresInSeconds || 300);
    } else {
      setMode(initialMode);
    }
  }, [isOpen, active2FAChallenge, initialMode]);

  // Countdown timer for 2FA token expiry
  useEffect(() => {
    if (mode !== '2fa' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, countdown]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      if (result.requires2FA) {
        setMode('2fa');
        setTwoFactorCode('');
        setCountdown(result.challenge?.expiresInSeconds || 300);
      } else {
        onClose();
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await register({
      email,
      password,
      fullName,
      phone,
      drivingLicense,
      address
    });
    setIsLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setIsLoading(true);
    const result = await demoLogin(role);
    setIsLoading(false);

    if (result.success) {
      if (result.requires2FA) {
        setMode('2fa');
        setTwoFactorCode('');
        setCountdown(result.challenge?.expiresInSeconds || 300);
      } else {
        onClose();
      }
    }
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active2FAChallenge?.tempToken || !twoFactorCode.trim()) return;

    setIsLoading(true);
    const success = await verify2FA(active2FAChallenge.tempToken, twoFactorCode.trim());
    setIsLoading(false);

    if (success) {
      onClose();
    }
  };

  const handleResendCode = async () => {
    if (!active2FAChallenge?.tempToken) return;
    setIsLoading(true);
    const res = await resend2FA(active2FAChallenge.tempToken);
    setIsLoading(false);
    if (res.success) {
      setCountdown(res.expiresInSeconds || 300);
    }
  };

  const handleQuickFillCode = () => {
    if (active2FAChallenge?.securityCode) {
      setTwoFactorCode(active2FAChallenge.securityCode);
    }
  };

  const handleCancel2FA = () => {
    setActive2FAChallenge(null);
    setTwoFactorCode('');
    setMode('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            {mode === '2fa' ? (
              <div className="flex items-center gap-2 text-slate-900">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-none">Security Verification</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Two-Factor Authentication (2FA)</p>
                </div>
              </div>
            ) : (
              <h3 className="text-base font-bold text-slate-900">
                {mode === 'login' ? 'Sign in to AutoFleet' : 'Create Customer Account'}
              </h3>
            )}
          </div>
          <button
            onClick={mode === '2fa' ? handleCancel2FA : onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {mode === '2fa' ? (
            /* =======================================================================
               EXTRA SECURITY: 2FA VERIFICATION CHALLENGE FOR ADMIN & STAFF
               ======================================================================= */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Privileged Personnel Badge */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-600 text-white">
                    <Shield className="w-3.5 h-3.5" />
                    {active2FAChallenge?.role === 'admin' ? 'Administrator Terminal' : 'Rental Operations Terminal'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-blue-800 font-mono font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Expires: {formatTimer(countdown)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-700">
                  Account: <strong className="text-slate-900 font-mono">{active2FAChallenge?.email}</strong>
                  {active2FAChallenge?.fullName && <span> · {active2FAChallenge.fullName}</span>}
                </div>
              </div>

              {/* Notice */}
              <p className="text-xs text-slate-600 leading-relaxed">
                Elevated operational privileges detected. To protect fleet inventory, booking schedules, and operational contracts, enter the <strong>6-digit security token</strong> issued for this authorized terminal session.
              </p>

              {/* Form */}
              <form onSubmit={handleVerify2FASubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5 text-center">
                    Enter 6-Digit Authorization Passcode
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="text"
                      autoFocus
                      required
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      className="w-full text-center font-mono text-2xl tracking-[0.4em] font-bold py-3 bg-slate-50 border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 text-slate-900 placeholder:tracking-normal placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Live Demo Security Token Box */}
                {active2FAChallenge?.securityCode && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Issued Terminal Token
                      </div>
                      <div className="text-lg font-mono font-bold text-blue-700 tracking-wider">
                        {active2FAChallenge.securityCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickFillCode}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors shadow-2xs"
                    >
                      Quick-Fill Code
                    </button>
                  </div>
                )}

                {/* Audit & Security Note */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Security audit logging active. Max 3 verification attempts allowed before temporary session lockout.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || twoFactorCode.length !== 6 || countdown <= 0}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isLoading ? 'Verifying Credentials...' : 'Verify & Authorize Access'}</span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate New Passcode</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCancel2FA}
                      className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Login</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* =======================================================================
               STANDARD LOGIN & REGISTER FORMS
               ======================================================================= */
            <>
              {/* Quick Demo Login Cards */}
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-900">Fast 1-Click Evaluation Sign In:</span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    Admin & Staff enforce 2FA
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    disabled={isLoading}
                    className="px-2 py-2 bg-white border border-blue-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-800 flex flex-col items-center gap-1 transition-colors shadow-2xs group"
                  >
                    <div className="relative">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title="2FA Protected" />
                    </div>
                    <span>Admin</span>
                    <span className="text-[9px] text-blue-600 font-mono">2FA Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('staff')}
                    disabled={isLoading}
                    className="px-2 py-2 bg-white border border-blue-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-800 flex flex-col items-center gap-1 transition-colors shadow-2xs group"
                  >
                    <div className="relative">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" title="2FA Protected" />
                    </div>
                    <span>Rental Staff</span>
                    <span className="text-[9px] text-indigo-600 font-mono">2FA Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('customer')}
                    disabled={isLoading}
                    className="px-2 py-2 bg-white border border-blue-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-800 flex flex-col items-center gap-1 transition-colors shadow-2xs"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Customer</span>
                    <span className="text-[9px] text-emerald-600 font-mono">Direct</span>
                  </button>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  New Customer Registration
                </button>
              </div>

              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@autofleet.com"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-700">Demo Credentials:</div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Admin (2FA Enforced):</span>
                      <span><code className="text-blue-700 font-mono">admin@autofleet.com</code> / <code className="text-slate-700 font-mono">admin123</code></span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Staff (2FA Enforced):</span>
                      <span><code className="text-indigo-700 font-mono">staff@autofleet.com</code> / <code className="text-slate-700 font-mono">staff123</code></span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Customer (Direct):</span>
                      <span><code className="text-emerald-700 font-mono">john.doe@example.com</code> / <code className="text-slate-700 font-mono">customer123</code></span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying Account...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@example.com"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Driver's License #</label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={drivingLicense}
                          onChange={(e) => setDrivingLicense(e.target.value)}
                          placeholder="DL-9482710"
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Main Street, City, State"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
                  >
                    {isLoading ? 'Creating Account...' : 'Complete Registration'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
