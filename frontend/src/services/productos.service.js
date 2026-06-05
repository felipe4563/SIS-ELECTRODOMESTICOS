import api from '../api/axios';

export const productosService = {
  getAll:   ()          => api.get('/productos'),
  getOne:   (id)        => api.get(`/productos/${id}`),
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

  uploadImagen: (id, file) => {
    const form = new FormData();
    form.append('imagen', file);
    return api.post(`/productos/${id}/imagen`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
