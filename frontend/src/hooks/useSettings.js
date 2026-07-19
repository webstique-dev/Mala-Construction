import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';

export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: settingsService.getUserSettings
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: settingsService.updateUserSettings,
    onSuccess: (payload) => {
      queryClient.setQueryData(['user-settings'], (current) => {
        if (!current) return current;
        return {
          ...current,
          profile: payload?.profile ?? current.profile,
          settings: payload?.settings ?? current.settings,
          notifications: payload?.notifications ?? current.notifications,
        };
      });
      if (payload?.profile) {
        updateUser(payload.profile);
      }
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: settingsService.getSystemSettings
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsService.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    }
  });
}
