import api from '../api/axios';

export const cajaService = {
  // Cajas
  getCajas:     ()           => api.get('/caja'),
  crearCaja:    (data)       => api.post('/caja', data),
  updateCaja:   (id, data)   => api.put(`/caja/${id}`, data),

  // Arqueos
  getArqueos:    (params)    => api.get('/caja/arqueos', { params }),
  getArqueoActual: ()        => api.get('/caja/arqueos/actual'),
  getArqueo:    (id)         => api.get(`/caja/arqueos/${id}`),
  abrirCaja:    (id, data)   => api.post(`/caja/${id}/abrir`, data),
  cerrarCaja:   (id, data)   => api.post(`/caja/arqueos/${id}/cerrar`, data),
  forzarCierre: (id, data)   => api.post(`/caja/arqueos/${id}/forzar-cierre`, data),
};
