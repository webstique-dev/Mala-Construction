const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    /**
     * Human-readable site-prefixed Worker ID, e.g. "MCH-0001".
     * Auto-generated in workerService.createWorker using the site's code.
     * Unique per site; sparse so existing records without it are unaffected.
     */
    workerId: { type: String, trim: true, index: true },
    photo: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    profession: { type: mongoose.Schema.Types.ObjectId, ref: 'Profession', required: true },
    dailyWage: { type: Number, required: true, min: 0 },
    joiningDate: { type: Date, required: true },
    address: { type: String, trim: true },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

workerSchema.index({ site: 1, status: 1 });
workerSchema.index({ name: 'text', phone: 'text' });
// Unique workerId per site; sparse so legacy records without workerId are not rejected
workerSchema.index({ site: 1, workerId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Worker', workerSchema);
