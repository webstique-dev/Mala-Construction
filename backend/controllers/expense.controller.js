const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../middleware/errorHandler');

const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user, req.file, req);
  res.status(201).json({ success: true, data: expense });
});

const listExpenses = asyncHandler(async (req, res) => {
  const result = await expenseService.listExpenses(req.query, req.user);
  res.json({ success: true, ...result });
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id, req.user);
  res.json({ success: true, data: expense });
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.body, req.user, req.file, req);
  res.json({ success: true, data: expense });
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id, req.user, req);
  res.json({ success: true, message: 'Expense deleted' });
});

const restoreExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.restoreExpense(req.params.id, req.user, req);
  res.json({ success: true, data: expense });
});

const approveExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.approveExpense(req.params.id, req.user, req);
  res.json({ success: true, data: expense });
});

const rejectExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.rejectExpense(req.params.id, req.user, req);
  res.json({ success: true, data: expense });
});

module.exports = {
  createExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
  approveExpense,
  rejectExpense,
};
