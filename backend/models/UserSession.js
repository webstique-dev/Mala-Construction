const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    userAgent: { type: String, default: 'Unknown Browser' },
    ipAddress: { type: String, default: 'Unknown IP' },
    rememberMe: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
    lastActiveAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'terminated', 'expired'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSession', userSessionSchema);
