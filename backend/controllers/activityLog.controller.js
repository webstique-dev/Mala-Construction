const activityLogReadService = require('../services/activityLogReadService');
const { asyncHandler } = require('../middleware/errorHandler');

const listActivityLogs = asyncHandler(async (req, res) => {
  const result = await activityLogReadService.listActivityLogs(req.query, req.user);
  res.json({ success: true, ...result });
});

module.exports = { listActivityLogs };
