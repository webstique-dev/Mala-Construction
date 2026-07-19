const env = require('../config/env');
const { parseDurationMs } = require('./tokenUtils');

/** Base flags shared by all auth cookies. */
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: 'lax',
    domain: env.cookie.domain,
  };
}

function accessCookieOptions() {
  return {
    ...baseCookieOptions(),
    path: '/',
    maxAge: parseDurationMs(env.jwt.accessExpiresIn),
  };
}

/**
 * Refresh cookie is scoped to /api/auth so it's never sent on ordinary API
 * calls - only on the endpoints that actually need it (refresh/logout).
 * This shrinks the blast radius if any other endpoint were ever compromised.
 */
function refreshCookieOptions(rememberMe) {
  const expiresIn = rememberMe ? env.jwt.refreshExpiresInRemember : env.jwt.refreshExpiresIn;
  return {
    ...baseCookieOptions(),
    path: '/api/auth',
    maxAge: parseDurationMs(expiresIn),
  };
}

function clearCookieOptions(path) {
  return { ...baseCookieOptions(), path };
}

module.exports = { accessCookieOptions, refreshCookieOptions, clearCookieOptions };
