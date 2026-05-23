import api from '../api/axios';

export const auditoriaService = {
  getAuditoria:     (p)  => api.get('/auditoria',          { params: p }),
  getTablas:        ()   => api.get('/auditoria/tablas'),
  getUsuarios:      ()   => api.get('/auditoria/usuarios'),
  getSesiones:      ()   => api.get('/auditoria/sesiones'),
  cerrarSesion:     (id) => api.delete(`/auditoria/sesiones/${id}`),
};
