const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    // Suppliers can be global (null) or scoped to a site if entered by a Site Admin.
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

supplierSchema.index({ site: 1 });
supplierSchema.index({ name: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
