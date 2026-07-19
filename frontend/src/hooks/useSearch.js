import { useQuery } from '@tanstack/react-query';
import { searchService } from '../services/searchService';
import { useDebouncedValue } from './useDebouncedValue';

export function useGlobalSearch(query, siteId) {
  const debounced = useDebouncedValue(query, 350);
  return useQuery({
    queryKey: ['search', debounced, siteId],
    queryFn: () => searchService.search({ q: debounced, siteId }),
    enabled: debounced.length >= 2,
  });
}
