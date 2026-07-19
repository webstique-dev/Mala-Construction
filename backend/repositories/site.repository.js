const Site = require('../models/Site');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

function create(data) {
  return Site.create(data);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return Site.findOne(query).populate('assignedSiteAdmin', 'name email phone status');
}

function findByCode(code, includeDeleted = false) {
  const query = addSoftDeleteFilter({ code: code.toUpperCase() }, includeDeleted);
  return Site.findOne(query);
}

/**
 * Paginated, searchable, filterable list - shared shape for every list endpoint in the app.
 * @param {object} opts - { page, limit, search, status, sortBy, sortOrder, includeDeleted }
 */
async function findAll({ page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc', includeDeleted = false } = {}) {
  const query = {};
  if (status) query.status = status;
  if (search) query.$text = { $search: search };
  
  const filterQuery = addSoftDeleteFilter(query, includeDeleted);

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Site.find(filterQuery).populate('assignedSiteAdmin', 'name email phone status').sort(sort).skip(skip).limit(limit),
    Site.countDocuments(filterQuery),
  ]);

  return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
}

async function findDeleted({ page = 1, limit = 20, search, status, sortBy = 'deletedAt', sortOrder = 'desc' } = {}) {
  const query = { isDeleted: true };
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Site.find(query).populate('assignedSiteAdmin', 'name email phone status').sort(sort).skip(skip).limit(limit),
    Site.countDocuments(query),
  ]);

  return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
}

function updateById(id, data) {
  return Site.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return Site.findByIdAndUpdate(id, payload, { new: true }).populate('assignedSiteAdmin', 'name email phone status');
}

function restore(id) {
  const payload = createRestorePayload();
  return Site.findByIdAndUpdate(id, payload, { new: true }).populate('assignedSiteAdmin', 'name email phone status');
}

// Permanent deletion (admin only)
function deleteById(id) {
  return Site.findByIdAndDelete(id);
}

module.exports = { create, findById, findByCode, findAll, findDeleted, updateById, softDelete, restore, deleteById };
