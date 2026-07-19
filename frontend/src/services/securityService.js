import apiClient from './apiClient';

export const securityService = {
  listSessions: async () => {
    const res = await apiClient.get('/security/sessions');
    return res.data;
  },
  terminateSession: async (id) => {
    const res = await apiClient.delete(`/security/sessions/${id}`);
    return res.data;
  },
  terminateOtherSessions: async () => {
    const res = await apiClient.delete('/security/sessions');
    return res.data;
  }
};
