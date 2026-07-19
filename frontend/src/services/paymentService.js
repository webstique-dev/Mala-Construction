import apiClient from './apiClient';
import { buildFormData } from '../utils/format';

export const paymentService = {
  list: (params) => apiClient.get('/payments', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/payments/${id}`).then((r) => r.data.data),
  create: (payload, receiptFile) =>
    apiClient.post('/payments', buildFormData(payload, 'receipt', receiptFile)).then((r) => r.data),
  update: (id, payload, receiptFile) =>
    apiClient.put(`/payments/${id}`, buildFormData(payload, 'receipt', receiptFile)).then((r) => r.data),
  remove: (id) => apiClient.delete(`/payments/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/payments/${id}/restore`).then((r) => r.data),
};
