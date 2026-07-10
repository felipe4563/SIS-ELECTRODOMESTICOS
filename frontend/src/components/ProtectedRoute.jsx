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
export default function ProtectedRoute({ children, action, subject, orAction, anyOf }) {
  const { usuario }  = useAuth();
  const { noPuede }  = usePermission();
  const location     = useLocation();

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (anyOf) {
    const tieneAlguno = anyOf.some(([a, s]) => !noPuede(a, s));
    if (!tieneAlguno) return <Navigate to="/sin-permiso" replace />;
  } else if (action && subject && noPuede(action, subject)) {
    const tieneAlternativo = orAction ? !noPuede(orAction, subject) : false;
    if (!tieneAlternativo) {
      return <Navigate to="/sin-permiso" replace />;
    }
  }

  return children;
}