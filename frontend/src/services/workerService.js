import apiClient from './apiClient';
import { buildFormData } from '../utils/format';

export const workerService = {
  list: (params) => apiClient.get('/workers', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/workers/${id}`).then((r) => r.data.data),
  profile: (id) => apiClient.get(`/workers/${id}/profile`).then((r) => r.data.data),
  create: (payload, photoFile) =>
    apiClient.post('/workers', buildFormData(payload, 'photo', photoFile)).then((r) => r.data),
  update: (id, payload, photoFile) =>
    apiClient.put(`/workers/${id}`, buildFormData(payload, 'photo', photoFile)).then((r) => r.data),
  remove: (id) => apiClient.delete(`/workers/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/workers/${id}/restore`).then((r) => r.data),
};
