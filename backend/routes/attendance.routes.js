const express = require('express');
const router = express.Router();

const attendanceController = require('../controllers/attendance.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { documentUpload } = require('../middleware/upload');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/stats', attendanceController.getAttendanceStats);
router.get('/weekly-report', attendanceController.getWeeklyReport);
router.get('/contractors', attendanceController.getContractors);
router.post('/batch', attendanceController.recordBatchAttendance);
router.post('/', documentUpload.single('attachment'), attendanceController.recordAttendance);
router.get('/', attendanceController.listAttendance);
router.get('/:id', attendanceController.getAttendance);
router.put('/:id', documentUpload.single('attachment'), attendanceController.updateAttendance);
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;
