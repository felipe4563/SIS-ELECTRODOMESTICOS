import api from '../api/axios';

export const asistenciaService = {
  getHoy:         ()            => api.get('/asistencia/hoy'),
  getMiHistorial: (dias = 7)    => api.get('/asistencia/mi-historial', { params: { dias } }),
  marcarEntrada:  (coords)      => api.post('/asistencia/entrada', coords),
  marcarSalida:   (coords)      => api.post('/asistencia/salida', coords),
  getAsistencias: (params)      => api.get('/asistencia', { params }),
  justificar:     (id, motivo)  => api.put(`/asistencia/${id}/justificar`, { motivo }),
};
