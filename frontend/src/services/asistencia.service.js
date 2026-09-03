import api from '../api/axios';

export const asistenciaService = {
  getHoy:         ()            => api.get('/asistencia/hoy'),
  marcarEntrada:  (coords)      => api.post('/asistencia/entrada', coords),
  marcarSalida:   (coords)      => api.post('/asistencia/salida', coords),
  getAsistencias: (params)      => api.get('/asistencia', { params }),
  justificar:     (id, motivo)  => api.put(`/asistencia/${id}/justificar`, { motivo }),
};
