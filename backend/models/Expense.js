const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: ['cash', 'bankTransfer', 'upi', 'cheque', 'card'], required: true },
    receiptUpload: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ site: 1, date: -1 });
expenseSchema.index({ site: 1, category: 1 });
expenseSchema.index({ title: 'text', vendor: 'text' });

module.exports = mongoose.model('Expense', expenseSchema);
