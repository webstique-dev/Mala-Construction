const siteAdminService = require('../services/siteAdminService');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadBuffer } = require('../services/uploadService');

async function uploadPhotoIfPresent(req) {
  if (!req.file) return undefined;
  return uploadBuffer(req.file.buffer, 'mala-erp/site-admins/photos', 'image');
}

const createSiteAdmin = asyncHandler(async (req, res) => {
  const photo = await uploadPhotoIfPresent(req);
  const result = await siteAdminService.createSiteAdmin({ ...req.body, photo }, req.user, req);
  // tempPassword is returned once, here, for the Super Admin to relay to the new Site Admin.
  res.status(201).json({ success: true, data: result.user, tempPassword: result.tempPassword });
});

const listSiteAdmins = asyncHandler(async (req, res) => {
  const result = await siteAdminService.listSiteAdmins(req.query);
  res.status(200).json({ success: true, ...result });
});

const getSiteAdmin = asyncHandler(async (req, res) => {
  const user = await siteAdminService.getSiteAdminById(req.params.id);
  res.status(200).json({ success: true, data: user });
});

const updateSiteAdmin = asyncHandler(async (req, res) => {
  const photo = await uploadPhotoIfPresent(req);
  const user = await siteAdminService.updateSiteAdmin(req.params.id, { ...req.body, photo }, req.user, req);
  res.status(200).json({ success: true, data: user });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await siteAdminService.resetPassword(req.params.id, req.user, req);
  res.status(200).json({ success: true, tempPassword: result.tempPassword });
});

const setStatus = asyncHandler(async (req, res) => {
  const user = await siteAdminService.setStatus(req.params.id, req.body.status, req.user, req);
  res.status(200).json({ success: true, data: user });
});

const reassignSite = asyncHandler(async (req, res) => {
  const user = await siteAdminService.reassignSite(req.params.id, req.body.siteId, req.user, req);
  res.status(200).json({ success: true, data: user });
});

const deleteSiteAdmin = asyncHandler(async (req, res) => {
  await siteAdminService.deleteSiteAdmin(req.params.id, req.user, req);
  res.status(200).json({ success: true, message: 'Site Admin deleted' });
});

const restoreSiteAdmin = asyncHandler(async (req, res) => {
  const user = await siteAdminService.restoreSiteAdmin(req.params.id, req.user, req);
  res.status(200).json({ success: true, data: user });
});

module.exports = {
  createSiteAdmin,
  listSiteAdmins,
  getSiteAdmin,
  updateSiteAdmin,
  resetPassword,
  setStatus,
  reassignSite,
  deleteSiteAdmin,
  restoreSiteAdmin,
};
