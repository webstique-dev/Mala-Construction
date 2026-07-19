const ApiError = require('../utils/ApiError');

/**
 * Role gate. Usage: authorize('super_admin') or authorize('super_admin', 'site_admin').
 * Must run after `authenticate`.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

/**
 * Site-ownership gate. Super Admin bypasses this check entirely (per spec:
 * "skip the ownership check only for Super Admin"). Site Admin must be
 * assigned to the siteId being requested/mutated.
 *
 * Looks for siteId in, in order: req.params.siteId, req.body.site, req.query.siteId.
 * For nested resources (materials/workers/expenses) that reference a site
 * indirectly, pass an explicit resolver instead, e.g.:
 *   authorizeSiteAccess(async (req) => (await Material.findById(req.params.id))?.site)
 */
function authorizeSiteAccess(resolver) {
  return async (req, res, next) => {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      if (req.user.role === 'super_admin') return next(); // full access, no ownership check

      const requestedSiteId = resolver
        ? await resolver(req)
        : req.params.siteId || req.body.site || req.query.siteId;

      if (!requestedSiteId) {
        return next(ApiError.badRequest('siteId is required for this request'));
      }

      const assignedSiteId = req.user.assignedSite?.toString();
      if (!assignedSiteId || assignedSiteId !== requestedSiteId.toString()) {
        return next(ApiError.forbidden('You do not have access to this site'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authorize, authorizeSiteAccess };
