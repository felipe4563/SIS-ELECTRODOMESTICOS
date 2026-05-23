import api from '../api/axios';
export const ajustesService = {
  getAll:  (params) => api.get('/inventario/ajustes', { params }),
  getOne:  (id)     => api.get(`/inventario/ajustes/${id}`),
  create:  (data)   => api.post('/inventario/ajustes', data),
  update:  (id, d)  => api.put(`/inventario/ajustes/${id}`, d),
  aprobar: (id)     => api.post(`/inventario/ajustes/${id}/aprobar`),
  anular:  (id)     => api.post(`/inventario/ajustes/${id}/anular`),
};
