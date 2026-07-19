import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { QUERY_KEYS } from '../constants';

export function useDashboard(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD, params],
    queryFn: () => dashboardService.get(params),
    refetchInterval: 60000,
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
    staleTime: 30000,
  });
}
