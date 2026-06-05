import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './contexts/AuthContext';
import { AbilityProvider } from './contexts/AbilityContext';
import { ThemeProvider }   from './contexts/ThemeContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import ProtectedRoute      from './components/ProtectedRoute';
import Sidebar             from './components/sidebar';

// ── Páginas públicas ─────────────────────────────────────────────────────
import Login              from './pages/Login';
import SinPermiso         from './pages/SinPermiso';
import CambiarContrasena  from './pages/CambiarContrasena';
import SelectorSucursal   from './pages/SelectorSucursal';
import ProductoPublico    from './pages/public/ProductoPublico';

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
import Compras           from './pages/compras/Compras';
import CompraForm        from './pages/compras/CompraForm';
import CompraDetalle     from './pages/compras/CompraDetalle';
import EtiquetasImprimir from './pages/compras/EtiquetasImprimir';

// ── Gastos ────────────────────────────────────────────────────────────────────
import Gastos from './pages/gastos/Gastos';

// ── Caja ─────────────────────────────────────────────────────────────────────
import Caja          from './pages/caja/Caja';
import ArqueoDetalle from './pages/caja/ArqueoDetalle';

// ── Reportes ──────────────────────────────────────────────────────────────────
import Reportes from './pages/reportes/Reportes';

// ── Auditoría ─────────────────────────────────────────────────────────────────
import Auditoria from './pages/auditoria/Auditoria';

// ── Herramientas ───────────────────────────────────────────────────────────────
import Herramientas from './pages/herramientas/Herramientas';
import Backup       from './pages/herramientas/Backup';
import CatalogoPDF  from './pages/herramientas/CatalogoPDF';

// ── Combos y Promociones ──────────────────────────────────────────────────────
import Combos      from './pages/combos/Combos';
import Promociones from './pages/promociones/Promociones';

// ── Cotizaciones ──────────────────────────────────────────────────────────────
import Cotizaciones       from './pages/cotizaciones/Cotizaciones';
import CotizacionForm     from './pages/cotizaciones/CotizacionForm';
import CotizacionDetalle  from './pages/cotizaciones/CotizacionDetalle';
import CotizacionPDF      from './pages/cotizaciones/CotizacionPDF';

// ── Cobros ────────────────────────────────────────────────────────────────────
import Cobros      from './pages/cobros/Cobros';
import CobroRecibo from './pages/cobros/CobroRecibo';

// ── Ventas ────────────────────────────────────────────────────────────────────
import Ventas        from './pages/ventas/Ventas';
import VentaForm     from './pages/ventas/VentaForm';
import VentaDetalle  from './pages/ventas/VentaDetalle';
import VentaImprimir from './pages/ventas/VentaImprimir';

// ── Configuración base ───────────────────────────────────────────────────
import ConfiguracionIndex  from './pages/configuracion/ConfiguracionIndex';
import WizardConfiguracion from './pages/configuracion/WizardConfiguracion';
import Empresa      from './pages/configuracion/Empresa';
import Sucursales   from './pages/configuracion/Sucursales';
import Depositos    from './pages/configuracion/Depositos';
import Monedas      from './pages/configuracion/Monedas';
import TiposCambio  from './pages/configuracion/TiposCambio';
import Bancos      from './pages/configuracion/Bancos';
import Impuestos   from './pages/configuracion/Impuestos';

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
            <EmpresaProvider>
            <Routes>

              {/* Rutas públicas */}
              <Route path="/login"       element={<Login />} />
              <Route path="/sin-permiso" element={<SinPermiso />} />

              {/* Producto público — sin login */}
              <Route path="/p/:codigo" element={<ProductoPublico />} />

              {/* Cambiar contraseña (requiere sesión) */}
              <Route path="/cambiar-contrasena" element={
                <ProtectedRoute><CambiarContrasena /></ProtectedRoute>
              } />

              {/* Selector de sucursal (requiere sesión) */}
              <Route path="/seleccionar-sucursal" element={
                <ProtectedRoute><SelectorSucursal /></ProtectedRoute>
              } />

              {/* Dashboard */}
              <Route path="/dashboard" element={
                <PageRoute action="ver" subject="dashboard">
                  <Dashboard />
                </PageRoute>
              } />

              {/* ── Configuración base ─────────────────────────────────── */}
              <Route path="/configuracion" element={
                <PageRoute action="ver" subject="configuracion">
                  <ConfiguracionIndex />
                </PageRoute>
              } />
              <Route path="/configuracion/wizard" element={
                <ProtectedRoute action="ver" subject="configuracion">
                  <WizardConfiguracion />
                </ProtectedRoute>
              } />
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
              <Route path="/configuracion/bancos" element={
                <PageRoute action="ver" subject="bancos">
                  <Bancos />
                </PageRoute>
              } />
              <Route path="/configuracion/impuestos" element={
                <PageRoute action="ver" subject="impuestos">
                  <Impuestos />
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
              <Route path="/compras/:id/etiquetas" element={
                <ProtectedRoute action="ver" subject="compras">
                  <EtiquetasImprimir />
                </ProtectedRoute>
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

              {/* ── Combos y Promociones ──────────────────────────────── */}
              <Route path="/combos" element={
                <PageRoute action="ver" subject="combos"><Combos /></PageRoute>
              } />
              <Route path="/promociones" element={
                <PageRoute action="ver" subject="promociones"><Promociones /></PageRoute>
              } />

              {/* ── Cotizaciones ──────────────────────────────────────── */}
              <Route path="/cotizaciones" element={
                <PageRoute action="ver" subject="cotizaciones"><Cotizaciones /></PageRoute>
              } />
              <Route path="/cotizaciones/nueva" element={
                <PageRoute action="crear" subject="cotizaciones"><CotizacionForm /></PageRoute>
              } />
              <Route path="/cotizaciones/:id" element={
                <PageRoute action="ver" subject="cotizaciones"><CotizacionDetalle /></PageRoute>
              } />
              <Route path="/cotizaciones/:id/editar" element={
                <PageRoute action="editar" subject="cotizaciones"><CotizacionForm /></PageRoute>
              } />
              <Route path="/cotizaciones/:id/pdf" element={
                <PageRoute action="ver" subject="cotizaciones"><CotizacionPDF /></PageRoute>
              } />

              {/* ── Cobros ────────────────────────────────────────────── */}
              <Route path="/cobros" element={
                <PageRoute action="ver" subject="cobros"><Cobros /></PageRoute>
              } />
              <Route path="/cobros/:id/recibo" element={
                <PageRoute action="imprimir" subject="cobros"><CobroRecibo /></PageRoute>
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

              {/* ── Gastos ───────────────────────────────────────────── */}
              <Route path="/gastos" element={
                <PageRoute action="ver" subject="gastos"><Gastos /></PageRoute>
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

              {/* ── Herramientas ──────────────────────────────────────── */}
              <Route path="/herramientas" element={
                <PageRoute action="ver" subject="herramientas"><Herramientas /></PageRoute>
              } />
              <Route path="/herramientas/backup" element={
                <PageRoute action="ver" subject="herramientas"><Backup /></PageRoute>
              } />
              <Route path="/herramientas/catalogo-pdf" element={
                <PageRoute action="ver" subject="herramientas"><CatalogoPDF /></PageRoute>
              } />

              {/* Mi perfil (solo requiere sesión) */}
              <Route path="/mi-perfil" element={
                <ProtectedRoute><AppLayout><MiPerfil /></AppLayout></ProtectedRoute>
              } />

              {/* Redirecciones */}
              <Route path="/"  element={<Navigate to="/dashboard" replace />} />
              <Route path="*"  element={<Navigate to="/dashboard" replace />} />

            </Routes>
            </EmpresaProvider>
          </AbilityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
