const express = require('express');
const router = express.Router();

const siteController = require('../controllers/site.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createSiteSchema,
  updateSiteSchema,
  listSitesQuerySchema,
  idParamSchema,
} = require('../validators/site.validators');

// Every route here is Super Admin only - Site Admins have no access to Site management at all (per RBAC table).
router.use(authenticate, authorize('super_admin'));

router.post('/', validate({ body: createSiteSchema }), siteController.createSite);
router.get('/', validate({ query: listSitesQuerySchema }), siteController.listSites);
router.get('/:id', validate({ params: idParamSchema }), siteController.getSite);
router.put('/:id', validate({ params: idParamSchema, body: updateSiteSchema }), siteController.updateSite);
router.patch('/:id/archive', validate({ params: idParamSchema }), siteController.archiveSite);
router.delete('/:id', validate({ params: idParamSchema }), siteController.deleteSite);
router.post('/:id/restore', validate({ params: idParamSchema }), siteController.restoreSite);

module.exports = router;
