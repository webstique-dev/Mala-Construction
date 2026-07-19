import apiClient from './apiClient';

export const dashboardService = {
  get: (params) => apiClient.get('/dashboard', { params }).then((r) => r.data.data),
};
