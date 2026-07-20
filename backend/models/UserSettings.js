const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
    currency: { type: String, default: 'INR' },
    numberFormat: { type: String, default: 'en-IN' },
    defaultDashboard: { type: String, default: 'general' },
    compactMode: { type: Boolean, default: false },
    tableDensity: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
    paginationSize: { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSettings', userSettingsSchema);
