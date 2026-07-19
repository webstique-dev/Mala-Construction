import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../components/modals/ConfirmDialog';
import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';
import { useTheme } from './ThemeContext';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { setTheme } = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();

  const updateUser = useCallback((nextUser) => {
    setUser((currentUser) => {
      if (!currentUser) return nextUser;
      if (typeof nextUser === 'function') return nextUser(currentUser);
      return { ...currentUser, ...nextUser, photo: nextUser?.photo ?? currentUser.photo };
    });
  }, []);

  const clearClientSession = useCallback(() => {
    setUser(null);
    setIsLoading(false);
    queryClient.clear();

    if (typeof window !== 'undefined') {
      document.cookie = 'accessToken=; Max-Age=0; path=/';
      document.cookie = 'refreshToken=; Max-Age=0; path=/api/auth';
      document.cookie = 'refreshToken=; Max-Age=0; path=/';
    }
  }, [queryClient]);

  const finalizeLogout = useCallback(() => {
    clearClientSession();
    setIsLogoutConfirmOpen(false);
    setIsLoggingOut(false);
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }, [clearClientSession]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const { data } = await authService.me();
      setUser(data);

      // Load and apply theme settings from database
      try {
        const settingsPayload = await settingsService.getUserSettings();
        if (settingsPayload?.settings?.theme) {
          const dbTheme = settingsPayload.settings.theme;
          if (dbTheme === 'light' || dbTheme === 'dark') {
            setTheme(dbTheme);
          } else if (dbTheme === 'system') {
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
          }
        }
      } catch (settingsErr) {
        console.warn('Could not load user settings on startup:', settingsErr);
      }
    } catch {
      clearClientSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearClientSession, setTheme]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // apiClient dispatches this when a refresh attempt fails - session is truly over.
  useEffect(() => {
    const handleSessionExpired = () => {
      setIsLogoutConfirmOpen(false);
      clearClientSession();
      toast.error('Your session expired. Please sign in again.');
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [clearClientSession, toast]);

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials);
    setUser(data);

    // Load and apply theme settings from database after login
    try {
      const settingsPayload = await settingsService.getUserSettings();
      if (settingsPayload?.settings?.theme) {
        const dbTheme = settingsPayload.settings.theme;
        if (dbTheme === 'light' || dbTheme === 'dark') {
          setTheme(dbTheme);
        } else if (dbTheme === 'system') {
          const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      }
    } catch (settingsErr) {
      console.warn('Could not load user settings after login:', settingsErr);
    }

    return data;
  }, [setTheme]);

  const requestLogout = useCallback(() => {
    setIsLogoutConfirmOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    if (!isLoggingOut) setIsLogoutConfirmOpen(false);
  }, [isLoggingOut]);

  const logout = useCallback(async (options = {}) => {
    const { skipConfirm = false } = options || {};

    if (!skipConfirm) {
      setIsLogoutConfirmOpen(true);
      return;
    }

    setIsLoggingOut(true);
    setIsLogoutConfirmOpen(false);

    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout request failed. Continuing with local cleanup.', error);
    } finally {
      finalizeLogout();
    }
  }, [finalizeLogout]);

  const confirmLogout = useCallback(async () => {
    await logout({ skipConfirm: true });
  }, [logout]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    role: user?.role ?? null,
    assignedSite: user?.assignedSite ?? null,
    login,
    logout,
    requestLogout,
    cancelLogout,
    confirmLogout,
    isLogoutConfirmOpen,
    isLoggingOut,
    refreshUser: loadCurrentUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Log out?"
        description="You’ll be signed out of this session and returned to the login screen."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        isLoading={isLoggingOut}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
