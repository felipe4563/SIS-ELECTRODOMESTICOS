import api from '../api/axios';

export const depositosService = {
  getAll: () => api.get('/depositos'),
  getOne: (id) => api.get(`/depositos/${id}`),
};
