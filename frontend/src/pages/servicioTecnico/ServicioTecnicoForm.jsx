import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams }      from 'react-router-dom';
import { FaArrowLeft, FaSpinner }      from 'react-icons/fa';
import { servicioTecnicoService }      from '../../services/servicioTecnico.service';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const COMPACT = 'px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';
const LABEL = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1';
const SECTION = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const buildImgUrl = (url) =>
  !url ? null : url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`;

function IcSearch({ size = 14, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IcPackage({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M16.5 9.4l-9-5.21" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

/* ── Buscador de cliente ──────────────────────────────────────────────────── */
function ClientePicker({ clientes, value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const clienteSeleccionado = clientes.find(c => c.id_cliente === value);
  const filtrados = clientes.filter(c =>
    q === '' ||
    c.nombre_completo.toLowerCase().includes(q.toLowerCase()) ||
    (c.ci_ruc ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (c.telefono ?? '').includes(q)
  );

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div
        className={`${INPUT} flex items-center justify-between cursor-pointer`}
        onClick={() => { setOpen(o => !o); setQ(''); }}
      >
        {clienteSeleccionado
          ? <span>{clienteSeleccionado.nombre_completo} {clienteSeleccionado.ci_ruc ? `(${clienteSeleccionado.ci_ruc})` : ''}</span>
          : <span className="text-zinc-400">Seleccionar cliente…</span>}
        <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
            <input
              autoFocus
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
          </div>
          {filtrados.length === 0
            ? <p className="px-4 py-3 text-sm text-zinc-400">Sin resultados</p>
            : filtrados.map(c => (
              <button
                key={c.id_cliente} type="button"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                onClick={() => { onChange(c.id_cliente); setOpen(false); }}
              >
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.nombre_completo}</span>
                {c.ci_ruc && <span className="ml-2 text-xs text-zinc-400">{c.ci_ruc}</span>}
                {c.telefono && <span className="ml-2 text-xs text-zinc-400">{c.telefono}</span>}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

/* ── Tile de producto (grilla estilo POS, igual que VentaForm) ───────────── */
function ProductoTile({ prod, seleccionado, onClick }) {
  const [errImg, setErrImg] = useState(false);
  const img = buildImgUrl(prod.imagen_url);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-stretch text-left bg-white dark:bg-zinc-900 rounded-2xl border overflow-hidden hover:shadow-md active:scale-[0.98] transition-all ${
        seleccionado ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-zinc-200 dark:border-zinc-800 hover:border-yellow-400 dark:hover:border-yellow-400'
      }`}
    >
      {seleccionado && (
        <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-yellow-400 text-zinc-900 text-[11px] font-bold flex items-center justify-center shadow">✓</span>
      )}
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
        {img && !errImg ? (
          <img src={img} alt={prod.nombre} className="w-full h-full object-cover" onError={() => setErrImg(true)} />
        ) : (
          <IcPackage size={28} className="text-zinc-300 dark:text-zinc-600" />
        )}
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight line-clamp-2 min-h-[2.2em]">
          {prod.nombre}
        </p>
        {prod.detalle && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">{prod.detalle}</p>
        )}
        {(prod.marca || prod.modelo || prod.color || prod.capacidad) && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight line-clamp-1">
            {[prod.marca, prod.modelo, prod.color, prod.capacidad].filter(Boolean).join(' · ')}
          </p>
        )}
        {prod.stock != null && (
          <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-md
            ${Number(prod.stock) > 1
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
            {Number(prod.stock)} uds
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Catálogo de producto — grilla + filtros en cascada (estilo VentaForm) ── */
function ProductoCatalogo({ productos, value, onChange }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca,     setFiltroMarca]     = useState('');
  const [filtroProducto,  setFiltroProducto]  = useState('');
  const [filtroModelo,    setFiltroModelo]    = useState('');
  const [filtroColor,     setFiltroColor]     = useState('');
  const [filtroCapacidad, setFiltroCapacidad] = useState('');

  const cambiarFiltroMarca    = v => { setFiltroMarca(v); setFiltroProducto(''); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroProducto = v => { setFiltroProducto(v); setFiltroModelo(''); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroModelo   = v => { setFiltroModelo(v); setFiltroColor(''); setFiltroCapacidad(''); };
  const cambiarFiltroColor    = v => { setFiltroColor(v); setFiltroCapacidad(''); };

  const marcasDisponibles = useMemo(() => [...new Set(productos.map(p => p.marca).filter(Boolean))].sort(), [productos]);
  const productosDisponibles = useMemo(() => [...new Set(
    productos.filter(p => !filtroMarca || p.marca === filtroMarca).map(p => p.nombre).filter(Boolean)
  )].sort(), [productos, filtroMarca]);
  const modelosDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.nombre === filtroProducto))
      .map(p => p.modelo).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto]);
  const coloresDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.nombre === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo))
      .map(p => p.color).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto, filtroModelo]);
  const capacidadesDisponibles = useMemo(() => [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.nombre === filtroProducto) && (!filtroModelo || p.modelo === filtroModelo) && (!filtroColor || p.color === filtroColor))
      .map(p => p.capacidad).filter(Boolean)
  )].sort(), [productos, filtroMarca, filtroProducto, filtroModelo, filtroColor]);

  const productosVisibles = useMemo(() => {
    let lista = productos
      .filter(p => !filtroMarca     || p.marca     === filtroMarca)
      .filter(p => !filtroProducto  || p.nombre    === filtroProducto)
      .filter(p => !filtroModelo    || p.modelo    === filtroModelo)
      .filter(p => !filtroColor     || p.color     === filtroColor)
      .filter(p => !filtroCapacidad || p.capacidad === filtroCapacidad);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.detalle ?? '').toLowerCase().includes(q) ||
        (p.marca ?? '').toLowerCase().includes(q) ||
        (p.modelo ?? '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [productos, filtroMarca, filtroProducto, filtroModelo, filtroColor, filtroCapacidad, busqueda]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <IcSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, marca, modelo…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        {value != null && (
          <button type="button" onClick={() => onChange(null)}
            className="shrink-0 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500 transition-colors">
            ✕ Quitar
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <select value={filtroMarca} onChange={e => cambiarFiltroMarca(e.target.value)} className={COMPACT}>
          <option value="">Todas las marcas</option>
          {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroProducto} onChange={e => cambiarFiltroProducto(e.target.value)} className={COMPACT}>
          <option value="">Todos los productos</option>
          {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroModelo} onChange={e => cambiarFiltroModelo(e.target.value)} className={COMPACT}>
          <option value="">Todos los modelos</option>
          {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroColor} onChange={e => cambiarFiltroColor(e.target.value)} className={COMPACT}>
          <option value="">Todos los colores</option>
          {coloresDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroCapacidad} onChange={e => setFiltroCapacidad(e.target.value)} className={COMPACT}>
          <option value="">Todas las capacidades</option>
          {capacidadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {productosVisibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-400">
          <IcPackage size={30} className="text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm font-medium">Sin productos para este filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-0.5">
          {productosVisibles.map(p => (
            <ProductoTile
              key={p.id_producto}
              prod={p}
              seleccionado={String(p.id_producto) === String(value)}
              onClick={() => onChange(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function ServicioTecnicoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);

  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState('');
  const [formData, setFormData]   = useState({
    tipo_origen:           'CLIENTE',
    id_cliente:            null,
    id_venta_origen:       '',
    id_producto:           null,
    id_deposito:           '',
    descripcion_producto:  '',
    marca_producto:        '',
    modelo_producto:       '',
    numero_serie:          '',
    color_producto:        '',
    id_sucursal:           '',
    fecha_recepcion:       new Date().toISOString().slice(0, 16),
    falla_reportada:       '',
    accesorios_recibidos:  '',
    condicion_fisica:      '',
    garantia:              false,
    prioridad:             'NORMAL',
    id_tecnico_externo:    '',
    fecha_envio_tecnico:   '',
    fecha_estimada_entrega:'',
    diagnostico:           '',
    trabajo_realizado:     '',
    repuestos_usados:      '',
    costo_estimado:        '0',
    observaciones:         '',
  });

  const [catalogo, setCatalogo] = useState({
    clientes: [], tecnicos: [], sucursales: [], depositos: [], productos: [],
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  // Cargar datos base del formulario
  useEffect(() => {
    servicioTecnicoService.getFormData()
      .then(r => setCatalogo(r.data))
      .catch(console.error);

    if (esEdicion) {
      servicioTecnicoService.getOne(id)
        .then(r => {
          const s = r.data;
          setFormData({
            tipo_origen:           s.tipo_origen ?? 'CLIENTE',
            id_cliente:            s.id_cliente ?? null,
            id_venta_origen:       s.id_venta_origen ?? '',
            id_producto:           s.id_producto ?? null,
            descripcion_producto:  s.descripcion_producto ?? '',
            marca_producto:        s.marca_producto ?? '',
            modelo_producto:       s.modelo_producto ?? '',
            numero_serie:          s.numero_serie ?? '',
            color_producto:        s.color_producto ?? '',
            id_sucursal:           s.id_sucursal ?? '',
            fecha_recepcion:       s.fecha_recepcion ? s.fecha_recepcion.slice(0, 16) : '',
            falla_reportada:       s.falla_reportada ?? '',
            accesorios_recibidos:  s.accesorios_recibidos ?? '',
            condicion_fisica:      s.condicion_fisica ?? '',
            garantia:              Boolean(s.garantia),
            prioridad:             s.prioridad ?? 'NORMAL',
            id_tecnico_externo:    s.id_tecnico_externo ?? '',
            fecha_envio_tecnico:   s.fecha_envio_tecnico ? s.fecha_envio_tecnico.slice(0, 10) : '',
            fecha_estimada_entrega:s.fecha_estimada_entrega ?? '',
            diagnostico:           s.diagnostico ?? '',
            trabajo_realizado:     s.trabajo_realizado ?? '',
            repuestos_usados:      s.repuestos_usados ?? '',
            costo_estimado:        s.costo_estimado ?? '0',
            costo_final:           s.costo_final ?? '0',
            observaciones:         s.observaciones ?? '',
          });
        })
        .catch(console.error);
    }
  }, [id, esEdicion]);

  // Cuando cambia sucursal en modo INVENTARIO, recargar depósitos y productos filtrados
  useEffect(() => {
    if (formData.tipo_origen !== 'INVENTARIO' || !formData.id_sucursal) return;
    servicioTecnicoService.getFormData({ id_sucursal: formData.id_sucursal })
      .then(r => {
        const nuevosProductos = r.data.productos ?? [];
        const nuevosDepositos = r.data.depositos ?? [];
        setCatalogo(prev => ({ ...prev, productos: nuevosProductos, depositos: nuevosDepositos }));
        if (formData.id_producto && !nuevosProductos.find(p => p.id_producto === formData.id_producto)) {
          set('id_producto', null);
        }
        // Auto-seleccionar depósito si solo hay uno
        if (nuevosDepositos.length === 1) {
          set('id_deposito', String(nuevosDepositos[0].id_deposito));
        } else {
          set('id_deposito', '');
        }
      })
      .catch(console.error);
  }, [formData.id_sucursal, formData.tipo_origen]); // eslint-disable-line

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!formData.descripcion_producto.trim()) return setError('La descripción del equipo es requerida');
    if (!formData.falla_reportada.trim())      return setError('La falla reportada es requerida');

    setGuardando(true);
    try {
      if (esEdicion) {
        await servicioTecnicoService.update(id, formData);
        navigate(`/servicio-tecnico/${id}`);
      } else {
        const res = await servicioTecnicoService.create(formData);
        navigate(`/servicio-tecnico/${res.data.id_servicio}`);
      }
    } catch (err) {
      setError(err.response?.data?.mensaje ?? err.response?.data?.error ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(esEdicion ? `/servicio-tecnico/${id}` : '/servicio-tecnico')}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <FaArrowLeft size={14} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {esEdicion ? 'Editar Orden' : 'Nueva Orden de Servicio'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {esEdicion ? 'Modifica los datos de la orden' : 'Registro de ingreso de equipo a servicio técnico'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Tipo de origen ── */}
        <div className={SECTION}>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Tipo de origen</h2>
          </div>
          <div className="flex gap-3">
            {[['CLIENTE', 'Equipo del cliente'], ['INVENTARIO', 'Equipo de inventario']].map(([val, lbl]) => (
              <button
                key={val} type="button"
                onClick={() => set('tipo_origen', val)}
                className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all
                  ${formData.tipo_origen === val
                    ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sucursal ── */}
        <div className={SECTION}>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Sucursal</h2>
          </div>
          <div>
            <label className={LABEL}>Sucursal</label>
            <select value={formData.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={INPUT}>
              <option value="">Seleccionar sucursal…</option>
              {catalogo.sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
            {formData.tipo_origen === 'INVENTARIO' && (
              <p className="mt-1 text-[11px] text-zinc-400">Elegí la sucursal primero para filtrar los depósitos y productos disponibles</p>
            )}
          </div>
        </div>

        {/* ── Cliente / Producto de inventario ── */}
        {formData.tipo_origen === 'CLIENTE' ? (
          <div className={SECTION}>
            <div className="flex items-center gap-2.5">
              <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Cliente</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={LABEL}>Cliente <span className="text-zinc-400 normal-case font-normal">(opcional)</span></label>
                <ClientePicker
                  clientes={catalogo.clientes}
                  value={formData.id_cliente}
                  onChange={v => set('id_cliente', v)}
                />
                {formData.id_cliente && (
                  <button type="button" onClick={() => set('id_cliente', null)}
                    className="mt-1 text-xs text-zinc-400 hover:text-red-500 transition-colors">
                    ✕ Quitar cliente
                  </button>
                )}
              </div>
              <div>
                <label className={LABEL}>N° de venta de origen <span className="text-zinc-400 normal-case font-normal">(opcional)</span></label>
                <input type="number" min="1" step="1"
                  value={formData.id_venta_origen}
                  onChange={e => set('id_venta_origen', e.target.value)}
                  placeholder="ID de la venta" className={INPUT} />
              </div>
            </div>
          </div>
        ) : (
          <div className={SECTION}>
            <div className="flex items-center gap-2.5">
              <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Producto del inventario</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={LABEL}>Producto del catálogo</label>
                <ProductoCatalogo
                  productos={catalogo.productos}
                  value={formData.id_producto}
                  onChange={prod => {
                    if (!prod) {
                      set('id_producto', null);
                      return;
                    }
                    set('id_producto', prod.id_producto);
                    const desc = [prod.nombre, prod.detalle].filter(Boolean).join(' ');
                    set('descripcion_producto', desc);
                    set('marca_producto', prod.marca ?? '');
                    set('modelo_producto', prod.modelo ?? '');
                    set('color_producto', prod.color ?? '');
                  }}
                />
              </div>
              <div className="sm:max-w-xs">
                <label className={LABEL}>Depósito de origen *</label>
                <select
                  value={formData.id_deposito}
                  onChange={e => set('id_deposito', e.target.value)}
                  required={formData.tipo_origen === 'INVENTARIO'}
                  className={INPUT}
                >
                  <option value="">Seleccionar depósito…</option>
                  {catalogo.depositos.map(d => (
                    <option key={d.id_deposito} value={d.id_deposito}>
                      {d.codigo} — {d.nombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">Depósito del que saldrá el producto al kardex</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Datos del equipo ── */}
        <div className={SECTION}>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Datos del equipo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LABEL}>Descripción del equipo *</label>
              <input required value={formData.descripcion_producto}
                onChange={e => set('descripcion_producto', e.target.value)}
                placeholder="Ej: Refrigeradora Samsung No Frost 380L"
                className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Marca</label>
              <input value={formData.marca_producto} onChange={e => set('marca_producto', e.target.value)}
                placeholder="Samsung, LG, Electrolux…" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Modelo</label>
              <input value={formData.modelo_producto} onChange={e => set('modelo_producto', e.target.value)}
                placeholder="RT38K5400S8" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>N° de serie</label>
              <input value={formData.numero_serie} onChange={e => set('numero_serie', e.target.value)}
                placeholder="S/N del equipo" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Color</label>
              <input value={formData.color_producto} onChange={e => set('color_producto', e.target.value)}
                placeholder="Plateado, Negro, Blanco…" className={INPUT} />
            </div>
          </div>
        </div>

        {/* ── Recepción ── */}
        <div className={SECTION}>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Recepción</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fecha de recepción</label>
              <input type="datetime-local" value={formData.fecha_recepcion}
                onChange={e => set('fecha_recepcion', e.target.value)} className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Falla reportada *</label>
              <textarea required value={formData.falla_reportada}
                onChange={e => set('falla_reportada', e.target.value)}
                rows={3} placeholder="Descripción del problema que reporta el cliente o la tienda"
                className={`${INPUT} resize-none`} />
            </div>
            <div>
              <label className={LABEL}>Accesorios recibidos</label>
              <input value={formData.accesorios_recibidos} onChange={e => set('accesorios_recibidos', e.target.value)}
                placeholder="Control remoto, cables, manual…" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Condición física al recibir</label>
              <input value={formData.condicion_fisica} onChange={e => set('condicion_fisica', e.target.value)}
                placeholder="Golpes, rayones, daños visibles…" className={INPUT} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className={LABEL}>Prioridad</label>
                <select value={formData.prioridad} onChange={e => set('prioridad', e.target.value)} className={INPUT}>
                  <option value="BAJA">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mt-5">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" checked={formData.garantia}
                    onChange={e => set('garantia', e.target.checked)} />
                  <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full peer-checked:bg-yellow-400 transition-colors" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bajo garantía</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── Servicio ── */}
        <div className={SECTION}>
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Servicio técnico</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Técnico / taller externo</label>
              <select value={formData.id_tecnico_externo} onChange={e => set('id_tecnico_externo', e.target.value)} className={INPUT}>
                <option value="">Sin técnico asignado</option>
                {catalogo.tecnicos.map(t => (
                  <option key={t.id_tecnico} value={t.id_tecnico}>
                    {t.nombre}{t.especialidad ? ` — ${t.especialidad}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha de envío al técnico</label>
              <input type="date" value={formData.fecha_envio_tecnico}
                onChange={e => set('fecha_envio_tecnico', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha estimada de entrega al cliente</label>
              <input type="date" value={formData.fecha_estimada_entrega}
                onChange={e => set('fecha_estimada_entrega', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Costo estimado (Gs.)</label>
              <input type="number" min="0" step="1" value={formData.costo_estimado}
                onChange={e => set('costo_estimado', e.target.value)} className={INPUT} />
            </div>
            {esEdicion && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Diagnóstico técnico</label>
                  <textarea value={formData.diagnostico} onChange={e => set('diagnostico', e.target.value)}
                    rows={2} placeholder="Diagnóstico realizado por el técnico" className={`${INPUT} resize-none`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Trabajo realizado</label>
                  <textarea value={formData.trabajo_realizado} onChange={e => set('trabajo_realizado', e.target.value)}
                    rows={2} placeholder="Descripción de la reparación efectuada" className={`${INPUT} resize-none`} />
                </div>
                <div>
                  <label className={LABEL}>Repuestos usados</label>
                  <input value={formData.repuestos_usados} onChange={e => set('repuestos_usados', e.target.value)}
                    placeholder="Lista de piezas reemplazadas" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Costo final (Gs.)</label>
                  <input type="number" min="0" step="1" value={formData.costo_final ?? '0'}
                    onChange={e => set('costo_final', e.target.value)} className={INPUT} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className={LABEL}>Observaciones</label>
              <textarea value={formData.observaciones} onChange={e => set('observaciones', e.target.value)}
                rows={2} placeholder="Notas adicionales" className={`${INPUT} resize-none`} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-3 justify-end pb-6">
          <button type="button"
            onClick={() => navigate(esEdicion ? `/servicio-tecnico/${id}` : '/servicio-tecnico')}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {guardando && <FaSpinner className="animate-spin" size={12} />}
            {esEdicion ? 'Guardar cambios' : 'Crear orden'}
          </button>
        </div>

      </form>
    </div>
  );
}
