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

  getStockConsolidado: (p) => api.get(`${R}/stock-consolidado`, { params: p }),
  getKardexProducto:   (id, p) => api.get(`${R}/kardex/${id}`,  { params: p }),
  getArqueosCaja:      (p) => api.get(`${R}/arqueos-caja`,      { params: p }),
  getGastosCategoria:  (p) => api.get(`${R}/gastos-categoria`,  { params: p }),
  getTopProductos:     (p) => api.get(`${R}/top-productos`,     { params: p }),

  exportarReporte: (tipo, formato, params = {}) =>
    api.get(`${R}/exportar`, {
      params: { tipo, formato, ...params },
      responseType: 'blob',
      timeout: 30000,
    }),
};
