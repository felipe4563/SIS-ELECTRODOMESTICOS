import { Navigate, useLocation } from 'react-router-dom';
import { useAuth }        from '../contexts/AuthContext';
import { usePermission }  from '../hooks/usePermission';

/**
 * Guarda de rutas con dos niveles de protección:
 *
 * Nivel 1 — Solo autenticación:
 *   <ProtectedRoute>
 *     <MiPagina />
 *   </ProtectedRoute>
 *
 * Nivel 2 — Autenticación + permiso específico:
 *   <ProtectedRoute action="ver" subject="roles">
 *     <RolesPage />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children, action, subject }) {
  const { usuario }  = useAuth();
  const { noPuede }  = usePermission();
  const location     = useLocation();

  // ── 1. No autenticado → redirigir al login ────────────────────────────
  // Guardamos la ruta actual para redirigir de vuelta tras el login
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 2. Sin permiso específico → página de acceso denegado ─────────────
  if (action && subject && noPuede(action, subject)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return children;
}