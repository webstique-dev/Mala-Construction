const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/sites', require('./site.routes'));
router.use('/site-admins', require('./siteAdmin.routes'));
router.use('/lookups', require('./lookup.routes'));
router.use('/sites', require('./site.routes'));
router.use('/materials', require('./material.routes'));
router.use('/workers', require('./worker.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/payments', require('./workerPayment.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/reports', require('./report.routes'));
router.use('/activity-logs', require('./activityLog.routes'));
router.use('/search', require('./search.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/security', require('./security.routes'));

module.exports = router;
