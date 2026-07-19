const express = require('express');
const router = express.Router();

const searchController = require('../controllers/search.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { searchQuerySchema } = require('../validators/operational.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/', validate({ query: searchQuerySchema }), searchController.globalSearch);

module.exports = router;
