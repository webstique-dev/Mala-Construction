const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    phone: { type: String, trim: true },
    address: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '', trim: true, maxlength: 100 },
    employeeId: { type: String, default: '', trim: true, maxlength: 50 },
    companyInfo: { type: String, default: '' },
    username: { type: String, default: '', trim: true, maxlength: 50 },
    biography: { type: String, default: '', trim: true, maxlength: 500 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['super_admin', 'site_admin'], required: true },
    // Only meaningful for site_admin; super_admin's is always null.
    assignedSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    verificationStatus: { type: String, enum: ['verified', 'pending', 'rejected'], default: 'pending' },
    // Hashed refresh tokens per device, so "logout from all devices" is a single array clear.
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        userAgent: { type: String },
        rememberMe: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, assignedSite: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.refreshTokens;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
