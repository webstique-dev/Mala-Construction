const dashboardService = require('../services/dashboardService');
const { asyncHandler } = require('../middleware/errorHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard(req.query, req.user);
  res.json({ success: true, data });
});

module.exports = { getDashboard };
