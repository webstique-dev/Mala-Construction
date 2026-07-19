import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useTheme();

  const updateUser = useCallback((nextUser) => {
    setUser((currentUser) => {
      if (!currentUser) return nextUser;
      if (typeof nextUser === 'function') return nextUser(currentUser);
      return { ...currentUser, ...nextUser, photo: nextUser?.photo ?? currentUser.photo };
    });
  }, []);

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
        console.warn("Could not load user settings on startup:", settingsErr);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // apiClient dispatches this when a refresh attempt fails - session is truly over.
  useEffect(() => {
    const handleSessionExpired = () => setUser(null);
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

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
      console.warn("Could not load user settings after login:", settingsErr);
    }

    return data;
  }, [setTheme]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    role: user?.role ?? null,
    assignedSite: user?.assignedSite ?? null,
    login,
    logout,
    refreshUser: loadCurrentUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
