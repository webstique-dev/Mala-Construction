const User = require('../models/User');
const UserSession = require('../models/UserSession');
const Site = require('../models/Site');
const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/tokenUtils');
const { recordActivity } = require('./auditLogService');
const { createNotification } = require('../utils/notificationCreator');

const MAX_REFRESH_TOKENS_PER_USER = 10; // caps stored sessions/devices per account

async function register({
  email,
  password,
  rememberMe,
  role,
  assignedSite,
  name,
  username,
  phone,
  acceptedTerms,
  userAgent,
  req,
}) {
  if (!acceptedTerms) {
    throw ApiError.badRequest('You must accept the terms and conditions.');
  }

  const existingEmail = await User.findOne({ email: String(email).toLowerCase(), isDeleted: false });
  if (existingEmail) {
    throw ApiError.conflict('A user with this email already exists.');
  }

  const normalizedUsername = username?.trim?.() || '';
  if (normalizedUsername) {
    const existingUsername = await User.findOne({ username: normalizedUsername, isDeleted: false });
    if (existingUsername) {
      throw ApiError.conflict('This username is already taken.');
    }
  }

  if (role === 'site_admin') {
    if (!assignedSite) {
      throw ApiError.badRequest('Please select a site for the Site Admin account.');
    }
    const site = await Site.findById(assignedSite);
    if (!site || site.status === 'archived') {
      throw ApiError.notFound('Selected site is not available.');
    }
    if (site.assignedSiteAdmin) {
      throw ApiError.conflict('This site already has a Site Admin assigned.');
    }
  }

  const user = await User.create({
    name,
    username: normalizedUsername,
    email: String(email).toLowerCase(),
    phone,
    password,
    role,
    assignedSite: role === 'site_admin' ? assignedSite : null,
    status: 'active',
  });

  if (role === 'site_admin' && assignedSite) {
    await Site.findByIdAndUpdate(assignedSite, { assignedSiteAdmin: user._id });
  }

  const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || 'Unknown IP';
  const { accessToken, refreshToken, expiresAt } = await issueTokenPair(user, rememberMe, userAgent, ipAddress);

  await recordActivity({ actor: user, action: 'create', entityType: 'User', entityId: user._id, req, after: { name: user.name, role: user.role, assignedSite: user.assignedSite } });
  await createNotification({ recipient: user._id, type: 'security_alert', title: 'Account created', message: 'Your account has been created successfully.', priority: 'low' });

  return { user: sanitizeUser(user), accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

async function login({ email, password, rememberMe, userAgent, req }) {
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+password');

  // Same generic message whether the email doesn't exist or the password is wrong -
  // avoids leaking which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('Your account has been suspended. Contact your administrator.');
  }

  const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || 'Unknown IP';
  const { accessToken, refreshToken, expiresAt } = await issueTokenPair(user, rememberMe, userAgent, ipAddress);

  user.lastLoginAt = new Date();
  await user.save();

  await recordActivity({ actor: user, action: 'login', entityType: 'User', entityId: user._id, req });

  // Trigger login security alert notification
  await createNotification({
    recipient: user._id,
    type: 'login_alert',
    title: 'New Login Detected',
    message: `Account logged in from ${userAgent || 'Unknown Device'} (IP: ${ipAddress}).`,
    priority: 'low'
  });

  return { user: sanitizeUser(user), accessToken, refreshToken, refreshExpiresAt: expiresAt };
}

async function refresh({ refreshToken, userAgent }) {
  if (!refreshToken) throw ApiError.unauthorized('No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findOne({ _id: payload.sub, isDeleted: false });
  if (!user || user.status !== 'active') {
    throw ApiError.unauthorized('Account not found or inactive');
  }

  const tokenHash = hashToken(refreshToken);
  const storedIndex = user.refreshTokens.findIndex((t) => t.tokenHash === tokenHash);

  if (storedIndex === -1) {
    // Token isn't in the store: either it was already used (rotation) or revoked.
    // Reusing a rotated-out token is a signal of possible theft - kill all sessions defensively.
    user.refreshTokens = [];
    await user.save();
    await UserSession.deleteMany({ user: user._id });
    throw ApiError.unauthorized('Session invalid. Please log in again.');
  }

  // Update session last active time
  await UserSession.findOneAndUpdate({ tokenHash }, { $set: { lastActiveAt: new Date() } });

  const stored = user.refreshTokens[storedIndex];
  if (stored.expiresAt < new Date()) {
    user.refreshTokens.splice(storedIndex, 1);
    await user.save();
    await UserSession.deleteOne({ tokenHash });
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  // Rotate: remove the used token, issue a brand new pair with the same rememberMe
  // window the session started with (sliding expiration) - rotation must not silently
  // downgrade a 30-day "remember me" session to the default 7-day window.
  user.refreshTokens.splice(storedIndex, 1);
  const { accessToken, refreshToken: newRefreshToken, expiresAt } = await issueTokenPair(
    user,
    stored.rememberMe,
    userAgent
  );

  // Remove old session and allow issueTokenPair to create new one
  await UserSession.deleteOne({ tokenHash });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: newRefreshToken,
    refreshExpiresAt: expiresAt,
    rememberMe: stored.rememberMe,
  };
}

async function logout({ refreshToken, user, req }) {
  if (!refreshToken || !user) return; // nothing to invalidate - treat as an already-logged-out no-op

  const tokenHash = hashToken(refreshToken);
  user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  await user.save();
  await UserSession.deleteOne({ tokenHash });

  await recordActivity({ actor: user, action: 'logout', entityType: 'User', entityId: user._id, req });
}

async function logoutAllDevices({ user, req }) {
  user.refreshTokens = [];
  await user.save();
  await UserSession.deleteMany({ user: user._id });
  await recordActivity({ actor: user, action: 'logout', entityType: 'User', entityId: user._id, req, after: { allDevices: true } });
}

async function changePassword({ user, currentPassword, newPassword, req }) {
  if (!user) {
    throw ApiError.notFound('User not found.');
  }
  const fullUser = await User.findById(user._id).select('+password');
  if (!fullUser) {
    throw ApiError.notFound('User not found.');
  }
  if (!(await fullUser.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect.');
  }
  fullUser.password = newPassword;
  fullUser.passwordChangedAt = new Date();
  // Force re-login everywhere after a password change - a stolen session shouldn't survive it.
  fullUser.refreshTokens = [];
  await fullUser.save();
  await UserSession.deleteMany({ user: user._id });
  await recordActivity({ actor: user, action: 'passwordReset', entityType: 'User', entityId: user._id, req });

  await createNotification({
    recipient: user._id,
    type: 'security_alert',
    title: 'Password Updated',
    message: 'Your account password was updated successfully. All other active sessions have been logged out.',
    priority: 'high'
  });
}

// --- helpers ---

async function issueTokenPair(user, rememberMe, userAgent, ipAddress) {
  const accessToken = generateAccessToken(user);
  const { token: refreshToken, expiresAt } = generateRefreshToken(user, rememberMe);
  const tokenHash = hashToken(refreshToken);

  user.refreshTokens.push({
    tokenHash,
    userAgent: userAgent?.slice(0, 300),
    rememberMe,
    expiresAt,
  });

  // Cap stored sessions - drop oldest first if over the limit.
  if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
    user.refreshTokens = user.refreshTokens
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_REFRESH_TOKENS_PER_USER);
  }

  await user.save();

  await UserSession.create({
    user: user._id,
    tokenHash,
    userAgent: userAgent?.slice(0, 300),
    ipAddress: ipAddress || 'Unknown IP',
    rememberMe,
    expiresAt,
  });

  return { accessToken, refreshToken, expiresAt };
}

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
}

module.exports = { login, refresh, logout, logoutAllDevices, changePassword, sanitizeUser };
