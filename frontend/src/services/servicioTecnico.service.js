import api from '../api/axios';

export const servicioTecnicoService = {
  // Form data
  getFormData:   (params)   => api.get('/servicio-tecnico/form-data', { params }),

  // Órdenes
  getAll:        (params)   => api.get('/servicio-tecnico', { params }),
  getOne:        (id)       => api.get(`/servicio-tecnico/${id}`),
  create:        (data)     => api.post('/servicio-tecnico', data),
  update:        (id, data) => api.put(`/servicio-tecnico/${id}`, data),

  // Acciones de estado
  cambiarEstado: (id, data) => api.put(`/servicio-tecnico/${id}/estado`, data),
  entregar:      (id, data) => api.put(`/servicio-tecnico/${id}/entregar`, data),
  anular:        (id, data) => api.put(`/servicio-tecnico/${id}/anular`, data),

  // Recibo
  getRecibo:     (id)       => api.get(`/servicio-tecnico/${id}/recibo`),

  // Reporte
  getReporte:       (params) => api.get('/servicio-tecnico/reportes',        { params }),
  getReporteDetalle:(params) => api.get('/servicio-tecnico/reportes/detalle', { params }),

  // Técnicos externos
  getTecnicos:   (params)   => api.get('/servicio-tecnico/tecnicos', { params }),
  createTecnico: (data)     => api.post('/servicio-tecnico/tecnicos', data),
  updateTecnico: (id, data) => api.put(`/servicio-tecnico/tecnicos/${id}`, data),
  toggleTecnico: (id)       => api.put(`/servicio-tecnico/tecnicos/${id}/toggle`),
};
