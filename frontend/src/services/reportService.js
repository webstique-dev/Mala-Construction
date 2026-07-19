import apiClient from './apiClient';

export const reportService = {
  generate: async (params) => {
    const isJson = params.format === 'json';
    const response = await apiClient.get('/reports/generate', {
      params,
      ...(isJson ? {} : { responseType: 'blob' })
    });
    return isJson ? response.data : response;
  },
};
