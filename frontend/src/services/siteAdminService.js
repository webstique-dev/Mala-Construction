import apiClient from './apiClient';

/** Builds multipart/form-data when a photo file is present, plain object otherwise. */
function toPayload(data) {
  if (!data.photoFile) {
    const { photoFile: _photoFile, ...rest } = data;
    return rest;
  }
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'photoFile') formData.append('photo', value);
    else if (value !== undefined && value !== null) formData.append(key, value);
  });
  return formData;
}

export const siteAdminService = {
  list: (params) => apiClient.get('/site-admins', { params }).then((r) => r.data),
  get: (id) => apiClient.get(`/site-admins/${id}`).then((r) => r.data),
  create: (data) => apiClient.post('/site-admins', toPayload(data)).then((r) => r.data),
  update: (id, data) => apiClient.put(`/site-admins/${id}`, toPayload(data)).then((r) => r.data),
  resetPassword: (id) => apiClient.post(`/site-admins/${id}/reset-password`).then((r) => r.data),
  setStatus: (id, status) => apiClient.patch(`/site-admins/${id}/status`, { status }).then((r) => r.data),
  reassignSite: (id, siteId) => apiClient.patch(`/site-admins/${id}/reassign-site`, { siteId }).then((r) => r.data),
  remove: (id) => apiClient.delete(`/site-admins/${id}`).then((r) => r.data),
  restore: (id) => apiClient.post(`/site-admins/${id}/restore`).then((r) => r.data),
};
