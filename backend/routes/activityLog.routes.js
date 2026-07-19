const express = require('express');
const router = express.Router();

const activityLogController = require('../controllers/activityLog.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { listActivityLogsQuerySchema } = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/', validate({ query: listActivityLogsQuerySchema }), activityLogController.listActivityLogs);

module.exports = router;
