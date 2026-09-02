import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    // Keep only the single most recent toast to prevent toast stacking / duplicate popups
    setToasts([{ id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  const refreshUser = async () => {
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
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Load user session only if explicitly stored in local storage
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

  // Periodic heartbeat session check & balance sync
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
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
          setConcurrentKicked(true);
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
      {/* Global Toast Notification (Compact Single Popup) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[99999] flex flex-col max-w-[92vw] sm:max-w-sm w-auto pointer-events-none">
        {toasts.slice(0, 1).map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-[#131724]/95 backdrop-blur-md border ${
              t.type === 'success'
                ? 'border-emerald-500/50 shadow-[0_8px_25px_rgba(16,185,129,0.2)]'
                : t.type === 'error'
                ? 'border-rose-500/50 shadow-[0_8px_25px_rgba(244,63,94,0.2)]'
                : 'border-amber-400/50 shadow-[0_8px_25px_rgba(0,0,0,0.6)]'
            } rounded-full py-1.5 px-3.5 flex items-center justify-between gap-2.5 text-white transition-all duration-300 transform scale-100 shadow-xl`}
          >
            {/* Notification Content */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0">
                {t.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : t.type === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>
              <span className="text-[11px] text-zinc-100 font-semibold leading-tight line-clamp-1">
                {t.message}
              </span>
            </div>

            {/* Right: Close × Button */}
            <button
              onClick={() => setToasts([])}
              className="p-0.5 rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition shrink-0 active:scale-95 ml-1"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
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
