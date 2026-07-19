const express = require('express');
const router = express.Router();

const siteAdminController = require('../controllers/siteAdmin.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');
const {
  createSiteAdminSchema,
  updateSiteAdminSchema,
  setStatusSchema,
  reassignSiteSchema,
  listSiteAdminsQuerySchema,
  idParamSchema,
} = require('../validators/siteAdmin.validators');

router.use(authenticate, authorize('super_admin'));

router.post(
  '/',
  imageUpload.single('photo'),
  validate({ body: createSiteAdminSchema }),
  siteAdminController.createSiteAdmin
);
router.get('/', validate({ query: listSiteAdminsQuerySchema }), siteAdminController.listSiteAdmins);
router.get('/:id', validate({ params: idParamSchema }), siteAdminController.getSiteAdmin);
router.put(
  '/:id',
  imageUpload.single('photo'),
  validate({ params: idParamSchema, body: updateSiteAdminSchema }),
  siteAdminController.updateSiteAdmin
);
router.post('/:id/reset-password', validate({ params: idParamSchema }), siteAdminController.resetPassword);
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: setStatusSchema }),
  siteAdminController.setStatus
);
router.patch(
  '/:id/reassign-site',
  validate({ params: idParamSchema, body: reassignSiteSchema }),
  siteAdminController.reassignSite
);
router.delete('/:id', validate({ params: idParamSchema }), siteAdminController.deleteSiteAdmin);
router.post('/:id/restore', validate({ params: idParamSchema }), siteAdminController.restoreSiteAdmin);

module.exports = router;
