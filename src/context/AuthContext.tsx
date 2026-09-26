import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AdminUser } from '../types.js';
import { api } from '../services/api.js';
import { X, CheckCircle2, AlertCircle, Bell, Info } from 'lucide-react';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  admin: AdminUser | null;
  activeMode: 'admin' | 'user';
  setActiveMode: (mode: 'admin' | 'user') => void;
  isLoading: boolean;
  concurrentKicked: boolean;
  setConcurrentKicked: (kicked: boolean) => void;
  refreshUser: () => Promise<void>;
  loginUser: (identifier: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (username: string, phone: string, email?: string, referralCode?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  loginAdmin: (email: string, pass?: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [activeMode, setActiveMode] = useState<'admin' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('admin') === '1' || params.get('mode') === 'admin' || window.location.pathname.startsWith('/admin')) {
        return 'admin';
      }
    }
    return 'user';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const [concurrentKicked, setConcurrentKicked] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    // Keep only the single most recent toast to prevent toast stacking
    setToasts([{ id, message, type }]);
    // Give error messages 8 seconds so client can read full detailed message properly
    const duration = type === 'error' ? 8000 : 3500;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getCurrentUser();
      if (res?.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      if (err?.code === 'CONCURRENT_LOGIN_KICKED') {
        setUser(null);
        api.clearUserSession();
        setConcurrentKicked(true);
      } else {
        console.error('Failed to refresh user', err);
      }
    }
  }, []);

  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 Hours Auto-logout limit

  // Track user activity to support idle / last-active timestamp
  useEffect(() => {
    if (!user) return;
    const handleActivity = () => {
      api.touchLastActive();
    };

    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Load user session if stored in local storage
        const savedUid = api.getUserUid();
        const sessionToken = api.getSessionToken();
        if (savedUid && sessionToken) {
          try {
            const userRes = await api.checkSession();
            if (userRes?.valid && userRes?.user) {
              setUser(userRes.user);
            } else {
              api.clearUserSession();
              setUser(null);
            }
          } catch (e: any) {
            if (e?.code === 'CONCURRENT_LOGIN_KICKED') {
              setConcurrentKicked(true);
            }
            api.clearUserSession();
            setUser(null);
          }
        } else {
          // No saved credentials -> User must log in first!
          api.clearUserSession();
          setUser(null);
        }

        // Load admin session if token exists
        const savedToken = api.getAdminToken();
        if (savedToken) {
          try {
            const adminRes = await api.getAdminMe();
            if (adminRes?.admin) {
              setAdmin(adminRes.admin);
            } else {
              api.setAdminToken('');
            }
          } catch {
            api.setAdminToken('');
          }
        }
      } catch (err) {
        console.error('Auth initialization error', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Periodic heartbeat session check & 12-hour expiration guard
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        // Enforce 12-hour auto-logout limit in real-time
        const sessionStartTime = api.getSessionStartTime();
        if (sessionStartTime && (Date.now() - sessionStartTime > TWELVE_HOURS_MS)) {
          setUser(null);
          api.clearUserSession();
          showToast('Session expired after 12 hours. Please log in again.', 'info');
          return;
        }

        const res = await api.checkSession();
        if (!res?.valid) {
          setUser(null);
          api.clearUserSession();
        } else if (res?.user) {
          // Sync live wallet balance and profile in background
          setUser((prev) => {
            if (!prev) return res.user;
            // Only trigger re-render if something actually changed
            if (
              prev.walletBalance !== res.user.walletBalance ||
              prev.status !== res.user.status ||
              prev.totalDeposit !== res.user.totalDeposit ||
              prev.totalWithdrawal !== res.user.totalWithdrawal
            ) {
              return { ...prev, ...res.user };
            }
            return prev;
          });
        }
      } catch (err: any) {
        if (err?.code === 'CONCURRENT_LOGIN_KICKED' || err?.status === 401) {
          setUser(null);
          api.clearUserSession();
          if (err?.code === 'SESSION_EXPIRED_12H') {
            showToast('Session expired after 12 hours. Please log in again.', 'info');
          } else {
            setConcurrentKicked(true);
          }
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [user?.uid]);

  const loginUser = async (identifier: string, pass?: string) => {
    setConcurrentKicked(false);
    try {
      const res = await api.loginUser(identifier, pass);
      if (res?.user) {
        api.setSessionStartTime(Date.now());
        setUser(res.user);
        showToast(`Welcome back, ${res.user.username}!`, 'success');
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      return { success: false, error: err.message };
    }
  };

  const registerUser = async (username: string, phone: string, email?: string, referralCode?: string, password?: string) => {
    setConcurrentKicked(false);
    try {
      const res = await api.registerUser(username, phone, email, referralCode, password);
      if (res?.success) {
        showToast('Registration successful! Please log in with your credentials.', 'success');
        return { success: true, phone: res.phone || phone };
      }
      return { success: false, error: res?.error || 'Registration failed' };
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
      return { success: false, error: err.message };
    }
  };

  const logoutUser = () => {
    api.logoutUser();
    setUser(null);
    showToast('Logged out of player account', 'info');
  };

  const loginAdmin = async (email: string, pass?: string) => {
    try {
      const res = await api.loginAdmin(email, pass);
      if (res?.admin) {
        setAdmin(res.admin);
        showToast(`Admin authorized as ${res.admin.username} (${res.admin.role.toUpperCase()})`, 'success');
        return { success: true };
      }
      return { success: false, error: 'Admin login failed' };
    } catch (err: any) {
      showToast(err.message || 'Admin credentials invalid', 'error');
      return { success: false, error: err.message };
    }
  };

  const logoutAdmin = () => {
    setAdmin(null);
    localStorage.removeItem('wingo_admin_token');
    showToast('Admin logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        activeMode,
        setActiveMode,
        isLoading,
        concurrentKicked,
        setConcurrentKicked,
        refreshUser,
        loginUser,
        registerUser,
        logoutUser,
        loginAdmin,
        logoutAdmin,
        showToast,
      }}
    >
      {children}
      {/* Global Toast Notification (Fully Readable Popup with Multi-line Support) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[99999] flex flex-col max-w-[94vw] sm:max-w-md w-full pointer-events-none px-2 sm:px-0">
        {toasts.slice(0, 1).map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-[#131724]/98 backdrop-blur-md border ${
              t.type === 'success'
                ? 'border-emerald-500/60 shadow-[0_8px_30px_rgba(16,185,129,0.25)]'
                : t.type === 'error'
                ? 'border-rose-500/70 shadow-[0_8px_30px_rgba(244,63,94,0.3)]'
                : 'border-amber-400/60 shadow-[0_8px_30px_rgba(0,0,0,0.7)]'
            } rounded-2xl p-3.5 flex items-start justify-between gap-3 text-white transition-all duration-300 transform scale-100 shadow-2xl`}
          >
            {/* Notification Content */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : t.type === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                ) : (
                  <Bell className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase font-bold tracking-wider mb-0.5 text-zinc-400">
                  {t.type === 'error' ? 'Notice / Alert' : t.type === 'success' ? 'Success' : 'Notification'}
                </div>
                <div className="text-xs text-zinc-100 font-medium leading-relaxed break-words whitespace-pre-line">
                  {t.message}
                </div>
              </div>
            </div>

            {/* Right: Close × Button */}
            <button
              onClick={() => setToasts([])}
              className="p-1 rounded-lg hover:bg-white/20 text-zinc-400 hover:text-white transition shrink-0 active:scale-95 ml-1 mt-0.5"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
