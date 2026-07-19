const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Singleton pattern - always one document, enforced by a fixed _id in the service layer.
    companyName: { type: String, default: 'MALA Construction' },
    companyLogo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    companyAddress: { type: String, default: '' },
    companyPhone: { type: String, default: '' },
    companyEmail: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    lowStockThresholds: { type: mongoose.Schema.Types.Mixed, default: {} }, // per materialCategoryId
    defaultTaxRate: { type: Number, default: 18 },
    currencySymbol: { type: String, default: '₹' },
    invoicePrefix: { type: String, default: 'INV-' },
    receiptPrefix: { type: String, default: 'REC-' },
    financialYear: { type: String, default: '2026-2027' },
    defaultSite: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    defaultPaymentMethod: { type: String, default: 'cash' },
    backupPreferences: {
      frequency: { type: String, default: 'weekly' },
      emailNotification: { type: Boolean, default: true }
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
