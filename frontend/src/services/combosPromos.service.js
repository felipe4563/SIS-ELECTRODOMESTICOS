import api from '../api/axios';

export const combosService = {
  getAll:          (params)      => api.get('/combos', { params }),
  getOne:          (id)          => api.get(`/combos/${id}`),
  create:          (data)        => api.post('/combos', data),
  update:          (id, data)    => api.put(`/combos/${id}`, data),
  remove:          (id)          => api.delete(`/combos/${id}`),
  getDetalle:      (id)          => api.get(`/combos/${id}/productos`),
  updateDetalle:   (id, data)    => api.post(`/combos/${id}/productos`, data),
};

export const promocionesService = {
  getAll:              (params)   => api.get('/promociones', { params }),
  getOne:              (id)       => api.get(`/promociones/${id}`),
  getVigentes:         ()         => api.get('/promociones/vigentes'),
  create:              (data)     => api.post('/promociones', data),
  update:              (id, data) => api.put(`/promociones/${id}`, data),
  remove:              (id)       => api.delete(`/promociones/${id}`),
  getAplicaciones:     (id)       => api.get(`/promociones/${id}/aplicaciones`),
  updateAplicaciones:  (id, data) => api.post(`/promociones/${id}/aplicaciones`, data),
};
