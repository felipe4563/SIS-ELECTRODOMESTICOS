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

// ── Proveedores ──────────────────────────────────────────────────────────
import Proveedores     from './pages/proveedores/Proveedores';
import ProveedorDetalle from './pages/proveedores/ProveedorDetalle';

// ── Clientes ─────────────────────────────────────────────────────────────
import Clientes       from './pages/clientes/Clientes';
import ClienteDetalle from './pages/clientes/ClienteDetalle';

// ── Productos ─────────────────────────────────────────────────────────────
import Productos       from './pages/productos/Productos';
import ProductoDetalle from './pages/productos/ProductoDetalle';

// ── Catálogo maestros ────────────────────────────────────────────────────
import Marcas     from './pages/catalogo/Marcas';
import Categorias from './pages/catalogo/Categorias';
import Unidades   from './pages/catalogo/Unidades';

// ── Inventario ───────────────────────────────────────────────────────────
import StockConsolidado    from './pages/inventario/StockConsolidado';
import Kardex              from './pages/inventario/Kardex';
import Alertas             from './pages/inventario/Alertas';
import Transferencias      from './pages/inventario/Transferencias';
import TransferenciaForm   from './pages/inventario/TransferenciaForm';
import TransferenciaDetalle from './pages/inventario/TransferenciaDetalle';
import Ajustes             from './pages/inventario/Ajustes';
import AjusteForm          from './pages/inventario/AjusteForm';
import AjusteDetalle       from './pages/inventario/AjusteDetalle';

// Compras
import Compras       from './pages/compras/Compras';
import CompraForm    from './pages/compras/CompraForm';
import CompraDetalle from './pages/compras/CompraDetalle';

// ── Caja ─────────────────────────────────────────────────────────────────────
import Caja          from './pages/caja/Caja';
import ArqueoDetalle from './pages/caja/ArqueoDetalle';

// ── Reportes ──────────────────────────────────────────────────────────────────
import Reportes from './pages/reportes/Reportes';

// ── Auditoría ─────────────────────────────────────────────────────────────────
import Auditoria from './pages/auditoria/Auditoria';

// ── Ventas ────────────────────────────────────────────────────────────────────
import Ventas        from './pages/ventas/Ventas';
import VentaForm     from './pages/ventas/VentaForm';
import VentaDetalle  from './pages/ventas/VentaDetalle';
import VentaImprimir from './pages/ventas/VentaImprimir';

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

              {/* ── Proveedores ───────────────────────────────────────── */}
              <Route path="/proveedores" element={
                <PageRoute action="ver" subject="proveedores">
                  <Proveedores />
                </PageRoute>
              } />
              <Route path="/proveedores/:id" element={
                <PageRoute action="ver" subject="proveedores">
                  <ProveedorDetalle />
                </PageRoute>
              } />

              {/* ── Clientes ──────────────────────────────────────────── */}
              <Route path="/clientes" element={
                <PageRoute action="ver" subject="clientes">
                  <Clientes />
                </PageRoute>
              } />
              <Route path="/clientes/:id" element={
                <PageRoute action="ver" subject="clientes">
                  <ClienteDetalle />
                </PageRoute>
              } />

              {/* ── Productos ─────────────────────────────────────────── */}
              <Route path="/productos" element={
                <PageRoute action="ver" subject="productos">
                  <Productos />
                </PageRoute>
              } />
              <Route path="/productos/:id" element={
                <PageRoute action="ver" subject="productos">
                  <ProductoDetalle />
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

              {/* ── Inventario ────────────────────────────────────────── */}
              <Route path="/inventario/stock" element={
                <PageRoute action="ver" subject="inventario">
                  <StockConsolidado />
                </PageRoute>
              } />
              <Route path="/inventario/kardex" element={
                <PageRoute action="ver_kardex" subject="inventario">
                  <Kardex />
                </PageRoute>
              } />
              <Route path="/inventario/alertas" element={
                <PageRoute action="alertas_ver" subject="inventario">
                  <Alertas />
                </PageRoute>
              } />

              {/* Compras */}
              <Route path="/compras" element={
                <PageRoute action="ver" subject="compras"><Compras /></PageRoute>
              } />
              <Route path="/compras/nueva" element={
                <PageRoute action="crear_pre_pedido" subject="compras"><CompraForm /></PageRoute>
              } />
              <Route path="/compras/:id" element={
                <PageRoute action="ver" subject="compras"><CompraDetalle /></PageRoute>
              } />
              <Route path="/compras/:id/editar" element={
                <PageRoute action="editar_pre_pedido" subject="compras"><CompraForm /></PageRoute>
              } />

              {/* Transferencias */}
              <Route path="/inventario/transferencias" element={
                <PageRoute action="ver" subject="inventario"><Transferencias /></PageRoute>
              } />
              <Route path="/inventario/transferencias/nueva" element={
                <PageRoute action="transferir_solicitar" subject="inventario"><TransferenciaForm /></PageRoute>
              } />
              <Route path="/inventario/transferencias/:id" element={
                <PageRoute action="ver" subject="inventario"><TransferenciaDetalle /></PageRoute>
              } />

              {/* Ajustes de inventario */}
              <Route path="/inventario/ajustes" element={
                <PageRoute action="ver" subject="inventario"><Ajustes /></PageRoute>
              } />
              <Route path="/inventario/ajustes/nuevo" element={
                <PageRoute action="ajuste_crear" subject="inventario"><AjusteForm /></PageRoute>
              } />
              <Route path="/inventario/ajustes/:id" element={
                <PageRoute action="ver" subject="inventario"><AjusteDetalle /></PageRoute>
              } />
              <Route path="/inventario/ajustes/:id/editar" element={
                <PageRoute action="ajuste_crear" subject="inventario"><AjusteForm /></PageRoute>
              } />

              {/* ── Ventas ────────────────────────────────────────────── */}
              <Route path="/ventas" element={
                <PageRoute action="ver_sucursal" subject="ventas"><Ventas /></PageRoute>
              } />
              <Route path="/ventas/nueva" element={
                <PageRoute action="crear_menor" subject="ventas"><VentaForm /></PageRoute>
              } />
              <Route path="/ventas/:id" element={
                <PageRoute action="ver_sucursal" subject="ventas"><VentaDetalle /></PageRoute>
              } />
              <Route path="/ventas/:id/editar" element={
                <PageRoute action="editar_borrador" subject="ventas"><VentaForm /></PageRoute>
              } />
              <Route path="/ventas/:id/imprimir" element={
                <PageRoute action="imprimir" subject="ventas"><VentaImprimir /></PageRoute>
              } />

              {/* ── Caja ─────────────────────────────────────────────── */}
              <Route path="/caja" element={
                <PageRoute action="ver" subject="caja"><Caja /></PageRoute>
              } />
              <Route path="/caja/arqueos/:id" element={
                <PageRoute action="ver_arqueo_propio" subject="caja"><ArqueoDetalle /></PageRoute>
              } />

              {/* ── Reportes ─────────────────────────────────────────── */}
              <Route path="/reportes" element={
                <PageRoute action="ver" subject="reportes"><Reportes /></PageRoute>
              } />

              {/* ── Auditoría ─────────────────────────────────────────── */}
              <Route path="/auditoria" element={
                <PageRoute action="ver" subject="auditoria"><Auditoria /></PageRoute>
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
