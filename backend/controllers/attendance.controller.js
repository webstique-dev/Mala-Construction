const attendanceService = require('../services/attendanceService');
const { asyncHandler } = require('../middleware/errorHandler');

const recordAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.recordAttendance(req.body, req.user, req.file);
  res.status(201).json({ success: true, data: record });
});

const recordBatchAttendance = asyncHandler(async (req, res) => {
  const records = await attendanceService.recordBatchAttendance(req.body, req.user);
  res.status(201).json({ success: true, data: records });
});

const listAttendance = asyncHandler(async (req, res) => {
  const result = await attendanceService.getAttendanceList(req.query, req.user);
  res.json({ success: true, ...result });
});

const getAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.getAttendanceById(req.params.id, req.user);
  res.json({ success: true, data: record });
});

const updateAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.updateAttendance(req.params.id, req.body, req.user, req.file);
  res.json({ success: true, data: record });
});

const deleteAttendance = asyncHandler(async (req, res) => {
  await attendanceService.deleteAttendance(req.params.id, req.user);
  res.json({ success: true, message: 'Attendance record deleted' });
});

const getAttendanceStats = asyncHandler(async (req, res) => {
  const stats = await attendanceService.getAttendanceStats(req.query, req.user);
  res.json({ success: true, data: stats });
});

const getWeeklyReport = asyncHandler(async (req, res) => {
  const report = await attendanceService.getWeeklyReport(req.query, req.user);
  res.json({ success: true, data: report });
});

const getContractors = asyncHandler(async (req, res) => {
  const list = await attendanceService.getContractors(req.query, req.user);
  res.json({ success: true, data: list });
});

module.exports = {
  recordAttendance,
  recordBatchAttendance,
  listAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getWeeklyReport,
  getContractors,
};
