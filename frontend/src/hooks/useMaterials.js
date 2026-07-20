import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialService } from '../services/materialService';
import { QUERY_KEYS } from '../constants';

export function useMaterials(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.MATERIALS, params],
    queryFn: () => materialService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, invoiceFile }) => materialService.create(payload, invoiceFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, invoiceFile }) => materialService.update(id, payload, invoiceFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: materialService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useRestoreMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: materialService.restore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.MATERIALS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}
