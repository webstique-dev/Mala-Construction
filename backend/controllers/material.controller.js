const materialService = require('../services/materialService');
const { asyncHandler } = require('../middleware/errorHandler');

const createMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.createMaterial(req.body, req.user, req.file, req);
  res.status(201).json({ success: true, data: material });
});

const listMaterials = asyncHandler(async (req, res) => {
  const result = await materialService.listMaterials(req.query, req.user);
  res.json({ success: true, ...result });
});

const getMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.getMaterialById(req.params.id, req.user);
  res.json({ success: true, data: material });
});

const updateMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.updateMaterial(req.params.id, req.body, req.user, req.file, req);
  res.json({ success: true, data: material });
});

const deleteMaterial = asyncHandler(async (req, res) => {
  await materialService.deleteMaterial(req.params.id, req.user, req);
  res.json({ success: true, message: 'Material deleted' });
});

const restoreMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.restoreMaterial(req.params.id, req.user, req);
  res.json({ success: true, data: material });
});

module.exports = { createMaterial, listMaterials, getMaterial, updateMaterial, deleteMaterial, restoreMaterial };
