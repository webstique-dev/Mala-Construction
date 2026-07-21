const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    date: { type: Date, required: true, index: true },
    /**
     * Optional reference to the Worker Master record.
     * When populated, enables strict duplicate prevention (one record per worker per site per date).
     * Null for anonymous/legacy entries where worker was not selected from master.
     */
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null, index: true },
    contractor: { type: String, trim: true, default: 'Direct / In-House', index: true },
    profession: { type: mongoose.Schema.Types.ObjectId, ref: 'Profession', required: true, index: true },
    professionName: { type: String, trim: true, default: '' },
    workerName: { type: String, trim: true, default: '' },
    mobileNumber: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', 'unspecified'], default: 'unspecified' },
    inTime: { type: String, trim: true, default: '09:00' },
    outTime: { type: String, trim: true, default: '18:00' },
    workingHours: { type: Number, default: 8, min: 0 },
    status: { type: String, enum: ['present', 'halfDay', 'fullDay'], default: 'present', index: true },
    dailyWage: { type: Number, required: true, min: 0, default: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    overtimeAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    dailyLabourCost: { type: Number, required: true, min: 0, default: 0 }, // Aliased to totalAmount
    remarks: { type: String, trim: true, maxlength: 500 },
    attachment: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ site: 1, date: -1 });
attendanceSchema.index({ site: 1, contractor: 1, date: -1 });
attendanceSchema.index({ site: 1, profession: 1, date: -1 });
// Prevent duplicate: one attendance record per Worker Master entry per site per date.
// Sparse so null-worker (anonymous) records are excluded from this constraint.
attendanceSchema.index({ site: 1, date: 1, worker: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);



