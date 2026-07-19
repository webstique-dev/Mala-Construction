/**
 * Soft Delete Helpers
 * Reusable utilities for implementing soft delete across all repositories
 */

/**
 * Add default soft delete filter to queries
 * @param {Object} query - existing query filter
 * @param {boolean} includeDeleted - whether to include deleted records
 * @returns {Object} modified query with soft delete filter
 */
function addSoftDeleteFilter(query = {}, includeDeleted = false) {
  if (includeDeleted) {
    return query;
  }
  return { ...query, isDeleted: false };
}

/**
 * Create soft delete update payload
 * @param {string} userId - ID of user performing the delete
 * @returns {Object} MongoDB update payload for soft delete
 */
function createSoftDeletePayload(userId) {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId,
  };
}

/**
 * Create restore payload
 * @returns {Object} MongoDB update payload for restore/undelete
 */
function createRestorePayload() {
  return {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  };
}

module.exports = {
  addSoftDeleteFilter,
  createSoftDeletePayload,
  createRestorePayload,
};
