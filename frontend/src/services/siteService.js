import apiClient from './apiClient';

export const siteService = {
  list: (params) => apiClient.get('/sites', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/sites/${id}`).then((r) => r.data),
  create: (payload) => apiClient.post('/sites', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/sites/${id}`, payload).then((r) => r.data),
  archive: (id) => apiClient.patch(`/sites/${id}/archive`).then((r) => r.data),
  remove: (id) => apiClient.delete(`/sites/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/sites/${id}/restore`).then((r) => r.data),
};
