const workerPaymentRepository = require('../repositories/workerPayment.repository');
const Worker = require('../models/Worker');
const { calculateNetSalary } = require('../utils/calculations');
const { resolveSiteScope, assertSiteAccess } = require('../utils/siteScope');
const { buildPaginatedResult, buildSort, buildDateRangeFilter } = require('../utils/pagination');
const { uploadBuffer, deleteAsset } = require('./uploadService');
const { recordActivity } = require('./auditLogService');
const { createNotification } = require('../utils/notificationCreator');
const ApiError = require('../utils/ApiError');

async function createPayment(data, actor, file, req) {
  assertSiteAccess(actor, data.site);

  const worker = await Worker.findById(data.worker);
  if (!worker) throw ApiError.notFound('Worker not found');
  if (worker.site.toString() !== data.site.toString()) {
    throw ApiError.badRequest('Worker does not belong to the selected site');
  }

  const netSalary = calculateNetSalary(data);

  let receiptPdf = null;
  if (file) {
    receiptPdf = await uploadBuffer(file.buffer, 'mala-erp/payments/receipts', file.mimetype === 'application/pdf' ? 'raw' : 'image');
  }

  const payment = await workerPaymentRepository.create({
    site: data.site,
    worker: data.worker,
    workingDays: data.workingDays,
    dailyWage: data.dailyWage,
    overtimeAmount: data.overtimeAmount ?? 0,
    bonus: data.bonus ?? 0,
    advance: data.advance ?? 0,
    deduction: data.deduction ?? 0,
    netSalary,
    status: data.status ?? 'paid',
    paymentMethod: data.paymentMethod ?? 'cash',
    paidOn: data.paidOn,
    periodStart: data.paidOn,
    periodEnd: data.paidOn,
    receiptPdf,
    remarks: data.remarks,
    createdBy: actor._id,
  });

  await recordActivity({
    actor, action: 'create', entityType: 'WorkerPayment', entityId: payment._id, site: data.site, after: payment.toObject(), req,
  });

  await createNotification({
    recipient: null,
    type: 'worker_payment',
    title: 'Worker Wages Logged',
    message: `${actor.name} recorded salary of ₹${netSalary.toLocaleString('en-IN')} for ${worker.name} (${data.workingDays} working days).`,
    relatedEntity: { kind: 'WorkerPayment', id: payment._id },
    site: data.site
  });

  return workerPaymentRepository.findById(payment._id);
}

async function listPayments(queryParams, actor) {
  const { page, limit, worker, status, startDate, endDate, sortBy, sortOrder, siteId, showDeleted } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const query = {
    ...siteFilter,
    ...(worker && { worker }),
    ...(status && { status }),
    ...buildDateRangeFilter(startDate, endDate, 'paidOn'),
  };

  const sort = buildSort(sortBy, sortOrder, ['paidOn', 'netSalary', 'createdAt'], 'paidOn');
  const { items, total } = await workerPaymentRepository.findAll(query, { page, limit, sort }, showDeleted === 'true' || showDeleted === true);
  return buildPaginatedResult(items, total, page, limit);
}

async function getPaymentById(id, actor) {
  const payment = await workerPaymentRepository.findById(id);
  if (!payment) throw ApiError.notFound('Payment not found');
  assertSiteAccess(actor, payment.site._id ?? payment.site);
  return payment;
}

async function updatePayment(id, data, actor, file, req) {
  const before = await getPaymentById(id, actor);

  const merged = {
    workingDays: data.workingDays ?? before.workingDays,
    dailyWage: data.dailyWage ?? before.dailyWage,
    overtimeAmount: data.overtimeAmount ?? before.overtimeAmount,
    bonus: data.bonus ?? before.bonus,
    advance: data.advance ?? before.advance,
    deduction: data.deduction ?? before.deduction,
  };
  data.netSalary = calculateNetSalary(merged);

  if (file) {
    if (before.receiptPdf?.publicId) await deleteAsset(before.receiptPdf.publicId);
    data.receiptPdf = await uploadBuffer(
      file.buffer,
      'mala-erp/payments/receipts',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const updated = await workerPaymentRepository.updateById(id, data);
  await recordActivity({
    actor, action: 'update', entityType: 'WorkerPayment', entityId: id,
    site: before.site._id ?? before.site, before: before.toObject(), after: updated.toObject(), req,
  });
  return updated;
}

async function deletePayment(id, actor, req) {
  const payment = await getPaymentById(id, actor);
  // Soft delete the payment
  await workerPaymentRepository.softDelete(id, actor);
  await recordActivity({
    actor,
    action: 'delete',
    entityType: 'WorkerPayment',
    entityId: id,
    site: payment.site._id ?? payment.site,
    before: payment.toObject(),
    req,
  });
}

async function restorePayment(id, actor, req) {
  const payment = await workerPaymentRepository.findById(id, true); // Include deleted
  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }
  if (!payment.isDeleted) {
    throw ApiError.badRequest('Payment is not deleted');
  }

  const restored = await workerPaymentRepository.restore(id);
  await recordActivity({
    actor,
    action: 'restore',
    entityType: 'WorkerPayment',
    entityId: id,
    site: payment.site._id ?? payment.site,
    after: restored.toObject(),
    req,
  });
  return restored;
}

module.exports = { createPayment, listPayments, getPaymentById, updatePayment, deletePayment, restorePayment };
