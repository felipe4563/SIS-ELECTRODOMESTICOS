import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './contexts/AuthContext';
import { AbilityProvider } from './contexts/AbilityContext';
import { ThemeProvider }   from './contexts/ThemeContext';
import ProtectedRoute      from './components/ProtectedRoute';
import Sidebar             from './components/sidebar';

// ── Páginas públicas ─────────────────────────────────────────────────────
import Login             from './pages/Login';
import SinPermiso        from './pages/SinPermiso';
import CambiarContrasena from './pages/CambiarContrasena';

// ── Dashboard ────────────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard';

// ── Usuarios y Roles ─────────────────────────────────────────────────────
import Usuarios  from './pages/usuarios/Usuarios';
import Roles     from './pages/usuarios/Roles';
import MiPerfil  from './pages/MiPerfil';

// ── Catálogo maestros ────────────────────────────────────────────────────
import Marcas     from './pages/catalogo/Marcas';
import Categorias from './pages/catalogo/Categorias';
import Unidades   from './pages/catalogo/Unidades';

// ── Configuración base ───────────────────────────────────────────────────
import Empresa      from './pages/configuracion/Empresa';
import Sucursales   from './pages/configuracion/Sucursales';
import Depositos    from './pages/configuracion/Depositos';
import Monedas      from './pages/configuracion/Monedas';
import TiposCambio  from './pages/configuracion/TiposCambio';
import Parametros   from './pages/configuracion/Parametros';

// ── Layout ───────────────────────────────────────────────────────────────
function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-zinc-950 transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-zinc-950 transition-colors duration-300">
        <div className="pt-16 lg:pt-0 px-4 sm:px-6 py-4 sm:py-6 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

function PageRoute({ action, subject, children }) {
  return (
    <ProtectedRoute action={action} subject={subject}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

// ── App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AbilityProvider>
            <Routes>

              {/* Rutas públicas */}
              <Route path="/login"       element={<Login />} />
              <Route path="/sin-permiso" element={<SinPermiso />} />

              {/* Cambiar contraseña (requiere sesión) */}
              <Route path="/cambiar-contrasena" element={
                <ProtectedRoute><CambiarContrasena /></ProtectedRoute>
              } />

              {/* Dashboard */}
              <Route path="/dashboard" element={
                <PageRoute action="ver" subject="dashboard">
                  <Dashboard />
                </PageRoute>
              } />

              {/* ── Configuración base ─────────────────────────────────── */}
              <Route path="/configuracion/empresa" element={
                <PageRoute action="ver" subject="configuracion">
                  <Empresa />
                </PageRoute>
              } />
              <Route path="/configuracion/sucursales" element={
                <PageRoute action="ver" subject="sucursales">
                  <Sucursales />
                </PageRoute>
              } />
              <Route path="/configuracion/depositos" element={
                <PageRoute action="ver" subject="depositos">
                  <Depositos />
                </PageRoute>
              } />
              <Route path="/configuracion/monedas" element={
                <PageRoute action="ver" subject="monedas">
                  <Monedas />
                </PageRoute>
              } />
              <Route path="/configuracion/tipos-cambio" element={
                <PageRoute action="ver" subject="tipos_cambio">
                  <TiposCambio />
                </PageRoute>
              } />
              <Route path="/configuracion/parametros" element={
                <PageRoute action="ver" subject="parametros">
                  <Parametros />
                </PageRoute>
              } />

              {/* ── Usuarios y Roles ───────────────────────────────────── */}
              <Route path="/usuarios" element={
                <PageRoute action="ver" subject="usuarios">
                  <Usuarios />
                </PageRoute>
              } />
              <Route path="/usuarios/roles" element={
                <PageRoute action="ver" subject="roles">
                  <Roles />
                </PageRoute>
              } />

              {/* ── Catálogo maestros ──────────────────────────────────── */}
              <Route path="/catalogo/marcas" element={
                <PageRoute action="ver" subject="marcas">
                  <Marcas />
                </PageRoute>
              } />
              <Route path="/catalogo/categorias" element={
                <PageRoute action="ver" subject="categorias">
                  <Categorias />
                </PageRoute>
              } />
              <Route path="/catalogo/unidades" element={
                <PageRoute action="ver" subject="unidades">
                  <Unidades />
                </PageRoute>
              } />

              {/* Mi perfil (solo requiere sesión) */}
              <Route path="/mi-perfil" element={
                <ProtectedRoute><AppLayout><MiPerfil /></AppLayout></ProtectedRoute>
              } />

              {/* Redirecciones */}
              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<Navigate to="/dashboard" replace />} />

            </Routes>
          </AbilityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
