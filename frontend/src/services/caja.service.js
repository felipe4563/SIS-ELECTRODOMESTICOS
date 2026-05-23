import api from '../api/axios';

export const cajaService = {
  getCajas:    ()           => api.get('/caja'),
  getArqueos:  (params)     => api.get('/caja/arqueos', { params }),
  getArqueo:   (id)         => api.get(`/caja/arqueos/${id}`),
  abrirCaja:   (id, data)   => api.post(`/caja/${id}/abrir`, data),
  cerrarCaja:  (id, data)   => api.post(`/caja/arqueos/${id}/cerrar`, data),
  forzarCierre:(id, data)   => api.post(`/caja/arqueos/${id}/forzar-cierre`, data),
};
