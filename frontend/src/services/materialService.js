import apiClient from './apiClient';
import { buildFormData } from '../utils/format';

export const materialService = {
  list: (params) => apiClient.get('/materials', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/materials/${id}`).then((r) => r.data.data),
  create: (payload, invoiceFile) =>
    apiClient.post('/materials', buildFormData(payload, 'invoice', invoiceFile)).then((r) => r.data),
  update: (id, payload, invoiceFile) =>
    apiClient.put(`/materials/${id}`, buildFormData(payload, 'invoice', invoiceFile)).then((r) => r.data),
  remove: (id) => apiClient.delete(`/materials/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/materials/${id}/restore`).then((r) => r.data),
};
