import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { QUERY_KEYS } from '../constants';

const PAYMENTS_KEY = 'payments';

export function usePayments(params) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, params],
    queryFn: () => paymentService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, receiptFile }) => paymentService.create(payload, receiptFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.WORKERS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, receiptFile }) => paymentService.update(id, payload, receiptFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}

export function useRestorePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentService.restore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
    },
  });
}
