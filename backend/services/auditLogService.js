const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Fire-and-forget-ish audit write. Failures are logged but never thrown -
 * an audit log outage should not take down the actual mutation it's recording.
 */
async function recordActivity({
  actor,
  action,
  entityType,
  entityId = null,
  site = null,
  before = null,
  after = null,
  req = null,
}) {
  try {
    await ActivityLog.create({
      actor: actor._id,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      site,
      before,
      after,
      ipAddress: req?.ip ?? null,
      userAgent: req?.headers?.['user-agent'] ?? null,
    });
  } catch (err) {
    logger.error(`Failed to write audit log for ${action} ${entityType}: ${err.message}`);
  }
}

module.exports = { recordActivity };
