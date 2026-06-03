import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';
import { usePermission }     from '../hooks/usePermission';
import { useTheme }          from '../contexts/ThemeContext';
import { useEmpresa }        from '../contexts/EmpresaContext';

// ── Estructura del menú ───────────────────────────────────────────────────
const MENU = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icono: '📊', action: 'ver', subject: 'dashboard' },
    ],
  },
  {
    label: 'Configuración',
    action: 'ver', subject: 'configuracion',
    items: [
      { label: 'Panel de config.', path: '/configuracion',              icono: '🛠️', action: 'ver', subject: 'configuracion' },
      { label: 'Empresa',          path: '/configuracion/empresa',      icono: '🏢', action: 'ver', subject: 'configuracion' },
      { label: 'Sucursales',       path: '/configuracion/sucursales',   icono: '🏪', action: 'ver', subject: 'sucursales' },
      { label: 'Depósitos',        path: '/configuracion/depositos',    icono: '🏭', action: 'ver', subject: 'depositos' },
      { label: 'Monedas',          path: '/configuracion/monedas',      icono: '💱', action: 'ver', subject: 'monedas' },
      { label: 'Tipos de cambio',  path: '/configuracion/tipos-cambio', icono: '📈', action: 'ver', subject: 'tipos_cambio' },
      { label: 'Bancos',           path: '/configuracion/bancos',       icono: '🏦', action: 'ver', subject: 'bancos' },
      { label: 'Impuestos',        path: '/configuracion/impuestos',    icono: '💲', action: 'ver', subject: 'impuestos' },
    ],
  },
  {
    label: 'Usuarios y Roles',
    items: [
      { label: 'Usuarios', path: '/usuarios',       icono: '👤', action: 'ver', subject: 'usuarios' },
      { label: 'Roles',    path: '/usuarios/roles', icono: '🛡️', action: 'ver', subject: 'roles' },
    ],
  },
  {
    label: 'Proveedores',
    items: [
      { label: 'Proveedores', path: '/proveedores', icono: '🚚', action: 'ver', subject: 'proveedores' },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Clientes', path: '/clientes', icono: '👥', action: 'ver', subject: 'clientes' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos',  path: '/productos',           icono: '📦', action: 'ver', subject: 'productos' },
      { label: 'Marcas',     path: '/catalogo/marcas',     icono: '🏷️', action: 'ver', subject: 'marcas' },
      { label: 'Categorías', path: '/catalogo/categorias', icono: '📂', action: 'ver', subject: 'categorias' },
      { label: 'Unidades',   path: '/catalogo/unidades',   icono: '📏', action: 'ver', subject: 'unidades' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Compras', path: '/compras', icono: '🛒', action: 'ver', subject: 'compras' },
    ],
  },
  {
    label: 'Combos y Promociones',
    items: [
      { label: 'Combos',      path: '/combos',      icono: '🎁', action: 'ver', subject: 'combos' },
      { label: 'Promociones', path: '/promociones', icono: '🏷️', action: 'ver', subject: 'promociones' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Stock',          path: '/inventario/stock',          icono: '📋', action: 'ver',          subject: 'inventario' },
      { label: 'Kardex',         path: '/inventario/kardex',         icono: '📜', action: 'ver_kardex',   subject: 'inventario' },
      { label: 'Alertas',        path: '/inventario/alertas',        icono: '🔔', action: 'alertas_ver',  subject: 'inventario' },
      { label: 'Transferencias', path: '/inventario/transferencias', icono: '🔄', action: 'ver',          subject: 'inventario' },
      { label: 'Ajustes',        path: '/inventario/ajustes',        icono: '🔧', action: 'ver',          subject: 'inventario' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Ventas',        path: '/ventas',        icono: '🛍️', action: 'ver_sucursal', subject: 'ventas' },
      { label: 'Cotizaciones',  path: '/cotizaciones',  icono: '📋', action: 'ver',          subject: 'cotizaciones' },
      { label: 'Cobros',        path: '/cobros',        icono: '💳', action: 'ver',          subject: 'cobros' },
    ],
  },
  {
    label: 'Gastos',
    items: [
      { label: 'Gastos', path: '/gastos', icono: '💸', action: 'ver', subject: 'gastos' },
    ],
  },
  {
    label: 'Caja',
    items: [
      { label: 'Caja', path: '/caja', icono: '💰', action: 'ver', subject: 'caja' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { label: 'Reportes', path: '/reportes', icono: '📊', action: 'ver', subject: 'reportes' },
    ],
  },
  {
    label: 'Auditoría',
    items: [
      { label: 'Auditoría', path: '/auditoria', icono: '🔍', action: 'ver', subject: 'auditoria' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { label: 'Herramientas', path: '/herramientas',            icono: '🛠️', action: 'ver', subject: 'herramientas' },
      { label: 'Backup',       path: '/herramientas/backup',     icono: '🗄️', action: 'ver', subject: 'herramientas' },
      { label: 'Catálogo PDF', path: '/herramientas/catalogo-pdf', icono: '📄', action: 'ver', subject: 'herramientas' },
    ],
  },
];

// ── Toggle tema ───────────────────────────────────────────────────────────
function ToggleTema() {
  const { tema, toggleTema } = useTheme();
  const isDark = tema === 'dark';
  return (
    <button
      onClick={toggleTema}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isDark ? 'bg-yellow-400' : 'bg-zinc-300'}`}
    >
      <span className={`absolute left-0.5 w-5 h-5 rounded-full shadow-md flex items-center justify-center text-xs bg-white transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'}`}>
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

// ── Ítem de navegación ────────────────────────────────────────────────────
function MenuItem({ path, label, icono, onClose }) {
  return (
    <NavLink
      to={path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-yellow-400 text-zinc-900 shadow-md shadow-yellow-400/20'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
        }`
      }
    >
      <span className="text-base w-5 text-center shrink-0 leading-none">{icono}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// ── Grupo colapsable ──────────────────────────────────────────────────────
function MenuGroup({ grupo, onClose }) {
  const { puede } = usePermission();
  const location  = useLocation();

  const itemsVisibles = grupo.items.filter(({ action, subject }) =>
    !action || !subject || puede(action, subject)
  );

  if (itemsVisibles.length === 0) return null;

  const estaActivo = itemsVisibles.some(i => location.pathname.startsWith(i.path));
  const [abierto, setAbierto] = useState(estaActivo);

  useEffect(() => {
    if (estaActivo) setAbierto(true);
  }, [location.pathname]);

  if (itemsVisibles.length === 1 && !grupo.action) {
    return <MenuItem {...itemsVisibles[0]} onClose={onClose} />;
  }

  return (
    <div>
      {grupo.label !== 'Principal' && (
        <button
          onClick={() => setAbierto(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
        >
          <span>{grupo.label}</span>
          <span className={`text-[10px] transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}>▶</span>
        </button>
      )}
      {(abierto || grupo.label === 'Principal') && (
        <div className="space-y-0.5">
          {itemsVisibles.map(item => (
            <MenuItem key={item.path} {...item} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contenido del sidebar ─────────────────────────────────────────────────
function SidebarContent({ onClose }) {
  const { usuario, logout } = useAuth();
  const { limpiar }         = useAbilityUpdater();
  const navigate            = useNavigate();
  const { logoUrl }         = useEmpresa() ?? {};

  const handleLogout = async () => {
    limpiar();
    await logout();
    onClose?.();
    navigate('/login');
  };

  const iniciales = [usuario?.nombres?.[0], usuario?.apellidos?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-colors duration-300">

      {/* Logo + tema */}
      <div className="flex flex-col items-center pt-6 pb-5 border-b border-zinc-200 dark:border-zinc-800 px-4">
        <img
          src={logoUrl ?? '/logo.png'}
          alt="Logo"
          className="w-40 h-16 object-contain mb-3 drop-shadow-md hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = '/logo.png'; }}
        />
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">☀️</span>
          <ToggleTema />
          <span className="text-xs text-zinc-400 dark:text-zinc-500">🌙</span>
        </div>
      </div>

      {/* Info usuario */}
      <div className="mx-3 mt-4 mb-2 rounded-xl px-3 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-400 text-zinc-900 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="text-zinc-900 dark:text-white text-sm font-semibold truncate leading-tight">
              {usuario?.nombres} {usuario?.apellidos}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs truncate">{usuario?.email}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
            {usuario?.rol_nombre ?? `Rol ${usuario?.rol}`}
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3">
        {MENU.map((grupo) => (
          <MenuGroup key={grupo.label} grupo={grupo} onClose={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-400 dark:text-zinc-600 px-3 mb-2">v2.0.0 · Megaelectra</p>
        <NavLink
          to="/mi-perfil"
          onClick={onClose}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mb-1 ${
              isActive
                ? 'bg-yellow-400 text-zinc-900 shadow-md shadow-yellow-400/20'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`
          }
        >
          <span className="text-base w-5 text-center shrink-0">👤</span>
          <span>Mi perfil</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
        >
          <span className="text-base w-5 text-center shrink-0">🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

// ── Sidebar principal ─────────────────────────────────────────────────────
export default function Sidebar() {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const location = useLocation();

  useEffect(() => { setDrawerAbierto(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerAbierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerAbierto]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile — botón hamburguesa */}
      <button
        onClick={() => setDrawerAbierto(true)}
        aria-label="Abrir menú"
        className="lg:hidden fixed top-3.5 left-4 z-40 w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-white shadow-md hover:border-yellow-400 transition-all duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

  
      {/* Mobile — overlay */}
      <div
        onClick={() => setDrawerAbierto(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${drawerAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Mobile — drawer */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-72 z-50 shadow-2xl shadow-black/40 transform transition-transform duration-300 ease-in-out ${drawerAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setDrawerAbierto(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <SidebarContent onClose={() => setDrawerAbierto(false)} />
      </div>
    </>
  );
}
