import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';
import { QUERY_KEYS } from '../constants';

export function useAttendanceList(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, params],
    queryFn: () => attendanceService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAttendanceStats(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, 'stats', params],
    queryFn: () => attendanceService.stats(params),
    placeholderData: (prev) => prev,
  });
}

export function useWeeklyAttendanceReport(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, 'weekly', params],
    queryFn: () => attendanceService.weeklyReport(params),
    placeholderData: (prev) => prev,
  });
}

export function useContractorsList(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, 'contractors', params],
    queryFn: () => attendanceService.contractors(params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Fetches previous day workers for the "Copy Previous Day" modal.
 * Only fires when enabled=true (triggered by button click).
 */
export function usePreviousDayWorkers(params, enabled = false) {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE, 'previous-day-workers', params],
    queryFn: () => attendanceService.previousDayWorkers(params),
    enabled: enabled && !!params?.siteId && !!params?.date,
    staleTime: 60_000,
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.record,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useBatchRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.batchRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => attendanceService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.ATTENDANCE] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.REPORTS] });
    },
  });
}

