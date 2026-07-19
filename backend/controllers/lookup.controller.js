const lookupService = require('../services/lookupService');
const { asyncHandler } = require('../middleware/errorHandler');
const { resolveSiteScope } = require('../utils/siteScope');

const listProfessions = asyncHandler(async (req, res) => {
  const data = await lookupService.listProfessions();
  res.json({ success: true, data });
});

const listMaterialCategories = asyncHandler(async (req, res) => {
  const data = await lookupService.listMaterialCategories();
  res.json({ success: true, data });
});

const listExpenseCategories = asyncHandler(async (req, res) => {
  const data = await lookupService.listExpenseCategories();
  res.json({ success: true, data });
});

const listSuppliers = asyncHandler(async (req, res) => {
  const scope = resolveSiteScope(req.user, req.query.siteId);
  const siteId = scope.site ?? req.query.siteId;
  const data = await lookupService.listSuppliers(siteId);
  res.json({ success: true, data });
});

const listActiveSites = asyncHandler(async (req, res) => {
  const data = await lookupService.listActiveSites();
  res.json({ success: true, data });
});

const createProfession = asyncHandler(async (req, res) => {
  const newRecord = await lookupService.createProfession(req.body.name, req.user._id);
  const updatedList = await lookupService.listProfessions();
  res.status(201).json({ success: true, data: newRecord, list: updatedList });
});

const createMaterialCategory = asyncHandler(async (req, res) => {
  const newRecord = await lookupService.createMaterialCategory(req.body.name, req.user._id);
  const updatedList = await lookupService.listMaterialCategories();
  res.status(201).json({ success: true, data: newRecord, list: updatedList });
});

const createExpenseCategory = asyncHandler(async (req, res) => {
  const newRecord = await lookupService.createExpenseCategory(req.body.name, req.user._id);
  const updatedList = await lookupService.listExpenseCategories();
  res.status(201).json({ success: true, data: newRecord, list: updatedList });
});

module.exports = {
  listProfessions,
  listMaterialCategories,
  listExpenseCategories,
  listSuppliers,
  listActiveSites,
  createProfession,
  createMaterialCategory,
  createExpenseCategory,
};
