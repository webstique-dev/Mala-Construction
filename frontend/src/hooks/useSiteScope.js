import { ROLES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

/** Returns the site ID to use in forms/queries based on role. */
export function useSiteScope(selectedSiteId) {
  const { role, assignedSite } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const siteId = isSuperAdmin ? selectedSiteId : assignedSite?._id ?? assignedSite;
  return { isSuperAdmin, siteId, assignedSite };
}
