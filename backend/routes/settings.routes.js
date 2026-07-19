const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const authenticate = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { imageUpload, documentUpload } = require('../middleware/upload');

router.use(authenticate);

router.get('/user', settingsController.getUserSettings);
router.put('/user', imageUpload.single('photo'), settingsController.updateUserSettings);

router.get('/system', settingsController.getSystemSettings);
router.put('/system', authorize('super_admin'), imageUpload.single('logo'), settingsController.updateSystemSettings);

module.exports = router;
