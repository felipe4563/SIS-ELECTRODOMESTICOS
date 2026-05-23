import api from '../api/axios';
export const transferenciasService = {
  getAll:  (params)       => api.get('/inventario/transferencias', { params }),
  getOne:  (id)           => api.get(`/inventario/transferencias/${id}`),
  create:  (data)         => api.post('/inventario/transferencias', data),
  enviar:  (id, data)     => api.post(`/inventario/transferencias/${id}/enviar`, data),
  recibir: (id, data)     => api.post(`/inventario/transferencias/${id}/recibir`, data),
  anular:  (id)           => api.post(`/inventario/transferencias/${id}/anular`),
};
