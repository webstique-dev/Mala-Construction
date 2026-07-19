const UserSession = require('../models/UserSession');
const User = require('../models/User');
const { hashToken } = require('../utils/tokenUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');

const listSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessions = await UserSession.find({ user: userId }).sort({ lastActiveAt: -1 });
  
  // Tag current session
  const currentToken = req.cookies?.refreshToken;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const formattedSessions = sessions.map(s => {
    const obj = s.toObject();
    obj.isCurrent = s.tokenHash === currentHash;
    // Hide tokenHash for security
    delete obj.tokenHash;
    return obj;
  });

  res.json({ success: true, sessions: formattedSessions });
});

const terminateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const session = await UserSession.findOne({ _id: id, user: userId });
  if (!session) throw ApiError.notFound('Session not found');

  // Terminate in User collection
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(t => t.tokenHash !== session.tokenHash);
    await user.save();
  }

  // Delete from UserSession
  await UserSession.deleteOne({ _id: id });

  res.json({ success: true, message: 'Session terminated successfully' });
});

const terminateOtherSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currentToken = req.cookies?.refreshToken;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  if (!currentHash) {
    throw ApiError.unauthorized('No active session found to preserve');
  }

  // Delete other sessions in UserSession
  await UserSession.deleteMany({ user: userId, tokenHash: { $ne: currentHash } });

  // Sync User collection
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens = user.refreshTokens.filter(t => t.tokenHash === currentHash);
    await user.save();
  }

  res.json({ success: true, message: 'Other active sessions terminated successfully' });
});

module.exports = {
  listSessions,
  terminateSession,
  terminateOtherSessions
};
