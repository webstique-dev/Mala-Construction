import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteService } from '../services/siteService';
import { QUERY_KEYS } from '../constants';

export function useSites(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.SITES, params],
    queryFn: () => siteService.list(params),
    placeholderData: (prev) => prev, // keeps old page visible while the next page loads
  });
}

export function useSite(id) {
  return useQuery({
    queryKey: [QUERY_KEYS.SITES, id],
    queryFn: () => siteService.get(id),
    enabled: !!id,
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: siteService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }),
  });
}

export function useUpdateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => siteService.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }),
  });
}

export function useArchiveSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: siteService.archive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }),
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: siteService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }),
  });
}

export function useRestoreSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: siteService.restore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }),
  });
}
