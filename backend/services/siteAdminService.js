const userRepository = require('../repositories/user.repository');
const siteRepository = require('../repositories/site.repository');
const Site = require('../models/Site');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { generateTempPassword } = require('../utils/password');
const { deleteAsset } = require('./uploadService');
const { recordActivity } = require('./auditLogService');

async function assertSiteAvailable(siteId, excludingUserId = null) {
  const site = await Site.findById(siteId);
  if (!site) throw ApiError.notFound('Site not found');
  if (site.status === 'archived') throw ApiError.badRequest('Cannot assign a Site Admin to an archived site');

  if (site.assignedSiteAdmin && site.assignedSiteAdmin.toString() !== excludingUserId?.toString()) {
    throw ApiError.conflict(
      'This site already has a Site Admin assigned. Reassign or suspend the current one first.'
    );
  }
  return site;
}

/**
 * Creates a Site Admin with a system-generated temporary password.
 * No email/SMS gateway is in the spec'd stack, so the temp password is
 * returned once in this response for the Super Admin to relay manually.
 * Flagging this: wiring up an email provider (e.g. nodemailer + SMTP or
 * a transactional email API) would be a straightforward follow-up if desired.
 */
async function createSiteAdmin(data, actor, req) {
  const existingEmail = await userRepository.findByEmail(data.email);
  if (existingEmail) throw ApiError.conflict('A user with this email already exists');

  await assertSiteAvailable(data.assignedSite);

  const tempPassword = generateTempPassword();
  const user = await userRepository.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: tempPassword,
    role: 'site_admin',
    assignedSite: data.assignedSite,
    photo: data.photo || undefined,
    status: 'active',
    createdBy: actor._id,
  });

  await siteRepository.updateById(data.assignedSite, { assignedSiteAdmin: user._id });

  await recordActivity({
    actor,
    action: 'create',
    entityType: 'User',
    entityId: user._id,
    site: data.assignedSite,
    after: { name: user.name, email: user.email, assignedSite: data.assignedSite },
    req,
  });

  const sanitized = user.toObject();
  delete sanitized.password;
  delete sanitized.refreshTokens;

  return { user: sanitized, tempPassword };
}

async function listSiteAdmins(queryParams) {
  const includeDeleted = queryParams.showDeleted === true || queryParams.showDeleted === 'true';
  return userRepository.findAllSiteAdmins({ ...queryParams, includeDeleted });
}

async function getSiteAdminById(id) {
  const user = await userRepository.findById(id);
  if (!user || user.role !== 'site_admin') throw ApiError.notFound('Site Admin not found');
  return user;
}

async function updateSiteAdmin(id, data, actor, req) {
  const before = await getSiteAdminById(id);

  // Photo replacement: upload new one is handled at the controller layer (needs the file buffer);
  // here we just clean up the old Cloudinary asset if a new photo object was passed in.
  if (data.photo && before.photo?.publicId && data.photo.publicId !== before.photo.publicId) {
    await deleteAsset(before.photo.publicId);
  }

  const updated = await userRepository.updateById(id, {
    name: data.name,
    phone: data.phone,
    ...(data.photo ? { photo: data.photo } : {}),
  });

  await recordActivity({
    actor,
    action: 'update',
    entityType: 'User',
    entityId: id,
    site: before.assignedSite?._id,
    before: { name: before.name, phone: before.phone },
    after: { name: updated.name, phone: updated.phone },
    req,
  });

  return updated;
}

async function resetPassword(id, actor, req) {
  const user = await getSiteAdminById(id);
  const tempPassword = generateTempPassword();

  const fullUser = await User.findById(id);
  fullUser.password = tempPassword;
  fullUser.refreshTokens = []; // force re-login on all of this admin's devices
  await fullUser.save();

  await recordActivity({
    actor,
    action: 'passwordReset',
    entityType: 'User',
    entityId: id,
    site: user.assignedSite?._id,
    req,
  });

  return { tempPassword };
}

async function setStatus(id, status, actor, req) {
  const before = await getSiteAdminById(id);
  const updated = await userRepository.updateById(id, { status });

  // Suspending should also kill active sessions immediately.
  if (status === 'suspended') {
    const fullUser = await User.findById(id);
    fullUser.refreshTokens = [];
    await fullUser.save();
  }

  await recordActivity({
    actor,
    action: 'update',
    entityType: 'User',
    entityId: id,
    site: before.assignedSite?._id,
    before: { status: before.status },
    after: { status },
    req,
  });

  return updated;
}

async function reassignSite(id, newSiteId, actor, req) {
  const user = await getSiteAdminById(id);
  const oldSiteId = user.assignedSite?._id;

  if (oldSiteId?.toString() === newSiteId) {
    throw ApiError.badRequest('Site Admin is already assigned to this site');
  }

  await assertSiteAvailable(newSiteId);

  // Clear the old site's back-reference, set the new one, update the user - in that order,
  // so a failure partway through leaves at most a dangling old-site reference (safe/recoverable)
  // rather than two sites simultaneously pointing at the same admin.
  if (oldSiteId) {
    await siteRepository.updateById(oldSiteId, { assignedSiteAdmin: null });
  }
  await siteRepository.updateById(newSiteId, { assignedSiteAdmin: id });
  const updated = await userRepository.updateById(id, { assignedSite: newSiteId });

  await recordActivity({
    actor,
    action: 'update',
    entityType: 'User',
    entityId: id,
    site: newSiteId,
    before: { assignedSite: oldSiteId },
    after: { assignedSite: newSiteId },
    req,
  });

  return updated;
}

async function deleteSiteAdmin(id, actor, req) {
  const user = await getSiteAdminById(id);

  // Clear the site's back-reference so the site doesn't retain a dangling reference.
  if (user.assignedSite) {
    const siteId = user.assignedSite._id ?? user.assignedSite;
    await siteRepository.updateById(siteId, { assignedSiteAdmin: null });
  }

  // Force logout from all devices immediately.
  const fullUser = await User.findById(id);
  if (fullUser) {
    fullUser.refreshTokens = [];
    await fullUser.save();
  }

  await userRepository.softDelete(id, actor._id);

  await recordActivity({
    actor,
    action: 'delete',
    entityType: 'User',
    entityId: id,
    site: user.assignedSite?._id ?? user.assignedSite,
    before: { name: user.name, email: user.email },
    req,
  });
}

async function restoreSiteAdmin(id, actor, req) {
  const user = await userRepository.findById(id, true); // Include deleted
  if (!user || user.role !== 'site_admin') throw ApiError.notFound('Site Admin not found');
  if (!user.isDeleted) throw ApiError.badRequest('Site Admin is not deleted');

  const restored = await userRepository.restore(id);

  await recordActivity({
    actor,
    action: 'restore',
    entityType: 'User',
    entityId: id,
    site: user.assignedSite?._id ?? user.assignedSite,
    after: { name: restored.name, email: restored.email },
    req,
  });

  return restored;
}

module.exports = {
  createSiteAdmin,
  listSiteAdmins,
  getSiteAdminById,
  updateSiteAdmin,
  resetPassword,
  setStatus,
  reassignSite,
  deleteSiteAdmin,
  restoreSiteAdmin,
};
