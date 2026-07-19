const expenseRepository = require('../repositories/expense.repository');
const { resolveSiteScope, assertSiteAccess } = require('../utils/siteScope');
const { buildPaginatedResult, buildSort, buildTextSearchFilter, buildDateRangeFilter } = require('../utils/pagination');
const { uploadBuffer, deleteAsset } = require('./uploadService');
const { recordActivity } = require('./auditLogService');
const { createNotification } = require('../utils/notificationCreator');
const ApiError = require('../utils/ApiError');

async function createExpense(data, actor, file, req) {
  assertSiteAccess(actor, data.site);

  let receiptUpload = null;
  if (file) {
    receiptUpload = await uploadBuffer(
      file.buffer,
      'mala-erp/expenses/receipts',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const expense = await expenseRepository.create({
    ...data,
    receiptUpload,
    createdBy: actor._id,
  });

  await recordActivity({
    actor, action: 'create', entityType: 'Expense', entityId: expense._id, site: data.site, after: expense.toObject(), req,
  });

  await createNotification({
    recipient: null, // Broadcast to Super Admins for pending review
    type: 'expense_added',
    title: 'New Expense Awaiting Review',
    message: `${actor.name} requested approval for overhead "${data.title}" of ₹${Number(data.amount).toLocaleString('en-IN')}.`,
    relatedEntity: { kind: 'Expense', id: expense._id },
    site: data.site
  });

  return expenseRepository.findById(expense._id);
}

async function listExpenses(queryParams, actor) {
  const { page, limit, search, category, startDate, endDate, sortBy, sortOrder, siteId, showDeleted } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const query = {
    ...siteFilter,
    ...(category && { category }),
    ...buildDateRangeFilter(startDate, endDate, 'date'),
    ...buildTextSearchFilter(search, ['title', 'vendor', 'description']),
  };

  const sort = buildSort(sortBy, sortOrder, ['date', 'amount', 'title', 'createdAt'], 'date');
  const { items, total } = await expenseRepository.findAll(query, { page, limit, sort }, showDeleted === 'true' || showDeleted === true);
  return buildPaginatedResult(items, total, page, limit);
}

async function getExpenseById(id, actor) {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw ApiError.notFound('Expense not found');
  assertSiteAccess(actor, expense.site._id ?? expense.site);
  return expense;
}

async function updateExpense(id, data, actor, file, req) {
  const before = await getExpenseById(id, actor);

  if (file) {
    if (before.receiptUpload?.publicId) await deleteAsset(before.receiptUpload.publicId);
    data.receiptUpload = await uploadBuffer(
      file.buffer,
      'mala-erp/expenses/receipts',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const updated = await expenseRepository.updateById(id, data);
  await recordActivity({
    actor, action: 'update', entityType: 'Expense', entityId: id,
    site: before.site._id ?? before.site, before: before.toObject(), after: updated.toObject(), req,
  });
  return updated;
}

async function deleteExpense(id, actor, req) {
  const expense = await getExpenseById(id, actor);
  // Soft delete the expense
  await expenseRepository.softDelete(id, actor);
  await recordActivity({
    actor,
    action: 'delete',
    entityType: 'Expense',
    entityId: id,
    site: expense.site._id ?? expense.site,
    before: expense.toObject(),
    req,
  });
}

async function restoreExpense(id, actor, req) {
  const expense = await expenseRepository.findById(id, true); // Include deleted
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }
  if (!expense.isDeleted) {
    throw ApiError.badRequest('Expense is not deleted');
  }

  const restored = await expenseRepository.restore(id);
  await recordActivity({
    actor,
    action: 'restore',
    entityType: 'Expense',
    entityId: id,
    site: expense.site._id ?? expense.site,
    after: restored.toObject(),
    req,
  });
  return restored;
}

async function approveExpense(id, actor, req) {
  const expense = await getExpenseById(id, actor);
  if (expense.status !== 'pending') {
    throw ApiError.badRequest(`Cannot approve expense. Status is currently ${expense.status}`);
  }

  const updated = await expenseRepository.updateById(id, { status: 'approved' });
  await recordActivity({
    actor,
    action: 'approve',
    entityType: 'Expense',
    entityId: id,
    site: expense.site._id ?? expense.site,
    before: { status: 'pending' },
    after: { status: 'approved' },
    req,
  });

  await createNotification({
    recipient: expense.createdBy, // Notify creator
    type: 'expense_approved',
    title: 'Expense Request Approved',
    message: `Your overhead request "${expense.title}" of ₹${Number(expense.amount).toLocaleString('en-IN')} has been approved.`,
    relatedEntity: { kind: 'Expense', id: expense._id },
    site: expense.site._id ?? expense.site
  });

  return updated;
}

async function rejectExpense(id, actor, req) {
  const expense = await getExpenseById(id, actor);
  if (expense.status !== 'pending') {
    throw ApiError.badRequest(`Cannot reject expense. Status is currently ${expense.status}`);
  }

  const updated = await expenseRepository.updateById(id, { status: 'rejected' });
  await recordActivity({
    actor,
    action: 'update',
    entityType: 'Expense',
    entityId: id,
    site: expense.site._id ?? expense.site,
    before: { status: 'pending' },
    after: { status: 'rejected' },
    req,
  });

  await createNotification({
    recipient: expense.createdBy, // Notify creator
    type: 'expense_rejected',
    title: 'Expense Request Rejected',
    message: `Your overhead request "${expense.title}" of ₹${Number(expense.amount).toLocaleString('en-IN')} has been rejected.`,
    relatedEntity: { kind: 'Expense', id: expense._id },
    site: expense.site._id ?? expense.site
  });

  return updated;
}

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  restoreExpense,
  approveExpense,
  rejectExpense,
};
