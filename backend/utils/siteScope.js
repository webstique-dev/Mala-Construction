const ApiError = require('./ApiError');

/**
 * Resolves the site filter for list/query endpoints based on the caller's role.
 * Super Admin may optionally filter by siteId; Site Admin is always scoped to assignedSite.
 */
function resolveSiteScope(user, querySiteId) {
  if (user.role === 'super_admin') {
    return querySiteId ? { site: querySiteId } : {};
  }

  const assigned = user.assignedSite?.toString();
  if (!assigned) throw ApiError.forbidden('No site assigned to your account');

  if (querySiteId && querySiteId !== assigned) {
    throw ApiError.forbidden('You do not have access to this site');
  }

  return { site: user.assignedSite };
}

/** Ensures a Site Admin can only mutate records for their assigned site. */
function assertSiteAccess(user, siteId) {
  if (user.role === 'super_admin') return;
  const assigned = user.assignedSite?.toString();
  if (!assigned || assigned !== siteId?.toString()) {
    throw ApiError.forbidden('You do not have access to this site');
  }
}

module.exports = { resolveSiteScope, assertSiteAccess };
