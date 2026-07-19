const searchService = require('../services/searchService');
const { asyncHandler } = require('../middleware/errorHandler');

const globalSearch = asyncHandler(async (req, res) => {
  const data = await searchService.globalSearch(req.query, req.user);
  res.json({ success: true, data });
});

module.exports = { globalSearch };
