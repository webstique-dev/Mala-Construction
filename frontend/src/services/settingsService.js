import apiClient from './apiClient';

export const settingsService = {
  getUserSettings: async () => {
    const res = await apiClient.get('/settings/user');
    return res.data;
  },
  updateUserSettings: async (formData) => {
    const res = await apiClient.put('/settings/user', formData);
    return res.data;
  },
  getSystemSettings: async () => {
    const res = await apiClient.get('/settings/system');
    return res.data;
  },
  updateSystemSettings: async (formData) => {
    const res = await apiClient.put('/settings/system', formData);
    return res.data;
  }
};
