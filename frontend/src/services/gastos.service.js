import api from '../api/axios';

export const gastosService = {
  // Categorías
  getCategorias:    (params)    => api.get('/gastos/categorias', { params }),
  crearCategoria:   (data)      => api.post('/gastos/categorias', data),
  updateCategoria:  (id, data)  => api.put(`/gastos/categorias/${id}`, data),
  deleteCategoria:  (id)        => api.delete(`/gastos/categorias/${id}`),

  // Gastos
  getGastos:        (params)    => api.get('/gastos', { params }),
  getGasto:         (id)        => api.get(`/gastos/${id}`),
  crearGasto:       (data)      => api.post('/gastos', data),
  updateGasto:      (id, data)  => api.put(`/gastos/${id}`, data),
  aprobarGasto:     (id)        => api.post(`/gastos/${id}/aprobar`),
  pagarGasto:       (id)        => api.post(`/gastos/${id}/pagar`),
  anularGasto:      (id, data)  => api.post(`/gastos/${id}/anular`, data),
  subirComprobante: (id, file)  => {
    const form = new FormData();
    form.append('comprobante', file);
    return api.post(`/gastos/${id}/comprobante`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
