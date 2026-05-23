import api from '../api/axios';

export const empresaService = {
  get:    ()        => api.get('/empresa'),
  update: (id, data) => api.put(`/empresa/${id}`, data),
};

export const sucursalesService = {
  getAll:  ()        => api.get('/sucursales'),
  getOne:  (id)      => api.get(`/sucursales/${id}`),
  create:  (data)    => api.post('/sucursales', data),
  update:  (id, data) => api.put(`/sucursales/${id}`, data),
  remove:  (id)      => api.delete(`/sucursales/${id}`),
};

export const depositosService = {
  getAll:  ()        => api.get('/depositos'),
  getOne:  (id)      => api.get(`/depositos/${id}`),
  create:  (data)    => api.post('/depositos', data),
  update:  (id, data) => api.put(`/depositos/${id}`, data),
  remove:  (id)      => api.delete(`/depositos/${id}`),
};

export const monedasService = {
  getAll:  ()        => api.get('/monedas'),
  create:  (data)    => api.post('/monedas', data),
  update:  (id, data) => api.put(`/monedas/${id}`, data),
  remove:  (id)      => api.delete(`/monedas/${id}`),
};

export const tiposCambioService = {
  getAll:  ()     => api.get('/tipos-cambio'),
  getHoy:  ()     => api.get('/tipos-cambio/hoy'),
  create:  (data) => api.post('/tipos-cambio', data),
  remove:  (id)   => api.delete(`/tipos-cambio/${id}`),
};

export const parametrosService = {
  getAll:  ()           => api.get('/configuracion'),
  update:  (clave, valor) => api.put(`/configuracion/${clave}`, { valor }),
};
