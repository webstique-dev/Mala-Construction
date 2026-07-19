const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/** Short-lived access token carried in the accessToken cookie. */
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, assignedSite: user.assignedSite?.toString() ?? null },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/**
 * Refresh token = a signed JWT (so it self-validates expiry/signature) whose
 * jti is also stored, hashed, on the user document. Both checks must pass:
 * the JWT must verify AND a matching, unexpired, non-revoked hash must exist
 * server-side - this is what makes "logout from all devices" possible
 * (clearing the server-side array immediately invalidates all such tokens
 * even though the JWTs themselves are still cryptographically valid).
 */
function generateRefreshToken(user, rememberMe) {
  const jti = crypto.randomUUID();
  const expiresIn = rememberMe ? env.jwt.refreshExpiresInRemember : env.jwt.refreshExpiresIn;
  const token = jwt.sign({ sub: user._id.toString(), jti }, env.jwt.refreshSecret, { expiresIn });
  const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));
  return { token, jti, expiresAt };
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parses simple duration strings like '15m', '7d', '30d' into milliseconds. */
function parseDurationMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 days
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return value * unitMs[match[2]];
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseDurationMs,
};
