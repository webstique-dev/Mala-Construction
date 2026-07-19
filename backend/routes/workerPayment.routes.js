const express = require('express');
const router = express.Router();

const workerPaymentController = require('../controllers/workerPayment.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { documentUpload } = require('../middleware/upload');
const {
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsQuerySchema,
  idParamSchema,
} = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.post('/', documentUpload.single('receipt'), validate({ body: createPaymentSchema }), workerPaymentController.createPayment);
router.get('/', validate({ query: listPaymentsQuerySchema }), workerPaymentController.listPayments);
router.get('/:id', validate({ params: idParamSchema }), workerPaymentController.getPayment);
router.put(
  '/:id',
  documentUpload.single('receipt'),
  validate({ params: idParamSchema, body: updatePaymentSchema }),
  workerPaymentController.updatePayment
);
router.delete('/:id', validate({ params: idParamSchema }), workerPaymentController.deletePayment);
router.post('/:id/restore', validate({ params: idParamSchema }), workerPaymentController.restorePayment);

module.exports = router;
