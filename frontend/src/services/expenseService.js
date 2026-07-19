import apiClient from './apiClient';
import { buildFormData } from '../utils/format';

export const expenseService = {
  list: (params) => apiClient.get('/expenses', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/expenses/${id}`).then((r) => r.data.data),
  create: (payload, receiptFile) =>
    apiClient.post('/expenses', buildFormData(payload, 'receipt', receiptFile)).then((r) => r.data),
  update: (id, payload, receiptFile) =>
    apiClient.put(`/expenses/${id}`, buildFormData(payload, 'receipt', receiptFile)).then((r) => r.data),
  remove: (id) => apiClient.delete(`/expenses/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/expenses/${id}/restore`).then((r) => r.data),
  approve: (id) => apiClient.patch(`/expenses/${id}/approve`).then((r) => r.data),
  reject: (id) => apiClient.patch(`/expenses/${id}/reject`).then((r) => r.data),
};
