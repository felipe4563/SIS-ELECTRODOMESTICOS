import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';
import { usePermission }     from '../hooks/usePermission';
import { useTheme }          from '../contexts/ThemeContext';
import { useEmpresa }        from '../contexts/EmpresaContext';

/* ─── Sistema de íconos SVG (24×24 viewBox, stroke) ─────────────────────── */
function Ic({ id, size = 15, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {ICONS[id]}
    </svg>
  );
}

const ICONS = {
  dashboard:      <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  settings:       <><path d="M4 21V14m0-4V3m8 18v-7m0-4V3m8 18v-5m0-4V3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="17" y1="16" x2="23" y2="16"/></>,
  building:       <><path d="M3 21h18"/><rect x="5" y="3" width="14" height="18"/><path d="M9 21V15h6v6"/><path d="M9 7h2m4 0h2M9 11h2m4 0h2"/></>,
  store:          <><path d="M2 7l2-4h16l2 4"/><path d="M4 7v14h16V7"/><path d="M2 7h20"/><path d="M9 7v4a3 3 0 006 0V7"/><path d="M10 21v-5h4v5"/></>,
  warehouse:      <><path d="M3 21V8l9-5 9 5v13H3z"/><path d="M9 21v-8h6v8"/><line x1="3" y1="14" x2="21" y2="14"/></>,
  currency:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2.5 0 015 0c0 1.5-1.5 2.5-2.5 2.5s-2.5 1-2.5 2.5a2.5 2.5 0 005 0"/></>,
  trending:       <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  bank:           <><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>,
  tax:            <><path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></>,
  user:           <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
  shield:         <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  truck:          <><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
  users:          <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
  package:        <><path d="M16.5 9.4l-9-5.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
  tag:            <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  folder:         <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>,
  ruler:          <><path d="M21.3 8.7l-8.6 8.6c-1 1-2.5 1-3.4 0l-4.6-4.6c-1-1-1-2.5 0-3.4l8.6-8.6c1-1 2.5-1 3.4 0l4.6 4.6c1 1 1 2.5 0 3.4z"/><path d="M7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2"/></>,
  cart:           <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>,
  gift:           <><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></>,
  clipboard:      <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></>,
  scroll:         <><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v3h4"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="11" y2="14"/></>,
  bell:           <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  transfer:       <><path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></>,
  wrench:         <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,
  bag:            <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></>,
  'file-text':    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  'credit-card':  <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  wallet:         <><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></>,
  cash:           <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
  'bar-chart':    <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  search:         <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  tool:           <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,
  database:       <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
  'file-pdf':     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15c0 1.1.9 2 2 2h2a2 2 0 000-4h-2a2 2 0 010-4h2c1.1 0 2 .9 2 2"/><line x1="12" y1="9" x2="12" y2="17"/></>,
  logout:         <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  profile:        <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
  sun:            <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  moon:           <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>,
  chevron:        <polyline points="9 18 15 12 9 6"/>,
  menu:           <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  close:          <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
};

/* ─── Estructura de menú ─────────────────────────────────────────────────── */
const MENU = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', action: 'ver', subject: 'dashboard' },
    ],
  },
  {
    label: 'Configuración',
    action: 'ver', subject: 'configuracion',
    items: [
      { label: 'Panel general',   path: '/configuracion',              icon: 'settings',  action: 'ver', subject: 'configuracion' },
      { label: 'Empresa',         path: '/configuracion/empresa',      icon: 'building',  action: 'ver', subject: 'configuracion' },
      { label: 'Sucursales',      path: '/configuracion/sucursales',   icon: 'store',     action: 'ver', subject: 'sucursales' },
      { label: 'Depósitos',       path: '/configuracion/depositos',    icon: 'warehouse', action: 'ver', subject: 'depositos' },
      { label: 'Monedas',         path: '/configuracion/monedas',      icon: 'currency',  action: 'ver', subject: 'monedas' },
      { label: 'Tipos de cambio', path: '/configuracion/tipos-cambio', icon: 'trending',  action: 'ver', subject: 'tipos_cambio' },
      { label: 'Bancos',          path: '/configuracion/bancos',       icon: 'bank',      action: 'ver', subject: 'bancos' },
      { label: 'Impuestos',       path: '/configuracion/impuestos',    icon: 'tax',       action: 'ver', subject: 'impuestos' },
    ],
  },
  {
    label: 'Usuarios y Roles',
    items: [
      { label: 'Usuarios', path: '/usuarios',       icon: 'user',   action: 'ver', subject: 'usuarios' },
      { label: 'Roles',    path: '/usuarios/roles', icon: 'shield', action: 'ver', subject: 'roles' },
    ],
  },
  {
    label: 'Proveedores',
    items: [
      { label: 'Proveedores', path: '/proveedores', icon: 'truck', action: 'ver', subject: 'proveedores' },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Clientes', path: '/clientes', icon: 'users', action: 'ver', subject: 'clientes' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Productos',  path: '/productos',           icon: 'package', action: 'ver', subject: 'productos' },
      { label: 'Marcas',     path: '/catalogo/marcas',     icon: 'tag',     action: 'ver', subject: 'marcas' },
      { label: 'Categorías', path: '/catalogo/categorias', icon: 'folder',  action: 'ver', subject: 'categorias' },
      { label: 'Unidades',   path: '/catalogo/unidades',   icon: 'ruler',   action: 'ver', subject: 'unidades' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Compras', path: '/compras', icon: 'cart', action: 'ver', subject: 'compras' },
    ],
  },
  {
    label: 'Combos y Promociones',
    items: [
      { label: 'Combos',      path: '/combos',      icon: 'gift', action: 'ver', subject: 'combos' },
      { label: 'Promociones', path: '/promociones', icon: 'tag',  action: 'ver', subject: 'promociones' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Stock',          path: '/inventario/stock',          icon: 'clipboard', action: 'ver',         subject: 'inventario' },
      { label: 'Kardex',         path: '/inventario/kardex',         icon: 'scroll',    action: 'ver_kardex',  subject: 'inventario' },
      { label: 'Alertas',        path: '/inventario/alertas',        icon: 'bell',      action: 'alertas_ver', subject: 'inventario' },
      { label: 'Transferencias', path: '/inventario/transferencias', icon: 'transfer',  action: 'ver',         subject: 'inventario' },
      { label: 'Ajustes',        path: '/inventario/ajustes',        icon: 'wrench',    action: 'ver',         subject: 'inventario' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Ventas',       path: '/ventas',       icon: 'bag',         action: 'ver_sucursal', subject: 'ventas' },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: 'file-text',   action: 'ver',          subject: 'cotizaciones' },
      { label: 'Cobros',       path: '/cobros',       icon: 'credit-card', action: 'ver',          subject: 'cobros' },
    ],
  },
  {
    label: 'Gastos',
    items: [
      { label: 'Gastos', path: '/gastos', icon: 'cash', action: 'ver', subject: 'gastos' },
    ],
  },
  {
    label: 'Caja',
    items: [
      { label: 'Caja', path: '/caja', icon: 'wallet', action: 'ver', subject: 'caja' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { label: 'Reportes', path: '/reportes', icon: 'bar-chart', action: 'ver', subject: 'reportes' },
    ],
  },
  {
    label: 'Auditoría',
    items: [
      { label: 'Auditoría', path: '/auditoria', icon: 'search', action: 'ver', subject: 'auditoria' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { label: 'Herramientas', path: '/herramientas',              icon: 'tool',     action: 'ver', subject: 'herramientas' },
      { label: 'Backup',       path: '/herramientas/backup',       icon: 'database', action: 'ver', subject: 'herramientas' },
      { label: 'Catálogo PDF', path: '/herramientas/catalogo-pdf', icon: 'file-pdf', action: 'ver', subject: 'herramientas' },
    ],
  },
];

/* ─── Toggle de tema ─────────────────────────────────────────────────────── */
function ToggleTema() {
  const { tema, toggleTema } = useTheme();
  const isDark = tema === 'dark';
  return (
    <button
      onClick={toggleTema}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        relative inline-flex items-center w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
        ${isDark ? 'bg-amber-400' : 'bg-zinc-200 dark:bg-zinc-700'}
      `}
    >
      <span className={`
        absolute flex items-center justify-center w-4.5 h-5 w-5 rounded-full bg-white shadow-sm
        transition-transform duration-300 ease-in-out
        ${isDark ? 'translate-x-5' : 'translate-x-0.5'}
      `}>
        <Ic id={isDark ? 'moon' : 'sun'} size={10} className="text-zinc-600" />
      </span>
    </button>
  );
}

/* ─── Ítem de navegación ─────────────────────────────────────────────────── */
function MenuItem({ path, label, icon, onClose }) {
  return (
    <NavLink
      to={path}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-amber-400 text-zinc-900 shadow-sm'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`shrink-0 transition-colors ${isActive ? 'text-zinc-900' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}>
            <Ic id={icon} size={15} />
          </span>
          <span className="truncate leading-none">{label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ─── Grupo colapsable ───────────────────────────────────────────────────── */
function MenuGroup({ grupo, onClose }) {
  const { puede }  = usePermission();
  const location   = useLocation();

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
    <div className="space-y-0.5">
      {grupo.label !== 'Principal' && (
        <button
          onClick={() => setAbierto(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors duration-150"
        >
          <span>{grupo.label}</span>
          <Ic
            id="chevron"
            size={12}
            className={`text-zinc-400 dark:text-zinc-600 transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`}
          />
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

/* ─── Contenido del sidebar ──────────────────────────────────────────────── */
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 transition-colors duration-300">

      {/* ── Logo ── */}
      <div className="flex flex-col items-center pt-5 pb-4 px-4 border-b border-zinc-100 dark:border-zinc-800/80">
        <img
          src={logoUrl ?? '/logo.png'}
          alt="Logo"
          className="h-12 w-auto max-w-[160px] object-contain select-none"
          onError={e => { e.target.src = '/logo.png'; }}
          draggable={false}
        />
      </div>

      {/* ── Usuario ── */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-zinc-900 flex items-center justify-center text-xs font-bold shrink-0 select-none">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {usuario?.nombres} {usuario?.apellidos}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 truncate leading-tight mt-0.5">
              {usuario?.rol_nombre ?? `Rol ${usuario?.rol}`}
            </p>
          </div>
          <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900" />
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3 sidebar-scroll">
        {MENU.map(grupo => (
          <MenuGroup key={grupo.label} grupo={grupo} onClose={onClose} />
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-3 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1">
        {/* Tema */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Ic id="sun" size={13} className="text-zinc-400 dark:text-zinc-500" />
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Tema</span>
            <Ic id="moon" size={13} className="text-zinc-400 dark:text-zinc-500" />
          </div>
          <ToggleTema />
        </div>

        {/* Mi perfil */}
        <NavLink
          to="/mi-perfil"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? 'bg-amber-400 text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Ic id="profile" size={15} className={isActive ? 'text-zinc-900' : 'text-zinc-400 dark:text-zinc-500'} />
              <span>Mi perfil</span>
            </>
          )}
        </NavLink>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-500 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/8 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150 group"
        >
          <Ic id="logout" size={15} className="text-zinc-400 dark:text-zinc-600 group-hover:text-red-500 transition-colors" />
          <span>Cerrar sesión</span>
        </button>

        <p className="text-[10px] text-zinc-300 dark:text-zinc-700 px-3 pt-1">
          v2.0.0 · Megaelectra
        </p>
      </div>
    </div>
  );
}

/* ─── Sidebar principal ──────────────────────────────────────────────────── */
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
      <style>{SCROLL_CSS}</style>

      {/* ── Desktop ── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile: botón hamburguesa ── */}
      <button
        onClick={() => setDrawerAbierto(true)}
        aria-label="Abrir menú"
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 shadow-sm hover:border-amber-400 hover:text-amber-500 transition-all duration-200"
      >
        <Ic id="menu" size={18} />
      </button>

      {/* ── Mobile: overlay ── */}
      <div
        onClick={() => setDrawerAbierto(false)}
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-250 ${
          drawerAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Mobile: drawer ── */}
      <div className={`
        lg:hidden fixed top-0 left-0 h-full w-64 z-50 shadow-2xl shadow-black/30
        transform transition-transform duration-300 ease-in-out
        ${drawerAbierto ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <button
          onClick={() => setDrawerAbierto(false)}
          aria-label="Cerrar menú"
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <Ic id="close" size={14} />
        </button>
        <SidebarContent onClose={() => setDrawerAbierto(false)} />
      </div>
    </>
  );
}

const SCROLL_CSS = `
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
  .sidebar-scroll:hover { scrollbar-color: #e4e4e7 transparent; }
  .dark .sidebar-scroll:hover { scrollbar-color: #3f3f46 transparent; }
  .sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
  .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #e4e4e7; }
  .dark .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #3f3f46; }
`;
