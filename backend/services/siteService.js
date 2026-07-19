const siteRepository = require('../repositories/site.repository');
const Material = require('../models/Material');
const Worker = require('../models/Worker');
const Expense = require('../models/Expense');
const ApiError = require('../utils/ApiError');
const { recordActivity } = require('./auditLogService');

async function createSite(data, actor, req) {
  const existing = await siteRepository.findByCode(data.code);
  if (existing) throw ApiError.conflict(`Site code "${data.code}" is already in use`);

  const site = await siteRepository.create({ ...data, createdBy: actor._id });
  await recordActivity({ actor, action: 'create', entityType: 'Site', entityId: site._id, site: site._id, after: site.toObject(), req });
  return site;
}

async function listSites(queryParams) {
  const includeDeleted = queryParams.showDeleted === true || queryParams.showDeleted === 'true';
  return siteRepository.findAll({ ...queryParams, includeDeleted });
}

async function getSiteById(id) {
  const site = await siteRepository.findById(id);
  if (!site) throw ApiError.notFound('Site not found');
  return site;
}

async function updateSite(id, data, actor, req) {
  const before = await getSiteById(id);

  if (data.code && data.code.toUpperCase() !== before.code) {
    const existing = await siteRepository.findByCode(data.code);
    if (existing) throw ApiError.conflict(`Site code "${data.code}" is already in use`);
  }

  const updated = await siteRepository.updateById(id, data);
  await recordActivity({
    actor,
    action: 'update',
    entityType: 'Site',
    entityId: id,
    site: id,
    before: before.toObject(),
    after: updated.toObject(),
    req,
  });
  return updated;
}

/** Archiving is the recommended way to retire a site - keeps history intact for reports. */
async function archiveSite(id, actor, req) {
  const before = await getSiteById(id);
  const updated = await siteRepository.updateById(id, { status: 'archived' });
  await recordActivity({
    actor,
    action: 'update',
    entityType: 'Site',
    entityId: id,
    site: id,
    before: { status: before.status },
    after: { status: 'archived' },
    req,
  });
  return updated;
}

/**
 * Soft delete - marks site as deleted instead of permanent removal
 * No constraints needed since data is preserved
 */
async function deleteSite(id, actor, req) {
  const site = await getSiteById(id);
  await siteRepository.softDelete(id, actor);
  await recordActivity({
    actor,
    action: 'delete',
    entityType: 'Site',
    entityId: id,
    site: id,
    before: site.toObject(),
    req,
  });
}

/**
 * Restore a deleted site
 */
async function restoreSite(id, actor, req) {
  const site = await siteRepository.findById(id, true); // Include deleted
  if (!site) {
    throw ApiError.notFound('Site not found');
  }
  if (!site.isDeleted) {
    throw ApiError.badRequest('Site is not deleted');
  }

  const restored = await siteRepository.restore(id);
  await recordActivity({
    actor,
    action: 'restore',
    entityType: 'Site',
    entityId: id,
    site: id,
    after: restored.toObject(),
    req,
  });
  return restored;
}

module.exports = { createSite, listSites, getSiteById, updateSite, archiveSite, deleteSite, restoreSite };
