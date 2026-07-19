const { escapeRegex } = require('./regex');

function buildPaginatedResult(items, total, page, limit) {
  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit) || 1,
  };
}

function buildSort(sortBy, sortOrder, allowedFields, defaultField = 'createdAt') {
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  return { [field]: sortOrder === 'asc' ? 1 : -1 };
}

function buildTextSearchFilter(search, fields) {
  if (!search) return {};
  const regex = new RegExp(escapeRegex(search), 'i');
  return { $or: fields.map((f) => ({ [f]: regex })) };
}

function buildDateRangeFilter(startDate, endDate, field = 'date') {
  const filter = {};
  if (startDate || endDate) filter[field] = {};
  if (startDate) filter[field].$gte = new Date(startDate);
  if (endDate) filter[field].$lte = new Date(endDate);
  return filter;
}

module.exports = { buildPaginatedResult, buildSort, buildTextSearchFilter, buildDateRangeFilter };
