const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expense.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { documentUpload } = require('../middleware/upload');
const {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  idParamSchema,
} = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.post('/', documentUpload.single('receipt'), validate({ body: createExpenseSchema }), expenseController.createExpense);
router.get('/', validate({ query: listExpensesQuerySchema }), expenseController.listExpenses);
router.get('/:id', validate({ params: idParamSchema }), expenseController.getExpense);
router.put(
  '/:id',
  documentUpload.single('receipt'),
  validate({ params: idParamSchema, body: updateExpenseSchema }),
  expenseController.updateExpense
);
router.delete('/:id', validate({ params: idParamSchema }), expenseController.deleteExpense);
router.post('/:id/restore', validate({ params: idParamSchema }), expenseController.restoreExpense);
router.patch('/:id/approve', authorize('super_admin'), validate({ params: idParamSchema }), expenseController.approveExpense);
router.patch('/:id/reject', authorize('super_admin'), validate({ params: idParamSchema }), expenseController.rejectExpense);

module.exports = router;
