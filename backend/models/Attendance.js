const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'halfDay', 'absent'], required: true },
    overtimeHours: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// One attendance record per worker per day - prevents accidental double-marking.
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });
attendanceSchema.index({ site: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
