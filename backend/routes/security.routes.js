const express = require('express');
const router = express.Router();
const securityController = require('../controllers/security.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/sessions', securityController.listSessions);
router.delete('/sessions/:id', securityController.terminateSession);
router.delete('/sessions', securityController.terminateOtherSessions);

module.exports = router;
