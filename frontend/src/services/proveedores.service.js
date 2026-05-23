import api from '../api/axios';

export const proveedoresService = {
  getAll:  ()           => api.get('/proveedores'),
  getOne:  (id)         => api.get(`/proveedores/${id}`),
  create:  (data)       => api.post('/proveedores', data),
  update:  (id, data)   => api.put(`/proveedores/${id}`, data),
  remove:  (id)         => api.delete(`/proveedores/${id}`),

  getContactos:   (idP)            => api.get(`/proveedores/${idP}/contactos`),
  createContacto: (idP, data)      => api.post(`/proveedores/${idP}/contactos`, data),
  updateContacto: (idP, idC, data) => api.put(`/proveedores/${idP}/contactos/${idC}`, data),
  deleteContacto: (idP, idC)       => api.delete(`/proveedores/${idP}/contactos/${idC}`),

  getCuentas:   (idP)            => api.get(`/proveedores/${idP}/cuentas`),
  createCuenta: (idP, data)      => api.post(`/proveedores/${idP}/cuentas`, data),
  updateCuenta: (idP, idC, data) => api.put(`/proveedores/${idP}/cuentas/${idC}`, data),
  deleteCuenta: (idP, idC)       => api.delete(`/proveedores/${idP}/cuentas/${idC}`),
};
