const workerService = require('../services/workerService');
const { asyncHandler } = require('../middleware/errorHandler');

const createWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.createWorker(req.body, req.user, req.file, req);
  res.status(201).json({ success: true, data: worker });
});

const listWorkers = asyncHandler(async (req, res) => {
  const result = await workerService.listWorkers(req.query, req.user);
  res.json({ success: true, ...result });
});

const searchWorkers = asyncHandler(async (req, res) => {
  const results = await workerService.searchWorkers(req.query, req.user);
  res.json({ success: true, data: results });
});

const getWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.getWorkerById(req.params.id, req.user);
  res.json({ success: true, data: worker });
});

const getWorkerProfile = asyncHandler(async (req, res) => {
  const profile = await workerService.getWorkerProfile(req.params.id, req.user);
  res.json({ success: true, data: profile });
});

const updateWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.updateWorker(req.params.id, req.body, req.user, req.file, req);
  res.json({ success: true, data: worker });
});

const deleteWorker = asyncHandler(async (req, res) => {
  await workerService.deleteWorker(req.params.id, req.user, req);
  res.json({ success: true, message: 'Worker deleted' });
});

const restoreWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.restoreWorker(req.params.id, req.user, req);
  res.json({ success: true, data: worker });
});

module.exports = { createWorker, listWorkers, searchWorkers, getWorker, getWorkerProfile, updateWorker, deleteWorker, restoreWorker };
