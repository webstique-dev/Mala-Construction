const mongoose = require('mongoose');

const workerPaymentSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    workingDays: { type: Number, required: true, min: 0 }, // derived from Attendance for the period
    dailyWage: { type: Number, required: true, min: 0 }, // snapshot at time of calc, so later wage edits don't rewrite history
    overtimeAmount: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    advance: { type: Number, default: 0, min: 0 },
    deduction: { type: Number, default: 0, min: 0 },
    // netSalary = (workingDays * dailyWage) + overtimeAmount + bonus - advance - deduction
    netSalary: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentMethod: { type: String, enum: ['cash', 'bankTransfer', 'upi', 'cheque'], default: 'cash' },
    paidOn: { type: Date, default: null },
    receiptPdf: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    remarks: { type: String, trim: true, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

workerPaymentSchema.index({ site: 1, status: 1 });
workerPaymentSchema.index({ worker: 1, periodStart: -1 });

module.exports = mongoose.model('WorkerPayment', workerPaymentSchema);
