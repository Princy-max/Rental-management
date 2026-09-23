import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, TwoFactorChallenge } from '../types';
import { useToast } from './ToastContext';

export interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  challenge?: TwoFactorChallenge;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  active2FAChallenge: TwoFactorChallenge | null;
  setActive2FAChallenge: (challenge: TwoFactorChallenge | null) => void;
  login: (email: string, pass: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<boolean>;
  resend2FA: (tempToken: string) => Promise<{ success: boolean; securityCode?: string; expiresInSeconds?: number }>;
  register: (data: { email: string; password: string; fullName: string; phone: string; drivingLicense: string; address?: string }) => Promise<boolean>;
  demoLogin: (role: UserRole, bypass2FA?: boolean) => Promise<LoginResult>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('autofleet_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [active2FAChallenge, setActive2FAChallenge] = useState<TwoFactorChallenge | null>(null);
  const { showToast } = useToast();

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('autofleet_token');
        setToken(null);
        setUser(null);
      }
      return res;
    },
    [token]
  );

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('autofleet_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching me profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, authFetch]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Login failed', 'Authentication');
        return { success: false, error: data.error };
      }

      // Check if Admin/Staff 2FA is triggered
      if (data.requires2FA) {
        setActive2FAChallenge(data);
        showToast('info', 'Privileged personnel security verification code required.', 'Extra Security');
        return { success: true, requires2FA: true, challenge: data };
      }

      localStorage.setItem('autofleet_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setActive2FAChallenge(null);
      showToast('success', `Welcome back, ${data.user.fullName || data.user.email}!`, 'Signed In');
      return { success: true };
    } catch (err: any) {
      showToast('error', 'Network error while attempting to sign in', 'Error');
      return { success: false, error: 'Network error' };
    }
  };

  const verify2FA = async (tempToken: string, code: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Verification code failed', 'Security Verification');
        return false;
      }

      localStorage.setItem('autofleet_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setActive2FAChallenge(null);
      showToast('success', `Identity Verified! Session granted for ${data.user.fullName || data.user.email}.`, '2FA Authorized');
      return true;
    } catch (err: any) {
      showToast('error', 'Network error during security code verification', 'Error');
      return false;
    }
  };

  const resend2FA = async (tempToken: string): Promise<{ success: boolean; securityCode?: string; expiresInSeconds?: number }> => {
    try {
      const res = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Failed to reissue code', 'Error');
        return { success: false };
      }

      if (active2FAChallenge) {
        setActive2FAChallenge({
          ...active2FAChallenge,
          securityCode: data.securityCode,
          expiresInSeconds: data.expiresInSeconds
        });
      }

      showToast('info', 'New 6-digit security code generated for your session.', 'Security Passcode');
      return { success: true, securityCode: data.securityCode, expiresInSeconds: data.expiresInSeconds };
    } catch (err) {
      showToast('error', 'Network error reissuing security code', 'Error');
      return { success: false };
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    drivingLicense: string;
    address?: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (!res.ok) {
        showToast('error', resData.error || 'Registration failed', 'Error');
        return false;
      }

      localStorage.setItem('autofleet_token', resData.token);
      setToken(resData.token);
      setUser(resData.user);
      showToast('success', 'Account created successfully! Welcome to AutoFleet.', 'Registration');
      return true;
    } catch (err: any) {
      showToast('error', 'Network error during registration', 'Error');
      return false;
    }
  };

  const demoLogin = async (role: UserRole, bypass2FA = false): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, bypass2FA })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Demo login failed', 'Error');
        return { success: false, error: data.error };
      }

      // Check if Admin/Staff 2FA challenge is issued
      if (data.requires2FA) {
        setActive2FAChallenge(data);
        showToast('info', `Security check: ${role.toUpperCase()} verification code required.`, 'Extra Security Verification');
        return { success: true, requires2FA: true, challenge: data };
      }

      localStorage.setItem('autofleet_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setActive2FAChallenge(null);
      showToast('success', `Logged in as ${role.toUpperCase()}: ${data.user.fullName}`, 'Role Switcher');
      return { success: true };
    } catch (err: any) {
      showToast('error', 'Failed to connect to demo account', 'Error');
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('autofleet_token');
    setToken(null);
    setUser(null);
    setActive2FAChallenge(null);
    showToast('info', 'You have been signed out.', 'Sign Out');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        active2FAChallenge,
        setActive2FAChallenge,
        login,
        verify2FA,
        resend2FA,
        register,
        demoLogin,
        logout,
        refreshProfile,
        authFetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
