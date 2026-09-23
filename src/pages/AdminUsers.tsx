import React, { useState, useEffect } from 'react';
import { Customer, User, SecurityAuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Plus,
  Mail,
  Phone,
  FileText,
  DollarSign,
  X,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Clock,
  Activity,
  Lock
} from 'lucide-react';

export function AdminUsers() {
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'customers' | 'users' | 'security'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [logFilter, setLogFilter] = useState<string>('all');

  // Add staff modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, userRes, secRes] = await Promise.all([
        authFetch('/api/customers'),
        authFetch('/api/users'),
        authFetch('/api/admin/security-logs')
      ]);

      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }

      if (secRes.ok) {
        const secData = await secRes.json();
        setSecurityLogs(secData);
      }
    } catch (err) {
      console.error('Failed to load customers, users or security logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await authFetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || `Role updated to ${newRole}`, 'Role Changed');
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to update role', 'Error');
      }
    } catch (err) {
      showToast('error', 'Network error changing user role', 'Error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, fullName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `Created ${role.toUpperCase()} account for ${email}. 2FA verification will be enforced on login.`, 'Account Created');
        setIsModalOpen(false);
        setEmail('');
        setPassword('');
        setFullName('');
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to create user', 'Error');
      }
    } catch (err) {
      showToast('error', 'Network error creating user', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase().trim();
    return (
      !term ||
      c.full_name.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.driving_license.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  });

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase().trim();
    return !term || u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term);
  });

  const filteredSecurityLogs = securityLogs.filter((log) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      log.email.toLowerCase().includes(term) ||
      log.event_type.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (logFilter === 'all') return true;
    if (logFilter === 'verified') return log.event_type === '2FA_VERIFIED_SUCCESS';
    if (logFilter === 'challenge') return log.event_type === '2FA_CHALLENGE_ISSUED';
    if (logFilter === 'failed') return log.event_type === 'LOGIN_FAILED' || log.event_type === '2FA_FAILED';
    if (logFilter === 'ratelimit') return log.event_type === 'RATE_LIMITED';
    return true;
  });

  // Security metrics
  const verified2FACount = securityLogs.filter((l) => l.event_type === '2FA_VERIFIED_SUCCESS').length;
  const failedAttemptsCount = securityLogs.filter((l) => l.event_type === 'LOGIN_FAILED' || l.event_type === '2FA_FAILED').length;
  const rateLimitedCount = securityLogs.filter((l) => l.event_type === 'RATE_LIMITED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer, Staff & Security Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authenticated accounts, audit verified driving credentials, and inspect multi-factor security logs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Refresh Data & Security Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff or Admin</span>
          </button>
        </div>
      </div>

      {/* Security Status Highlight Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Privileged Multi-Factor Security (2FA) Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Enforced
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Elevated roles (<code className="text-blue-300">admin</code> & <code className="text-indigo-300">staff</code>) require 6-digit cryptographic security passcodes before access is granted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/10 text-center">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-sans">2FA Authorizations</div>
              <div className="text-base font-bold text-emerald-400">{verified2FACount}</div>
            </div>
            <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/10 text-center">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-sans">Security Intercepts</div>
              <div className="text-base font-bold text-amber-400">{failedAttemptsCount}</div>
            </div>
            <div className="bg-white/10 px-3 py-2 rounded-lg border border-white/10 text-center">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-sans">Brute Lockouts</div>
              <div className="text-base font-bold text-rose-400">{rateLimitedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tab switch */}
        <div className="flex rounded-lg bg-slate-100 p-1 w-full sm:w-auto text-xs">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-1.5 font-semibold rounded-md transition-colors ${
              activeTab === 'customers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Registered Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 font-semibold rounded-md transition-colors ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All System Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'security' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security & 2FA Audit ({securityLogs.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'security'
                ? 'Search audit event, IP, email...'
                : 'Search by name, license, email...'
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'customers' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Driver's License</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Total Bookings</th>
                  <th className="py-3 px-4">Completed Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading customer directory...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No matching customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cust.full_name}</div>
                        <div className="text-[11px] text-slate-500">{cust.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {cust.driving_license || 'Unverified'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                        {cust.address || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {cust.total_bookings || 0}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">
                        ${((cust.total_spent || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'users' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">User Account</th>
                  <th className="py-3 px-4">Role & Privileges</th>
                  <th className="py-3 px-4">2FA Security Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Role Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.email}</div>
                        <div className="text-[11px] text-slate-500">User ID #{u.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            u.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : u.role === 'staff'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <Shield className="w-3 h-3 text-blue-600" />
                          ) : u.role === 'staff' ? (
                            <Users className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <UserCheck className="w-3 h-3 text-slate-500" />
                          )}
                          <span className="capitalize">{u.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.role === 'admin' || u.role === 'staff' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Enforced 2FA Token</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Standard Login</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-700"
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Rental Staff</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'security' && (
            <div>
              {/* Filter pills */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold mr-1">Filter Audit Events:</span>
                {[
                  { key: 'all', label: `All Events (${securityLogs.length})` },
                  { key: 'verified', label: '2FA Authorizations' },
                  { key: 'challenge', label: 'Challenges Issued' },
                  { key: 'failed', label: 'Failed Attempts' },
                  { key: 'ratelimit', label: 'Rate Limits & Lockouts' }
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setLogFilter(item.key)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      logFilter === item.key
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Account / Role</th>
                    <th className="py-3 px-4">Client IP / Terminal</th>
                    <th className="py-3 px-4">Security Details</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                        Loading security audit logs...
                      </td>
                    </tr>
                  ) : filteredSecurityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                        No security audit records matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSecurityLogs.map((log) => {
                      const isSuccess = log.event_type.includes('SUCCESS');
                      const isFail = log.event_type.includes('FAILED');
                      const isChallenge = log.event_type.includes('CHALLENGE');
                      const isRateLimit = log.event_type.includes('RATE_LIMITED');

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-sans">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isSuccess
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isFail
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isRateLimit
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {isSuccess ? (
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              ) : isFail ? (
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                              ) : isRateLimit ? (
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                              ) : (
                                <KeyRound className="w-3 h-3 text-blue-600" />
                              )}
                              <span>{log.event_type}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <div className="font-semibold text-slate-900">{log.email}</div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                              Role: [{log.role}]
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span>{log.ip_address || '127.0.0.1'}</span>
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-700 max-w-sm">
                            {log.details || '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-sans">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Staff / Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Provision Staff or Admin Account</h3>
                  <p className="text-[11px] text-slate-500">2FA Security will be enforced</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Operations Coordinator"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@autofleet.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="staff">Rental Staff (Booking, Dispatch & Check-in)</option>
                  <option value="admin">System Administrator (Full Privileges & Pricing Control)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Security Notice:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Both Staff and Admin roles are granted elevated privileges. Once created, logging into this account will automatically require multi-factor 2FA verification.
                </p>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
