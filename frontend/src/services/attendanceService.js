import apiClient from './apiClient';

export const attendanceService = {
  list: (params) => apiClient.get('/attendance', { params }).then((r) => r.data),
  stats: (params) => apiClient.get('/attendance/stats', { params }).then((r) => r.data.data),
  get: (id) => apiClient.get(`/attendance/${id}`).then((r) => r.data.data),
  record: (payload) => apiClient.post('/attendance', payload).then((r) => r.data),
  batchRecord: (payload) => apiClient.post('/attendance/batch', payload).then((r) => r.data),
  weeklyReport: (params) => apiClient.get('/attendance/weekly-report', { params }).then((r) => r.data.data),
  contractors: (params) => apiClient.get('/attendance/contractors', { params }).then((r) => r.data.data),
  update: (id, payload) => apiClient.put(`/attendance/${id}`, payload).then((r) => r.data),
  remove: (id) => apiClient.delete(`/attendance/${id}`).then((r) => r.data),
};
