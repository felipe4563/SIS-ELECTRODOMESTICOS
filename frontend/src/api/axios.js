import axios from 'axios';

// ← Toma la URL del .env automáticamente según el entorno
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000, // 10 segundos máximo por request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request: adjuntar token ───────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: manejar errores globales ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido → limpiar sesión y notificar a AuthContext vía evento
      // CustomEvent en lugar de window.location.href para mantener la navegación SPA
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.dispatchEvent(new CustomEvent('sesion-expirada'));
    }
    return Promise.reject(error);
  }
);

export default api;