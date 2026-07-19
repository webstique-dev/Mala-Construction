const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { dashboardQuerySchema } = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/', validate({ query: dashboardQuerySchema }), dashboardController.getDashboard);

module.exports = router;
