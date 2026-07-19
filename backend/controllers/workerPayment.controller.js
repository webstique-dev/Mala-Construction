const workerPaymentService = require('../services/workerPaymentService');
const { asyncHandler } = require('../middleware/errorHandler');

const createPayment = asyncHandler(async (req, res) => {
  const payment = await workerPaymentService.createPayment(req.body, req.user, req.file, req);
  res.status(201).json({ success: true, data: payment });
});

const listPayments = asyncHandler(async (req, res) => {
  const result = await workerPaymentService.listPayments(req.query, req.user);
  res.json({ success: true, ...result });
});

const getPayment = asyncHandler(async (req, res) => {
  const payment = await workerPaymentService.getPaymentById(req.params.id, req.user);
  res.json({ success: true, data: payment });
});

const updatePayment = asyncHandler(async (req, res) => {
  const payment = await workerPaymentService.updatePayment(req.params.id, req.body, req.user, req.file, req);
  res.json({ success: true, data: payment });
});

const deletePayment = asyncHandler(async (req, res) => {
  await workerPaymentService.deletePayment(req.params.id, req.user, req);
  res.json({ success: true, message: 'Payment deleted' });
});

const restorePayment = asyncHandler(async (req, res) => {
  const payment = await workerPaymentService.restorePayment(req.params.id, req.user, req);
  res.json({ success: true, data: payment });
});

module.exports = { createPayment, listPayments, getPayment, updatePayment, deletePayment, restorePayment };
