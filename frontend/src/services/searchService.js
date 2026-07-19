import apiClient from './apiClient';

export const searchService = {
  search: (params) => apiClient.get('/search', { params }).then((r) => r.data.data),
};
