const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'annual', 'custom'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['worker', 'expense', 'material', 'site', 'consolidated'],
      required: true,
    },
    // null site scope = company-wide (Super Admin only, enforced in controller/service).
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    format: { type: String, enum: ['pdf', 'excel', 'csv'], required: true },
    file: {
      url: { type: String, required: true },
      publicId: { type: String, default: null },
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

reportSchema.index({ site: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
