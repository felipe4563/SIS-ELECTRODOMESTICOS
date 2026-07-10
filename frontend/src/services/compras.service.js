import api from '../api/axios';

export const comprasService = {
  getFormData:     ()                   => api.get('/compras/form-data'),
  getAll:          (params)             => api.get('/compras', { params }),
  getOne:          (id)                 => api.get(`/compras/${id}`),
  create:          (data)               => api.post('/compras', data),
  update:          (id, data)           => api.put(`/compras/${id}`, data),
  aprobar:         (id)                 => api.post(`/compras/${id}/aprobar`),
  confirmar:       (id, data)           => api.post(`/compras/${id}/confirmar`, data),
  recibir:         (id, data)           => api.post(`/compras/${id}/recibir`, data),
  anular:          (id)                 => api.post(`/compras/${id}/anular`),
  createPago:      (id, data)           => api.post(`/compras/${id}/pagos`, data),
  anularPago:      (id, idPago)         => api.delete(`/compras/${id}/pagos/${idPago}`),
  actualizarCuota: (id, idCuota, data)  => api.put(`/compras/${id}/cuotas/${idCuota}`, data),
};
