import apiClient from './apiClient';

export const notificationService = {
  list: async (params) => {
    const res = await apiClient.get('/notifications', { params });
    return res.data;
  },
  markRead: async (id) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await apiClient.post('/notifications/read-all');
    return res.data;
  },
  delete: async (id) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res.data;
  },
  deleteAll: async () => {
    const res = await apiClient.delete('/notifications');
    return res.data;
  }
};
