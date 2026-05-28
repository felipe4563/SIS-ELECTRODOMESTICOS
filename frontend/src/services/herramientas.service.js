import api from '../api/axios';

const BASE = '/herramientas';

export const herramientasService = {
  // ── Backup ──────────────────────────────────────────────────────────────────
  listarBackups:    ()         => api.get(`${BASE}/backup`),
  crearBackup:      ()         => api.post(`${BASE}/backup/crear`),
  restaurarBackup:  (id)       => api.post(`${BASE}/backup/restaurar`, { id }),
  eliminarBackup:   (id)       => api.delete(`${BASE}/backup/${encodeURIComponent(id)}`),
  descargarBackup: (id) =>
    api.get(`${BASE}/backup/${encodeURIComponent(id)}/descargar`, { responseType: 'blob' }),

  // ── Excel ────────────────────────────────────────────────────────────────────
  urlPlantilla:          () => `${api.defaults.baseURL}${BASE}/excel/plantilla`,
  urlExportarProductos:  () => `${api.defaults.baseURL}${BASE}/excel/exportar-productos`,
  importarProductos: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post(`${BASE}/excel/importar-productos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Código de barras ─────────────────────────────────────────────────────────
  urlImagenBarras: (id) => `${api.defaults.baseURL}${BASE}/codigo-barras/imagen/${id}`,
  urlImprimirBarras: (ids, copias = 1) =>
    `${api.defaults.baseURL}${BASE}/codigo-barras/imprimir?ids=${ids.join(',')}&copias=${copias}`,

  // ── Catálogo PDF ─────────────────────────────────────────────────────────────
  getCatalogoMarcas:     ()         => api.get(`${BASE}/catalogo/marcas`),
  getCatalogoCategorias: ()         => api.get(`${BASE}/catalogo/categorias`),
  getCatalogoPDF: (filtros = {}) => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    return api.get(`${BASE}/catalogo/pdf`, { params, responseType: 'blob' });
  },

  // ── Impresora ────────────────────────────────────────────────────────────────
  getImpresora:    ()     => api.get(`${BASE}/impresora`),
  updateImpresora: (data) => api.put(`${BASE}/impresora`, data),

  // ── Plantilla factura ─────────────────────────────────────────────────────────
  getPlantillaFactura:    ()     => api.get(`${BASE}/factura/plantilla`),
  updatePlantillaFactura: (data) => api.put(`${BASE}/factura/plantilla`, data),

  // ── Eliminar registros ────────────────────────────────────────────────────────
  getTablasBorrables: ()              => api.get(`${BASE}/bd/tablas`),
  eliminarRegistros:  (tabla, conf)   => api.post(`${BASE}/bd/eliminar-registros`, { tabla, confirmacion: conf }),
};
