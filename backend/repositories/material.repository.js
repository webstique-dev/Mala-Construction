const Material = require('../models/Material');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

const populateFields = [
  { path: 'site', select: 'name code' },
  { path: 'supplier', select: 'name contactNumber' },
  { path: 'category', select: 'name' },
  { path: 'createdBy', select: 'name' },
];

function create(data) {
  return Material.create(data);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return Material.findOne(query).populate(populateFields);
}

async function findAll(query, { page, limit, sort }, includeDeleted = false) {
  const filterQuery = addSoftDeleteFilter(query, includeDeleted);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Material.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    Material.countDocuments(filterQuery),
  ]);
  return { items, total };
}

async function findDeleted(query, { page, limit, sort }) {
  const filterQuery = addSoftDeleteFilter(query, false);
  filterQuery.isDeleted = true; // Only deleted records
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Material.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    Material.countDocuments(filterQuery),
  ]);
  return { items, total };
}

function updateById(id, data) {
  return Material.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populateFields);
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return Material.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function restore(id) {
  const payload = createRestorePayload();
  return Material.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

// Permanent deletion (admin only) - should rarely be used
function deleteById(id) {
  return Material.findByIdAndDelete(id);
}

module.exports = { create, findById, findAll, findDeleted, updateById, softDelete, restore, deleteById };
