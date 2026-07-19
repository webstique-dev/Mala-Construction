import { useQuery } from '@tanstack/react-query';
import { lookupService } from '../services/lookupService';

export function useLookups(siteId) {
  const professions = useQuery({ queryKey: ['lookups', 'professions'], queryFn: lookupService.professions, staleTime: 300000 });
  const materialCategories = useQuery({ queryKey: ['lookups', 'materialCategories'], queryFn: lookupService.materialCategories, staleTime: 300000 });
  const expenseCategories = useQuery({ queryKey: ['lookups', 'expenseCategories'], queryFn: lookupService.expenseCategories, staleTime: 300000 });
  const suppliers = useQuery({ queryKey: ['lookups', 'suppliers', siteId], queryFn: () => lookupService.suppliers(siteId), enabled: !!siteId, staleTime: 60000 });
  const activeSites = useQuery({ queryKey: ['lookups', 'sites'], queryFn: lookupService.activeSites, staleTime: 60000 });

  return { professions, materialCategories, expenseCategories, suppliers, activeSites };
}
