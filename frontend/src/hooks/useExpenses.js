import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../services/expenseService';
import { QUERY_KEYS } from '../constants';

export function useExpenses(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXPENSES, params],
    queryFn: () => expenseService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, receiptFile }) => expenseService.create(payload, receiptFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, receiptFile }) => expenseService.update(id, payload, receiptFile),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useRestoreExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseService.restore,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseService.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: expenseService.reject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSES] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}
