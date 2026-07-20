const mongoose = require('mongoose');
const ApiError = require('./ApiError');

/**
 * Resolves the site filter for list/query endpoints based on the caller's role.
 * Super Admin may optionally filter by siteId; Site Admin is always scoped to assignedSite.
 *
 * IMPORTANT: querySiteId is always a plain string from req.query. Mongoose auto-casts
 * strings in find() but NOT in aggregation $match stages. We cast to ObjectId here so
 * the returned filter works correctly in both contexts.
 */
function resolveSiteScope(user, querySiteId) {
  if (user.role === 'super_admin') {
    if (!querySiteId) return {};
    const oid = mongoose.Types.ObjectId.isValid(querySiteId)
      ? new mongoose.Types.ObjectId(querySiteId)
      : querySiteId;
    return { site: oid };
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
