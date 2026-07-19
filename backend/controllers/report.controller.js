const reportService = require('../services/reportService');
const { asyncHandler } = require('../middleware/errorHandler');

const generateReport = asyncHandler(async (req, res) => {
  const result = await reportService.generateReport(req.query, req.user);
  if (result.isJson) {
    return res.json({ success: true, ...result.data });
  }
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});

module.exports = { generateReport };
