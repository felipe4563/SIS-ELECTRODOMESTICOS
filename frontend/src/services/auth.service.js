import api from '../api/axios';

const authService = {
  login: (identificador, contrasena) =>
    api.post('/auth/login', { identificador, contrasena }),

  logout: () =>
    api.post('/auth/logout'),

  cambiarContrasena: ({ contrasena_actual, contrasena_nueva }) =>
    api.post('/auth/cambiar-contrasena', { contrasena_actual, contrasena_nueva }),

  me: () =>
    api.get('/auth/me'),
};

export default authService;
