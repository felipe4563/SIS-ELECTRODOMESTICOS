import api from '../api/axios';

export const inventarioService = {
  getFormData:         ()          => api.get('/inventario/form-data'),
  getStockDeposito:    (id)        => api.get(`/inventario/stock-deposito/${id}`),
  getStockConsolidado: ()          => api.get('/inventario/stock'),
  editarStockMinimo:   (id, data)  => api.put(`/inventario/stock-minimo/${id}`, data),
  getKardex:           (params)    => api.get('/inventario/kardex', { params }),
  getAlertas:          (params)    => api.get('/inventario/alertas', { params }),
  atenderAlerta:       (id)        => api.patch(`/inventario/alertas/${id}/atender`),
};
