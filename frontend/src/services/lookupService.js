import apiClient from './apiClient';

export const lookupService = {
  professions: () => apiClient.get('/lookups/professions').then((r) => r.data.data),
  materialCategories: () => apiClient.get('/lookups/material-categories').then((r) => r.data.data),
  expenseCategories: () => apiClient.get('/lookups/expense-categories').then((r) => r.data.data),
  suppliers: (siteId) => apiClient.get('/lookups/suppliers', { params: { siteId } }).then((r) => r.data.data),
  activeSites: () => apiClient.get('/lookups/sites').then((r) => r.data.data),
  createProfession: (name) => apiClient.post('/lookups/professions', { name }).then((r) => r.data),
  createMaterialCategory: (name) => apiClient.post('/lookups/material-categories', { name }).then((r) => r.data),
  createExpenseCategory: (name) => apiClient.post('/lookups/expense-categories', { name }).then((r) => r.data),
};
