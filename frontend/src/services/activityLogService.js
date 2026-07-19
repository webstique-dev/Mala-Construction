import apiClient from './apiClient';

export const activityLogService = {
  list: (params) => apiClient.get('/activity-logs', { params }).then((r) => r.data),
};
