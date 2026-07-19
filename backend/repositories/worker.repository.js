const Worker = require('../models/Worker');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

const populateFields = [
  { path: 'site', select: 'name code' },
  { path: 'profession', select: 'name' },
  { path: 'createdBy', select: 'name' },
];

function create(data) {
  return Worker.create(data);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return Worker.findOne(query).populate(populateFields);
}

async function findAll(query, { page, limit, sort }, includeDeleted = false) {
  const filterQuery = addSoftDeleteFilter(query, includeDeleted);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Worker.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    Worker.countDocuments(filterQuery),
  ]);
  return { items, total };
}

async function findDeleted(query, { page, limit, sort }) {
  const filterQuery = addSoftDeleteFilter(query, false);
  filterQuery.isDeleted = true;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Worker.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    Worker.countDocuments(filterQuery),
  ]);
  return { items, total };
}

function updateById(id, data) {
  return Worker.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populateFields);
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return Worker.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function restore(id) {
  const payload = createRestorePayload();
  return Worker.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function deleteById(id) {
  return Worker.findByIdAndDelete(id);
}

module.exports = { create, findById, findAll, findDeleted, updateById, softDelete, restore, deleteById };
