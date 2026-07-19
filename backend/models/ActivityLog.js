const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, enum: ['super_admin', 'site_admin'], required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'approve', 'login', 'logout', 'passwordReset', 'other'],
      required: true,
    },
    entityType: { type: String, required: true }, // e.g. 'Material', 'Worker', 'Site'
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', default: null },
    // Shallow before/after snapshots for diffing in the audit UI. Kept intentionally
    // loose-typed (Mixed) since every entity has a different shape.
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

activityLogSchema.index({ site: 1, createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
