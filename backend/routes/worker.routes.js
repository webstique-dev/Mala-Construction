const express = require('express');
const router = express.Router();

const workerController = require('../controllers/worker.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');
const {
  createWorkerSchema,
  updateWorkerSchema,
  listWorkersQuerySchema,
  idParamSchema,
} = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.post('/', imageUpload.single('photo'), validate({ body: createWorkerSchema }), workerController.createWorker);
router.get('/', validate({ query: listWorkersQuerySchema }), workerController.listWorkers);
// IMPORTANT: /search must be before /:id to avoid collision
router.get('/search', workerController.searchWorkers);
router.get('/:id/profile', validate({ params: idParamSchema }), workerController.getWorkerProfile);
router.get('/:id', validate({ params: idParamSchema }), workerController.getWorker);
router.put(
  '/:id',
  imageUpload.single('photo'),
  validate({ params: idParamSchema, body: updateWorkerSchema }),
  workerController.updateWorker
);
router.delete('/:id', validate({ params: idParamSchema }), workerController.deleteWorker);
router.post('/:id/restore', validate({ params: idParamSchema }), workerController.restoreWorker);

module.exports = router;
