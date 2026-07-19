const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    materialName: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MaterialCategory', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true }, // e.g. bags, tons, cu.m - admin-editable elsewhere if needed
    rate: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 }, // GST percentage
    transportCharge: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // percentage
    totalAmount: { type: Number, required: true, min: 0 }, // computed server-side, never trust client
    date: { type: Date, required: true },
    invoiceUpload: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    notes: { type: String, trim: true, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

materialSchema.index({ site: 1, date: -1 });
materialSchema.index({ site: 1, category: 1 });
materialSchema.index({ invoiceNumber: 'text', materialName: 'text' });

module.exports = mongoose.model('Material', materialSchema);
