import apiClient from './apiClient';

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials).then((r) => r.data),
  logout: () => apiClient.post('/auth/logout').then((r) => r.data),
  logoutAllDevices: () => apiClient.post('/auth/logout-all').then((r) => r.data),
  me: () => apiClient.get('/auth/me').then((r) => r.data),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload).then((r) => r.data),
};
