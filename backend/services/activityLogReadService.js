const activityLogRepository = require('../repositories/activityLog.repository');
const { resolveSiteScope } = require('../utils/siteScope');
const { buildPaginatedResult, buildDateRangeFilter } = require('../utils/pagination');

async function listActivityLogs(queryParams, actor) {
  const { page, limit, siteId, action, entityType, startDate, endDate } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const query = {
    ...siteFilter,
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...buildDateRangeFilter(startDate, endDate, 'createdAt'),
  };

  const { items, total } = await activityLogRepository.findAll(query, { page, limit });
  return buildPaginatedResult(items, total, page, limit);
}

module.exports = { listActivityLogs };
