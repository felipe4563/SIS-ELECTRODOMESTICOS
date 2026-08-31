import api from '../api/axios';

export const comprasService = {
  getFormData:     ()                   => api.get('/compras/form-data'),
  getAll:          (params)             => api.get('/compras', { params }),
  getOne:          (id)                 => api.get(`/compras/${id}`),
  create:          (data)               => api.post('/compras', data),
  update:          (id, data)           => api.put(`/compras/${id}`, data),
  actualizarFactura: (id, numero_factura) => api.put(`/compras/${id}/factura`, { numero_factura }),
  subirFacturaImagen: (id, file) => {
    const form = new FormData();
    form.append('imagen', file);
    return api.post(`/compras/${id}/factura-imagen`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  subirImagenDetalle: (id, idDetalle, file) => {
    const form = new FormData();
    form.append('imagen', file);
    return api.post(`/compras/${id}/detalle/${idDetalle}/imagen`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  agregarSerieDetalle: (id, idDetalle, numero_serie, file) => {
    const form = new FormData();
    form.append('numero_serie', numero_serie);
    if (file) form.append('imagen', file);
    return api.post(`/compras/${id}/detalle/${idDetalle}/series`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  eliminarSerieDetalle: (id, idDetalle, idSerie) => api.delete(`/compras/${id}/detalle/${idDetalle}/series/${idSerie}`),
  aprobar:         (id)                 => api.post(`/compras/${id}/aprobar`),
  confirmar:       (id, data)           => api.post(`/compras/${id}/confirmar`, data),
  recibir:         (id, data)           => api.post(`/compras/${id}/recibir`, data),
  anular:          (id)                 => api.post(`/compras/${id}/anular`),
  createPago:      (id, data, comprobanteFile) => {
    if (!comprobanteFile) return api.post(`/compras/${id}/pagos`, data);
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, v); });
    form.append('comprobante', comprobanteFile);
    return api.post(`/compras/${id}/pagos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  anularPago:      (id, idPago)         => api.delete(`/compras/${id}/pagos/${idPago}`),
  actualizarCuota: (id, idCuota, data)  => api.put(`/compras/${id}/cuotas/${idCuota}`, data),
};
