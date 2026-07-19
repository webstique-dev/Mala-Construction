const siteService = require('../services/siteService');
const { asyncHandler } = require('../middleware/errorHandler');

const createSite = asyncHandler(async (req, res) => {
  const site = await siteService.createSite(req.body, req.user, req);
  res.status(201).json({ success: true, data: site });
});

const listSites = asyncHandler(async (req, res) => {
  const result = await siteService.listSites(req.query);
  res.status(200).json({ success: true, ...result });
});

const getSite = asyncHandler(async (req, res) => {
  const site = await siteService.getSiteById(req.params.id);
  res.status(200).json({ success: true, data: site });
});

const updateSite = asyncHandler(async (req, res) => {
  const site = await siteService.updateSite(req.params.id, req.body, req.user, req);
  res.status(200).json({ success: true, data: site });
});

const archiveSite = asyncHandler(async (req, res) => {
  const site = await siteService.archiveSite(req.params.id, req.user, req);
  res.status(200).json({ success: true, data: site });
});

const deleteSite = asyncHandler(async (req, res) => {
  await siteService.deleteSite(req.params.id, req.user, req);
  res.status(200).json({ success: true, message: 'Site deleted' });
});

const restoreSite = asyncHandler(async (req, res) => {
  const site = await siteService.restoreSite(req.params.id, req.user, req);
  res.status(200).json({ success: true, data: site });
});

module.exports = { createSite, listSites, getSite, updateSite, archiveSite, deleteSite, restoreSite };
