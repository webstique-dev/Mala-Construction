const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const { accessCookieOptions, refreshCookieOptions, clearCookieOptions } = require('../utils/cookieOptions');

const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const result = await authService.login({
    email,
    password,
    rememberMe,
    userAgent: req.headers['user-agent'],
    req,
  });

  res.cookie('accessToken', result.accessToken, accessCookieOptions());
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions(rememberMe));

  res.status(200).json({ success: true, data: result.user });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  const result = await authService.refresh({ refreshToken: token, userAgent: req.headers['user-agent'] });

  res.cookie('accessToken', result.accessToken, accessCookieOptions());
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions(result.rememberMe));

  res.status(200).json({ success: true, data: result.user });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  await authService.logout({ refreshToken: token, req });

  res.clearCookie('accessToken', clearCookieOptions('/'));
  res.clearCookie('refreshToken', clearCookieOptions('/api/auth'));

  res.status(200).json({ success: true, message: 'Logged out' });
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices({ user: req.user, req });

  res.clearCookie('accessToken', clearCookieOptions('/'));
  res.clearCookie('refreshToken', clearCookieOptions('/api/auth'));

  res.status(200).json({ success: true, message: 'Logged out from all devices' });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword({ user: req.user, currentPassword, newPassword, req });

  // Password change invalidates all sessions server-side - clear this device's cookies too.
  res.clearCookie('accessToken', clearCookieOptions('/'));
  res.clearCookie('refreshToken', clearCookieOptions('/api/auth'));

  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});

module.exports = { login, refresh, logout, logoutAllDevices, me, changePassword };
