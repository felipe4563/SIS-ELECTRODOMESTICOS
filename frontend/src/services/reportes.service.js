import api from '../api/axios';

const R = '/reportes';

export const reportesService = {
  getDashboard:        ()  => api.get(`${R}/dashboard`),
  getVentas:           (p) => api.get(`${R}/ventas`,            { params: p }),
  getVentasVendedor:   (p) => api.get(`${R}/ventas-vendedor`,   { params: p }),
  getVentasCliente:    (p) => api.get(`${R}/ventas-cliente`,    { params: p }),
  getVentasProducto:   (p) => api.get(`${R}/ventas-producto`,   { params: p }),
  getCompras:          (p) => api.get(`${R}/compras`,           { params: p }),
  getCuentasCobrar:    ()  => api.get(`${R}/cuentas-cobrar`),
  getCuentasPagar:     ()  => api.get(`${R}/cuentas-pagar`),
  getRentabilidad:     (p) => api.get(`${R}/rentabilidad`,      { params: p }),
  getEstadoResultados: (p) => api.get(`${R}/estado-resultados`, { params: p }),
  getBonosVendedores:  (p) => api.get(`${R}/bonos-vendedores`,  { params: p }),
};
