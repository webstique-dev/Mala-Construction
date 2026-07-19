import { useQuery } from '@tanstack/react-query';
import { activityLogService } from '../services/activityLogService';

const ACTIVITY_LOGS_KEY = 'activityLogs';

export function useActivityLogs(params) {
  return useQuery({
    queryKey: [ACTIVITY_LOGS_KEY, params],
    queryFn: () => activityLogService.list(params),
    placeholderData: (prev) => prev,
    refetchInterval: 10000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

