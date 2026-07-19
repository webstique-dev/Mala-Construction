import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lookupService } from '../services/lookupService';

export function useCreateProfession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => lookupService.createProfession(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookups', 'professions'] });
    },
  });
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => lookupService.createMaterialCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookups', 'materialCategories'] });
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name) => lookupService.createExpenseCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookups', 'expenseCategories'] });
    },
  });
}
