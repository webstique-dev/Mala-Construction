const User = require('../models/User');
const { escapeRegex } = require('../utils/regex');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

function create(data) {
  return User.create(data);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return User.findOne(query).populate('assignedSite', 'name code status');
}

function findByEmail(email, includeDeleted = false) {
  const query = addSoftDeleteFilter({ email: email.toLowerCase() }, includeDeleted);
  return User.findOne(query);
}

async function findAllSiteAdmins({ page = 1, limit = 20, search, status, siteId, sortBy = 'createdAt', sortOrder = 'desc', includeDeleted = false } = {}) {
  const query = { role: 'site_admin' };
  if (status) query.status = status;
  if (siteId) query.assignedSite = siteId;
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  const filterQuery = addSoftDeleteFilter(query, includeDeleted);
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    User.find(filterQuery).populate('assignedSite', 'name code status').sort(sort).skip(skip).limit(limit),
    User.countDocuments(filterQuery),
  ]);

  return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
}

async function findDeleted({ page = 1, limit = 20, search, status, sortBy = 'deletedAt', sortOrder = 'desc' } = {}) {
  const query = { isDeleted: true };
  if (status) query.status = status;
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    query.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    User.find(query).populate('assignedSite', 'name code status').sort(sort).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
}

function updateById(id, data) {
  return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return User.findByIdAndUpdate(id, payload, { new: true });
}

function restore(id) {
  const payload = createRestorePayload();
  return User.findByIdAndUpdate(id, payload, { new: true });
}

// Permanent deletion (admin only)
function deleteById(id) {
  return User.findByIdAndDelete(id);
}

module.exports = { create, findById, findByEmail, findAllSiteAdmins, findDeleted, updateById, softDelete, restore, deleteById };
