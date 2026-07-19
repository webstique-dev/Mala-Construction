const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    lowStock: { type: Boolean, default: true },
    workerPayments: { type: Boolean, default: true },
    expenses: { type: Boolean, default: true },
    loginAlerts: { type: Boolean, default: true },
    reportGeneration: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: true },
    
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
