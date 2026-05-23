import api from '../api/axios';

export const comprasService = {
  getAll:     (params)        => api.get('/compras', { params }),
  getOne:     (id)            => api.get(`/compras/${id}`),
  create:     (data)          => api.post('/compras', data),
  update:     (id, data)      => api.put(`/compras/${id}`, data),
  confirmar:  (id, data)      => api.post(`/compras/${id}/confirmar`, data),
  recibir:    (id, data)      => api.post(`/compras/${id}/recibir`, data),
  anular:     (id)            => api.post(`/compras/${id}/anular`),
  createPago: (id, data)      => api.post(`/compras/${id}/pagos`, data),
  anularPago: (id, idPago)    => api.delete(`/compras/${id}/pagos/${idPago}`),
};
