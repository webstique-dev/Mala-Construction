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
