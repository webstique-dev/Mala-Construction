const express = require('express');
const router = express.Router();

const materialController = require('../controllers/material.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { documentUpload } = require('../middleware/upload');
const {
  createMaterialSchema,
  updateMaterialSchema,
  listMaterialsQuerySchema,
  idParamSchema,
} = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.post('/', documentUpload.single('invoice'), validate({ body: createMaterialSchema }), materialController.createMaterial);
router.get('/', validate({ query: listMaterialsQuerySchema }), materialController.listMaterials);
router.get('/:id', validate({ params: idParamSchema }), materialController.getMaterial);
router.put(
  '/:id',
  documentUpload.single('invoice'),
  validate({ params: idParamSchema, body: updateMaterialSchema }),
  materialController.updateMaterial
);
router.delete('/:id', validate({ params: idParamSchema }), materialController.deleteMaterial);
router.post('/:id/restore', validate({ params: idParamSchema }), materialController.restoreMaterial);

module.exports = router;
