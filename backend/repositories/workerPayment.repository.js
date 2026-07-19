const WorkerPayment = require('../models/WorkerPayment');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

const populateFields = [
  { path: 'site', select: 'name code' },
  { path: 'worker', select: 'name phone profession dailyWage', populate: { path: 'profession', select: 'name' } },
  { path: 'createdBy', select: 'name' },
];

function create(data) {
  return WorkerPayment.create(data);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return WorkerPayment.findOne(query).populate(populateFields);
}

async function findAll(query, { page, limit, sort }, includeDeleted = false) {
  const filterQuery = addSoftDeleteFilter(query, includeDeleted);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    WorkerPayment.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    WorkerPayment.countDocuments(filterQuery),
  ]);
  return { items, total };
}

async function findDeleted(query, { page, limit, sort }) {
  const filterQuery = addSoftDeleteFilter(query, false);
  filterQuery.isDeleted = true;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    WorkerPayment.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    WorkerPayment.countDocuments(filterQuery),
  ]);
  return { items, total };
}

function updateById(id, data) {
  return WorkerPayment.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populateFields);
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return WorkerPayment.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function restore(id) {
  const payload = createRestorePayload();
  return WorkerPayment.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function deleteById(id) {
  return WorkerPayment.findByIdAndDelete(id);
}

module.exports = { create, findById, findAll, findDeleted, updateById, softDelete, restore, deleteById };
