const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Recipient - a specific user, or null to mean "all super admins" (broadcast).
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    type: {
      type: String,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    // Optional link back to the source document (e.g. a WorkerPayment or Material).
    relatedEntity: {
      kind: { type: String, default: null },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    isRead: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
