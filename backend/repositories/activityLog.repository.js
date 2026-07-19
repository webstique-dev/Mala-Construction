const ActivityLog = require('../models/ActivityLog');

const populateFields = [
  { path: 'actor', select: 'name email role' },
  { path: 'site', select: 'name code' },
];

async function findAll(query, { page, limit }) {
  const skip = (page - 1) * limit;
  const sort = { createdAt: -1 };
  const [items, total] = await Promise.all([
    ActivityLog.find(query).populate(populateFields).sort(sort).skip(skip).limit(limit),
    ActivityLog.countDocuments(query),
  ]);
  return { items, total };
}

module.exports = { findAll };
