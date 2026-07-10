import api from '../api/axios';

export const rolesService = {
  getAll:                ()              => api.get('/roles'),
  getPermisos:           ()              => api.get('/roles/permisos'),
  getRolPermisos:        (id)            => api.get(`/roles/${id}/permisos`),
  getRolPermisosDetalle: (id)            => api.get(`/roles/${id}/permisos-detalle`),
  create:                (data)          => api.post('/roles', data),
  update:                (id, data)      => api.put(`/roles/${id}`, data),
  remove:                (id)            => api.delete(`/roles/${id}`),
  asignarPermisos:       (id, permisos)  => api.put(`/roles/${id}/permisos`, { permisos }),
};

export const usuariosService = {
  getAll:           ()           => api.get('/usuarios'),
  getFormData:      ()           => api.get('/usuarios/form-data'),
  getOne:           (id)         => api.get(`/usuarios/${id}`),
  create:           (data)       => api.post('/usuarios', data),
  update:           (id, data)   => api.put(`/usuarios/${id}`, data),
  remove:           (id)         => api.delete(`/usuarios/${id}`),
  resetPassword:    (id, data)   => api.post(`/usuarios/${id}/reset-password`, data),
  asignarSucursales:(id, sucursales, id_sucursal_default) => api.put(`/usuarios/${id}/sucursales`, { sucursales, id_sucursal_default }),
  cerrarSesiones:   (id)         => api.post(`/usuarios/${id}/cerrar-sesiones`),
  updateMiPerfil:   (data)       => api.put('/usuarios/mi-perfil', data),
};
