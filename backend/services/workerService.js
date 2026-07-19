const workerRepository = require('../repositories/worker.repository');
const WorkerPayment = require('../models/WorkerPayment');
const { resolveSiteScope, assertSiteAccess } = require('../utils/siteScope');
const { buildPaginatedResult, buildSort, buildTextSearchFilter } = require('../utils/pagination');
const { uploadBuffer, deleteAsset } = require('./uploadService');
const { recordActivity } = require('./auditLogService');
const ApiError = require('../utils/ApiError');

async function createWorker(data, actor, file, req) {
  assertSiteAccess(actor, data.site);

  let photo = null;
  if (file) {
    photo = await uploadBuffer(file.buffer, 'mala-erp/workers/photos');
  }

  const worker = await workerRepository.create({
    site: data.site,
    name: data.name,
    phone: data.phone,
    profession: data.profession,
    dailyWage: data.dailyWage,
    joiningDate: data.joiningDate,
    address: data.address,
    emergencyContact: {
      name: data.emergencyContactName,
      phone: data.emergencyContactPhone,
    },
    status: data.status ?? 'active',
    photo,
    createdBy: actor._id,
  });

  await recordActivity({
    actor, action: 'create', entityType: 'Worker', entityId: worker._id, site: data.site, after: worker.toObject(), req,
  });

  return workerRepository.findById(worker._id);
}

async function listWorkers(queryParams, actor) {
  const { page, limit, search, profession, status, sortBy, sortOrder, siteId, showDeleted } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const query = {
    ...siteFilter,
    ...(profession && { profession }),
    ...(status && { status }),
    ...buildTextSearchFilter(search, ['name', 'phone']),
  };

  const sort = buildSort(sortBy, sortOrder, ['name', 'dailyWage', 'joiningDate', 'createdAt'], 'name');
  const { items, total } = await workerRepository.findAll(query, { page, limit, sort }, showDeleted === 'true' || showDeleted === true);
  return buildPaginatedResult(items, total, page, limit);
}

async function getWorkerById(id, actor) {
  const worker = await workerRepository.findById(id);
  if (!worker) throw ApiError.notFound('Worker not found');
  assertSiteAccess(actor, worker.site._id ?? worker.site);
  return worker;
}

async function getWorkerProfile(id, actor) {
  const worker = await getWorkerById(id, actor);
  const payments = await WorkerPayment.find({ worker: id })
    .sort({ paidOn: -1 })
    .limit(20)
    .select('workingDays dailyWage bonus advance deduction netSalary paidOn status paymentMethod remarks');

  const totals = await WorkerPayment.aggregate([
    { $match: { worker: worker._id, status: 'paid' } },
    { $group: { _id: null, totalPaid: { $sum: '$netSalary' } } },
  ]);

  const totalPaid = totals[0]?.totalPaid ?? 0;

  return {
    worker,
    payments,
    totalPaid,
    recentPayments: payments.slice(0, 5),
  };
}

async function updateWorker(id, data, actor, file, req) {
  const before = await getWorkerById(id, actor);
  const update = { ...data };

  if (data.emergencyContactName !== undefined || data.emergencyContactPhone !== undefined) {
    update.emergencyContact = {
      name: data.emergencyContactName ?? before.emergencyContact?.name,
      phone: data.emergencyContactPhone ?? before.emergencyContact?.phone,
    };
    delete update.emergencyContactName;
    delete update.emergencyContactPhone;
  }

  if (file) {
    if (before.photo?.publicId) await deleteAsset(before.photo.publicId);
    update.photo = await uploadBuffer(file.buffer, 'mala-erp/workers/photos');
  }

  const updated = await workerRepository.updateById(id, update);
  await recordActivity({
    actor, action: 'update', entityType: 'Worker', entityId: id,
    site: before.site._id ?? before.site, before: before.toObject(), after: updated.toObject(), req,
  });
  return updated;
}

async function deleteWorker(id, actor, req) {
  const worker = await getWorkerById(id, actor);
  // Soft delete the worker
  await workerRepository.softDelete(id, actor);
  await recordActivity({
    actor,
    action: 'delete',
    entityType: 'Worker',
    entityId: id,
    site: worker.site._id ?? worker.site,
    before: worker.toObject(),
    req,
  });
}

async function restoreWorker(id, actor, req) {
  const worker = await workerRepository.findById(id, true); // Include deleted
  if (!worker) {
    throw ApiError.notFound('Worker not found');
  }
  if (!worker.isDeleted) {
    throw ApiError.badRequest('Worker is not deleted');
  }

  const restored = await workerRepository.restore(id);
  await recordActivity({
    actor,
    action: 'restore',
    entityType: 'Worker',
    entityId: id,
    site: worker.site._id ?? worker.site,
    after: restored.toObject(),
    req,
  });
  return restored;
}

module.exports = {
  createWorker,
  listWorkers,
  getWorkerById,
  getWorkerProfile,
  updateWorker,
  deleteWorker,
  restoreWorker,
};
