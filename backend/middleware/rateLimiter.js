const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/** General API limiter - generous, just guards against abuse/DoS. */
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Strict limiter for auth endpoints (login, refresh) - mitigates brute force / credential stuffing. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only counts failed attempts against the cap
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

module.exports = { apiLimiter, authLimiter };
