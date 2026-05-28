import api from '../api/axios';

export const cobrosService = {
  getAll:              (params)       => api.get('/cobros', { params }),
  registrar:           (data)         => api.post('/cobros', data),
  update:              (id, data)     => api.put(`/cobros/${id}`, data),
  anular:              (id)           => api.delete(`/cobros/${id}`),
  getRecibo:           (id)           => api.get(`/cobros/${id}/recibo`),
  getCuentasPorCobrar: (params)       => api.get('/cobros/cuentas-por-cobrar', { params }),
  getVentasPendientes: (id_cliente)   => api.get(`/cobros/cliente/${id_cliente}/ventas-pendientes`),
};
