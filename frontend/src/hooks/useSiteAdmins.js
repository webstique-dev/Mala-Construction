import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { siteAdminService } from '../services/siteAdminService';
import { QUERY_KEYS } from '../constants';

export function useSiteAdmins(params) {
  return useQuery({
    queryKey: [QUERY_KEYS.SITE_ADMINS, params],
    queryFn: () => siteAdminService.list(params),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateSiteAdmins() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITE_ADMINS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] }); // assignedSiteAdmin changes on Sites too
  };
}

export function useCreateSiteAdmin() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({ mutationFn: siteAdminService.create, onSuccess: invalidate });
}

export function useUpdateSiteAdmin() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({
    mutationFn: ({ id, data }) => siteAdminService.update(id, data),
    onSuccess: invalidate,
  });
}

export function useResetSiteAdminPassword() {
  return useMutation({ mutationFn: siteAdminService.resetPassword });
}

export function useSetSiteAdminStatus() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({
    mutationFn: ({ id, status }) => siteAdminService.setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useReassignSiteAdmin() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({
    mutationFn: ({ id, siteId }) => siteAdminService.reassignSite(id, siteId),
    onSuccess: invalidate,
  });
}

export function useDeleteSiteAdmin() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({
    mutationFn: siteAdminService.remove,
    onSuccess: invalidate,
  });
}

export function useRestoreSiteAdmin() {
  const invalidate = useInvalidateSiteAdmins();
  return useMutation({
    mutationFn: siteAdminService.restore,
    onSuccess: invalidate,
  });
}
