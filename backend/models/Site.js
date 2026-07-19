const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    startDate: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    assignedSiteAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    contactNumber: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

siteSchema.index({ status: 1 });
siteSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Site', siteSchema);
