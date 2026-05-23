import api from '../api/axios';

export const marcasService = {
  getAll:  ()           => api.get('/marcas'),
  create:  (data)       => api.post('/marcas', data),
  update:  (id, data)   => api.put(`/marcas/${id}`, data),
  remove:  (id)         => api.delete(`/marcas/${id}`),
};

export const categoriasService = {
  getAll:  ()           => api.get('/categorias'),
  create:  (data)       => api.post('/categorias', data),
  update:  (id, data)   => api.put(`/categorias/${id}`, data),
  remove:  (id)         => api.delete(`/categorias/${id}`),
};

export const unidadesService = {
  getAll:  ()           => api.get('/unidades'),
  create:  (data)       => api.post('/unidades', data),
  update:  (id, data)   => api.put(`/unidades/${id}`, data),
  remove:  (id)         => api.delete(`/unidades/${id}`),
};
