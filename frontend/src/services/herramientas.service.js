import api from '../api/axios';

const BASE = '/herramientas';

export const herramientasService = {
  // ── Backup ──────────────────────────────────────────────────────────────────
  listarBackups:   ()    => api.get(`${BASE}/backup`),
  crearBackup:     ()    => api.post(`${BASE}/backup/crear`),
  restaurarBackup: (id)  => api.post(`${BASE}/backup/restaurar`, { id }),
  eliminarBackup:  (id)  => api.delete(`${BASE}/backup/${encodeURIComponent(id)}`),
  descargarBackup: (id)  => api.get(`${BASE}/backup/${encodeURIComponent(id)}/descargar`, { responseType: 'blob' }),

  // ── Excel — solo importar ────────────────────────────────────────────────────
  importarProductos: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return api.post(`${BASE}/excel/importar-productos`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Catálogo PDF ─────────────────────────────────────────────────────────────
  getCatalogoMarcas:     ()            => api.get(`${BASE}/catalogo/marcas`),
  getCatalogoCategorias: ()            => api.get(`${BASE}/catalogo/categorias`),
  getCatalogoSucursales: ()            => api.get(`${BASE}/catalogo/sucursales`),
  getCatalogoPDF: (filtros = {}) => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    return api.get(`${BASE}/catalogo/pdf`, { params, responseType: 'blob' });
  },
};
