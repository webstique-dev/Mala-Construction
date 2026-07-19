const express = require('express');
const router = express.Router();

const lookupController = require('../controllers/lookup.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { createLookupSchema } = require('../validators/lookup.validators');

router.use(authenticate, authorize('super_admin', 'site_admin'));

router.get('/professions', lookupController.listProfessions);
router.post('/professions', validate({ body: createLookupSchema }), lookupController.createProfession);

router.get('/material-categories', lookupController.listMaterialCategories);
router.post('/material-categories', validate({ body: createLookupSchema }), lookupController.createMaterialCategory);

router.get('/expense-categories', lookupController.listExpenseCategories);
router.post('/expense-categories', validate({ body: createLookupSchema }), lookupController.createExpenseCategory);

router.get('/suppliers', lookupController.listSuppliers);
router.get('/sites', lookupController.listActiveSites);

module.exports = router;
