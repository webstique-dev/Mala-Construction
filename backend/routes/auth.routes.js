const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { loginSchema, registerSchema, changePasswordSchema } = require('../validators/auth.validators');

// Public
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/refresh', authLimiter, authController.refresh);

// Protected
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAllDevices);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

module.exports = router;
