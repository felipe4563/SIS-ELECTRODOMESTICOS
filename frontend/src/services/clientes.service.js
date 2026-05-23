import api from '../api/axios';

export const clientesService = {
  getAll:  ()           => api.get('/clientes'),
  getOne:  (id)         => api.get(`/clientes/${id}`),
  create:  (data)       => api.post('/clientes', data),
  update:  (id, data)   => api.put(`/clientes/${id}`, data),
  remove:  (id)         => api.delete(`/clientes/${id}`),

  updateCredito: (id, data) => api.patch(`/clientes/${id}/credito`, data),

  getDirecciones:   (idC)            => api.get(`/clientes/${idC}/direcciones`),
  createDireccion:  (idC, data)      => api.post(`/clientes/${idC}/direcciones`, data),
  updateDireccion:  (idC, idD, data) => api.put(`/clientes/${idC}/direcciones/${idD}`, data),
  deleteDireccion:  (idC, idD)       => api.delete(`/clientes/${idC}/direcciones/${idD}`),
};
