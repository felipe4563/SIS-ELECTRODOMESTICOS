import api from '../api/axios';

export const cotizacionesService = {
  getAll:   (params) => api.get('/cotizaciones', { params }),
  getOne:   (id)     => api.get(`/cotizaciones/${id}`),
  create:   (data)   => api.post('/cotizaciones', data),
  update:   (id, data) => api.put(`/cotizaciones/${id}`, data),
  emitir:   (id)     => api.post(`/cotizaciones/${id}/emitir`),
  aprobar:  (id)     => api.post(`/cotizaciones/${id}/aprobar`),
  rechazar: (id)     => api.post(`/cotizaciones/${id}/rechazar`),
  convertir:(id, data) => api.post(`/cotizaciones/${id}/convertir-venta`, data),
  getPDF:   (id)     => api.get(`/cotizaciones/${id}/pdf`),
};
