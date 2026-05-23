import { createContext, useContext, useState, useCallback } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const raw = localStorage.getItem('usuario');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState(null);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (identificador, contrasena) => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await authService.login(identificador, contrasena);
      localStorage.setItem('token',   data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return data.usuario; // el llamador decide a dónde navegar según debe_cambiar_pass
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al iniciar sesión';
      setError(mensaje);
      throw new Error(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout(); // avisa al backend → cierra sesión + auditoría
    } catch {
      // Si el token ya expiró o hay error de red, igual limpiamos localmente
    }
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  // ── Actualizar flag local después de cambiar contraseña ────────────────
  const marcarContrasenaActualizada = useCallback(() => {
    setUsuario(prev => {
      if (!prev) return prev;
      const actualizado = { ...prev, debe_cambiar_pass: false };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      return actualizado;
    });
  }, []);

  // ── Actualizar datos del perfil en contexto y localStorage ───────────────
  const actualizarPerfil = useCallback((datos) => {
    setUsuario(prev => {
      if (!prev) return prev;
      const actualizado = { ...prev, ...datos };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      return actualizado;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      usuario,
      login,
      logout,
      marcarContrasenaActualizada,
      actualizarPerfil,
      cargando,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
