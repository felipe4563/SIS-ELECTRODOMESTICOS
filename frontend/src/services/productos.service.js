import api from '../api/axios';

export const productosService = {
  getFormData: ()          => api.get('/productos/form-data'),
  getAll:      ()          => api.get('/productos', { params: { limit: 5000 } }),
  getOne:      (id)        => api.get(`/productos/${id}`),
  create:   (data)      => api.post('/productos', data),
  update:   (id, data)  => api.put(`/productos/${id}`, data),
  remove:   (id)        => api.delete(`/productos/${id}`),

  getHistoricoPrecios: (id) => api.get(`/productos/${id}/historico-precios`),
  getStock:            (id) => api.get(`/productos/${id}/stock`),

  importarExcel: (file) => {
    const form = new FormData();
    form.append('archivo', file);
    return api.post('/productos/importar/excel', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getImagenes:        (id)          => api.get(`/productos/${id}/imagenes`),
  setPrincipalImagen: (id, idImg)   => api.put(`/productos/${id}/imagenes/${idImg}/principal`),
  deleteImagen:       (id, idImg)   => api.delete(`/productos/${id}/imagenes/${idImg}`),

  uploadImagen: (id, file) => {
    const form = new FormData();
    form.append('imagen', file);
    return api.post(`/productos/${id}/imagenes`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getSeriesProducto: (id_producto, id_deposito) => api.get(`/productos/${id_producto}/series/${id_deposito}`),
  cargarSerieManual: (id_producto, id_deposito, numero_serie, file) => {
    const form = new FormData();
    form.append('id_deposito', id_deposito);
    form.append('numero_serie', numero_serie);
    if (file) form.append('imagen', file);
    return api.post(`/productos/${id_producto}/series`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
