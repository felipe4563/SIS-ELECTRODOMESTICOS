import api from '../api/axios';

export const ventasService = {
  getAll:   (params)         => api.get('/ventas', { params }),
  getOne:   (id)             => api.get(`/ventas/${id}`),
  preview:  (id)             => api.get(`/ventas/${id}/preview`),
  create:   (data)           => api.post('/ventas', data),
  update:   (id, data)       => api.put(`/ventas/${id}`, data),
  emitir:   (id, data)       => api.post(`/ventas/${id}/emitir`, data),
  cobrar:   (id, data)       => api.post(`/ventas/${id}/cobrar`, data),
  anular:   (id)             => api.post(`/ventas/${id}/anular`),
  ticket:   (id)             => api.get(`/ventas/${id}/ticket`),

  formData:       ()          => api.get('/ventas/form-data'),
  stockDeposito:  (id)        => api.get(`/ventas/stock-deposito/${id}`),
  productoRapido: (data)     => api.post('/ventas/agregar-producto-rapido', data),

  crearDevolucion:    (id, data)          => api.post(`/ventas/${id}/devoluciones`, data),
  aprobarDevolucion:  (id_devolucion)     => api.post(`/ventas/devoluciones/${id_devolucion}/aprobar`),
  rechazarDevolucion: (id_devolucion)     => api.post(`/ventas/devoluciones/${id_devolucion}/rechazar`),

  anularCobro:     (id_pago)       => api.delete(`/ventas/cobros/${id_pago}`),

  actualizarSerie: (id_detalle, numero_serie) => api.put(`/ventas/detalle/${id_detalle}/serie`, { numero_serie }),

  subirImagenSerie: (id_detalle, file) => {
    const form = new FormData();
    form.append('imagen_serie', file);
    return api.post(`/ventas/detalle/${id_detalle}/imagen-serie`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
