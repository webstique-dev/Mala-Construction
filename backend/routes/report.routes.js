const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { reportQuerySchema } = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/generate', validate({ query: reportQuerySchema }), reportController.generateReport);

module.exports = router;
