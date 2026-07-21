import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workerService } from '../services/workerService';
import { QUERY_KEYS } from '../constants';

export function useWorkers(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKERS, params],
    queryFn: () => workerService.list(params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Lightweight worker search for the Attendance worker picker.
 * Enabled only when `enabled` is true and `query` has content.
 */
export function useWorkerSearch(query, siteId, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKERS, 'search', { q: query, siteId }],
    queryFn: () => workerService.search({ q: query, siteId, limit: 8 }),
    enabled: enabled && query.trim().length >= 1,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useWorkerProfile(id) {
  return useQuery({
    queryKey: [QUERY_KEYS.WORKERS, 'profile', id],
    queryFn: () => workerService.profile(id),
    enabled: !!id,
  });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, photoFile }) => workerService.create(payload, photoFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.WORKERS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useUpdateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, photoFile }) => workerService.update(id, payload, photoFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.WORKERS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useDeleteWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workerService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.WORKERS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useRestoreWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workerService.restore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.WORKERS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}
