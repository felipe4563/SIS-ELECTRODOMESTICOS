import api from '../api/axios';

export const inventarioService = {
  getStockConsolidado: ()       => api.get('/inventario/stock'),
  getKardex:           (params) => api.get('/inventario/kardex', { params }),
  getAlertas:          (params) => api.get('/inventario/alertas', { params }),
  atenderAlerta:       (id)     => api.patch(`/inventario/alertas/${id}/atender`),
};
