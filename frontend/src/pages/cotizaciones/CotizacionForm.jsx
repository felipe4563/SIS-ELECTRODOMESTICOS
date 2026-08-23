import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';
import { clientesService } from '../../services/clientes.service';
import api from '../../api/axios';

const RC_FORM_VACIO = { nombre: '', telefono: '', direccion: '', ciudad: '' };

const fmt   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const toNum = v => (isNaN(Number(v)) ? 0 : Number(v));

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const labelCls = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ProductoPicker
   Desktop → dropdown absoluto debajo del botón
   Mobile  → bottom-sheet fijo con backdrop
───────────────────────────────────────────────────────────────────────────── */
function ProductoPicker({ value, productos, onChange, isMobile }) {
  const [open, setOpen] = useState(false);
  const [busq, setBusq] = useState('');
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });
  const btnRef          = useRef(null);
  const dropRef         = useRef(null);

  const [filtroMarca,    setFiltroMarca]    = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroModelo,   setFiltroModelo]   = useState('');
  const cambiarFiltroMarca    = v => { setFiltroMarca(v); setFiltroProducto(''); setFiltroModelo(''); };
  const cambiarFiltroProducto = v => { setFiltroProducto(v); setFiltroModelo(''); };

  const productoSel = productos.find(p => String(p.id_producto) === String(value));

  const marcasDisponibles = [...new Set(productos.map(p => p.marca).filter(Boolean))].sort();
  const productosDisponibles = [...new Set(
    productos.filter(p => !filtroMarca || p.marca === filtroMarca).map(p => p.producto).filter(Boolean)
  )].sort();
  const modelosDisponibles = [...new Set(
    productos
      .filter(p => (!filtroMarca || p.marca === filtroMarca) && (!filtroProducto || p.producto === filtroProducto))
      .map(p => p.modelo)
      .filter(Boolean)
  )].sort();

  const filtrados = productos
    .filter(p => !filtroMarca    || p.marca    === filtroMarca)
    .filter(p => !filtroProducto || p.producto === filtroProducto)
    .filter(p => !filtroModelo   || p.modelo   === filtroModelo)
    .filter(p => {
      if (!busq.trim()) return true;
      const q = busq.toLowerCase();
      return p.producto.toLowerCase().includes(q) ||
        (p.codigo_interno ?? '').toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.modelo?.toLowerCase().includes(q);
    })
    .slice(0, 50);

  /* Posición del dropdown desktop (fixed, calculada desde el botón para no quedar
     recortado por el overflow-x-auto de la tabla) */
  const updatePos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(160, Math.min(320, window.innerHeight - r.bottom - 16)),
    });
  };

  useEffect(() => {
    if (!open || isMobile) return;
    updatePos();
    const onScrollResize = () => updatePos();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open, isMobile]);

  /* Cierre por click fuera (desktop) */
  useEffect(() => {
    if (!open || isMobile) return;
    const close = e => {
      const inBtn  = btnRef.current?.contains(e.target);
      const inDrop = dropRef.current?.contains(e.target);
      if (!inBtn && !inDrop) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, isMobile]);

  const toggle = () => setOpen(o => !o);
  const resetFiltros = () => { setBusq(''); setFiltroMarca(''); setFiltroProducto(''); setFiltroModelo(''); };
  const closeSheet = () => { setOpen(false); resetFiltros(); };
  const pick = prod => { onChange(prod); resetFiltros(); setOpen(false); };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="w-full px-3 py-2 text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors flex items-center justify-between gap-2 min-w-0"
      >
        <span className={`truncate ${productoSel ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {productoSel
            ? (<><span className="font-mono text-xs text-zinc-400 mr-1.5">[{productoSel.codigo_interno}]</span>{productoSel.producto}</>)
            : '— seleccionar producto —'}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* ── Mobile: backdrop + bottom sheet ── */}
          {isMobile && (
            <div className="fixed inset-0 z-40 bg-black/50" onClick={closeSheet} />
          )}

          <div
            ref={dropRef}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl border-t border-zinc-200 dark:border-zinc-700'
                : 'fixed z-50 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden'
            }
            style={
              isMobile
                ? { maxHeight: '65vh' }
                : { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }
            }
          >
            {/* Mobile header */}
            {isMobile && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">Seleccionar producto</span>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Búsqueda */}
            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 space-y-1.5">
              <input
                autoFocus
                type="text"
                placeholder="Buscar por nombre, código, marca o modelo..."
                value={busq}
                onChange={e => setBusq(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  value={filtroMarca}
                  onChange={e => cambiarFiltroMarca(e.target.value)}
                  className="px-1.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Marca</option>
                  {marcasDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={filtroProducto}
                  onChange={e => cambiarFiltroProducto(e.target.value)}
                  className="px-1.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Producto</option>
                  {productosDisponibles.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={filtroModelo}
                  onChange={e => setFiltroModelo(e.target.value)}
                  className="px-1.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                >
                  <option value="">Modelo</option>
                  {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Lista */}
            <ul className="overflow-y-auto flex-1 min-h-0">
              {filtrados.length === 0 ? (
                <li className="px-3 py-6 text-xs text-zinc-400 text-center">Sin resultados</li>
              ) : (
                filtrados.map(p => (
                  <li key={p.id_producto}>
                    <button
                      type="button"
                      onClick={() => pick(p)}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between gap-2 ${
                        String(p.id_producto) === String(value) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-zinc-400 flex-shrink-0">[{p.codigo_interno}]</span>
                        <span className="text-zinc-900 dark:text-white truncate">{p.producto}</span>
                      </span>
                      <span className="font-mono text-xs font-semibold text-yellow-600 dark:text-yellow-400 flex-shrink-0">
                        Bs {fmt(p.precio_publico)}
                      </span>
                    </button>
                  </li>
                ))
              )}
              {!busq.trim() && productos.length > 50 && (
                <li className="px-3 py-2 text-xs text-zinc-400 text-center border-t border-zinc-100 dark:border-zinc-800">
                  Escribe para buscar más productos...
                </li>
              )}
            </ul>

            {isMobile && <div className="h-5" />}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FilaItem  (tabla desktop | card mobile)
───────────────────────────────────────────────────────────────────────────── */
function FilaItem({ fila, index, productos, onChange, onRemove, isMobile }) {
  const prod     = productos.find(p => String(p.id_producto) === String(fila.id_producto));
  const base     = toNum(fila.cantidad) * toNum(fila.precio_unitario);
  const desc     = base * (toNum(fila.descuento_porc) / 100);
  const subtotal = +(base - desc).toFixed(2);

  const handlePickProd = p => {
    onChange({ id_producto: String(p.id_producto), precio_unitario: toNum(p.precio_publico) });
  };

  const numInput = (field, value, extra = '') => (
    <input
      type="number"
      min={field === 'cantidad' ? 0.01 : 0}
      max={field === 'descuento_porc' ? 100 : undefined}
      step={field === 'garantia_anos' ? '1' : '0.01'}
      value={value}
      onChange={e => onChange({ [field]: e.target.value })}
      placeholder={field === 'garantia_anos' ? '—' : undefined}
      className={`w-full px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 ${extra}`}
    />
  );

  /* ── Card mobile ── */
  if (isMobile) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
            Ítem {index + 1}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors text-base leading-none"
          >
            ×
          </button>
        </div>

        <ProductoPicker
          value={fila.id_producto}
          productos={productos}
          onChange={handlePickProd}
          isMobile={true}
        />

        {prod && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400">Precio:</span>
            <button
              type="button"
              onClick={() => onChange({ precio_unitario: toNum(prod.precio_publico) })}
              className="text-xs px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              Público Bs {fmt(prod.precio_publico)}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-zinc-400 dark:text-zinc-500 block mb-1">Cantidad</label>
            {numInput('cantidad', fila.cantidad, 'text-center')}
          </div>
          <div>
            <label className="text-xs text-zinc-400 dark:text-zinc-500 block mb-1">Precio unit.</label>
            {numInput('precio_unitario', fila.precio_unitario, 'text-right')}
          </div>
          <div>
            <label className="text-xs text-zinc-400 dark:text-zinc-500 block mb-1">Desc. %</label>
            {numInput('descuento_porc', fila.descuento_porc, 'text-right')}
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 dark:text-zinc-500 block mb-1">Garantía (años)</label>
          {numInput('garantia_anos', fila.garantia_anos ?? '', 'text-center')}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-200 dark:border-zinc-700/60">
          <span className="text-xs text-zinc-400">Subtotal</span>
          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">Bs {fmt(subtotal)}</span>
        </div>
      </div>
    );
  }

  /* ── Fila desktop ── */
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
      <td className="px-3 py-2 w-8 text-center">
        <span className="text-xs font-mono text-zinc-400">{index + 1}</span>
      </td>
      <td className="px-2 py-2 min-w-[240px]">
        <ProductoPicker
          value={fila.id_producto}
          productos={productos}
          onChange={handlePickProd}
          isMobile={false}
        />
        {prod && (
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <button
              type="button"
              onClick={() => onChange({ precio_unitario: toNum(prod.precio_publico) })}
              className="text-xs px-1.5 py-0.5 rounded-md text-zinc-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
            >
              Bs {fmt(prod.precio_publico)} ↑
            </button>
          </div>
        )}
      </td>
      <td className="px-2 py-2 w-24">{numInput('cantidad', fila.cantidad, 'text-right')}</td>
      <td className="px-2 py-2 w-28">{numInput('precio_unitario', fila.precio_unitario, 'text-right')}</td>
      <td className="px-2 py-2 w-20">{numInput('descuento_porc', fila.descuento_porc, 'text-right')}</td>
      <td className="px-2 py-2 w-20">{numInput('garantia_anos', fila.garantia_anos ?? '', 'text-center')}</td>
      <td className="px-2 py-2 w-28 text-right">
        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">Bs {fmt(subtotal)}</span>
      </td>
      <td className="px-2 py-2 w-10 text-center">
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-full text-zinc-300 dark:text-zinc-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 flex items-center justify-center text-sm transition-colors opacity-0 group-hover:opacity-100 mx-auto"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────────────────────── */
export default function CotizacionForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const esEdicion = Boolean(id);

  const [sucursales, setSucursales] = useState([]);
  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [monedas,    setMonedas]    = useState([]);

  const [form, setForm] = useState({
    id_sucursal: '', id_cliente: '', id_moneda: '', tipo_cambio: 1,
    tipo_cotizacion: 'CONTADO', fecha_vencimiento: '',
    descuento_porc: 0, impuesto: 0, observaciones: '',
  });
  const [items,       setItems]       = useState([{ id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0, garantia_anos: '' }]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [guardando,   setGuardando]   = useState(false);
  const [cargando,    setCargando]    = useState(esEdicion);
  const [error,       setError]       = useState('');

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [rcForm, setRcForm]   = useState(RC_FORM_VACIO);
  const [rcError, setRcError] = useState('');
  const [rcGuardando, setRcGuardando] = useState(false);

  /* Cargar form-data en una sola llamada */
  useEffect(() => {
    cotizacionesService.getFormData()
      .then(r => {
        const d = r.data;
        setSucursales(d.sucursales ?? []);
        setClientes(d.clientes ?? []);
        setProductos(d.productos ?? []);
        const mons = d.monedas ?? [];
        setMonedas(mons);
        const base = mons.find(m => m.es_moneda_base);
        if (base && !esEdicion) setForm(p => ({ ...p, id_moneda: String(base.id_moneda) }));
      })
      .catch(() => {});

    if (esEdicion) {
      cotizacionesService.getOne(id)
        .then(r => {
          const c = r.data;
          setForm({
            id_sucursal: String(c.id_sucursal), id_cliente: String(c.id_cliente),
            id_moneda: String(c.id_moneda), tipo_cambio: c.tipo_cambio,
            tipo_cotizacion: c.tipo_cotizacion,
            fecha_vencimiento: c.fecha_vencimiento ? c.fecha_vencimiento.slice(0, 10) : '',
            descuento_porc: c.descuento_porc ?? 0, impuesto: c.impuesto ?? 0,
            observaciones: c.observaciones ?? '',
          });
          setItems((c.detalle ?? []).map(d => ({
            id_producto:    String(d.id_producto),
            cantidad:       d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_porc: d.descuento_porc ?? 0,
            garantia_anos: d.garantia_anos ?? '',
          })));
        })
        .catch(() => navigate('/cotizaciones'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  /* Tipo de cambio automático */
  useEffect(() => {
    if (!form.id_moneda || monedas.length === 0) return;
    const sel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));
    if (!sel) return;
    if (sel.es_moneda_base) { setF('tipo_cambio', 1); return; }
    api.get('/tipos-cambio/hoy')
      .then(r => {
        const rates = r.data.tipos_cambio ?? r.data ?? [];
        const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(sel.id_moneda));
        setF('tipo_cambio', rate ? Number(rate.tasa_venta) : 6.96);
      })
      .catch(() => setF('tipo_cambio', 6.96));
  }, [form.id_moneda, monedas]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_cliente) { setClienteInfo(null); return; }
    setClienteInfo(clientes.find(c => String(c.id_cliente) === String(form.id_cliente)) ?? null);
  }, [form.id_cliente, clientes]);

  const setF       = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addItem    = ()     => setItems(p => [...p, { id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0, garantia_anos: '' }]);
  const removeItem = i      => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const setRc = (k, v) => setRcForm(p => ({ ...p, [k]: v }));

  const clientesFiltrados = useMemo(() => clientes.filter(c => {
    if (!busquedaCliente.trim()) return true;
    const q = busquedaCliente.toLowerCase();
    return (
      (c.documento ?? '').toLowerCase().includes(q) ||
      (c.nombres ?? '').toLowerCase().includes(q) ||
      (c.apellidos ?? '').toLowerCase().includes(q) ||
      (c.razon_social ?? '').toLowerCase().includes(q) ||
      (c.codigo ?? '').toLowerCase().includes(q)
    );
  }).slice(0, 50), [clientes, busquedaCliente]);

  // Si la búsqueda deja un único cliente posible, se selecciona solo (sin click extra en el select)
  useEffect(() => {
    if (!busquedaCliente.trim() || clientesFiltrados.length !== 1) return;
    const unico = clientesFiltrados[0];
    if (String(form.id_cliente) !== String(unico.id_cliente)) {
      setF('id_cliente', String(unico.id_cliente));
    }
  }, [clientesFiltrados]); // eslint-disable-line

  const guardarClienteRapido = async () => {
    setRcError('');
    const { nombre, telefono, direccion, ciudad } = rcForm;
    if (!nombre.trim()) return setRcError('El nombre es requerido');
    setRcGuardando(true);
    try {
      const res = await clientesService.create({
        nombres: nombre.trim(),
        documento: busquedaCliente.trim() || undefined,
        telefono: telefono.trim() || undefined,
      });
      let nuevoCliente = res.data.cliente;

      if (direccion.trim()) {
        await clientesService.createDireccion(nuevoCliente.id_cliente, {
          direccion: direccion.trim(),
          ciudad: ciudad.trim() || undefined,
          es_principal: true,
        });
      }

      setClientes(prev => [...prev, nuevoCliente]);
      setF('id_cliente', String(nuevoCliente.id_cliente));
      setBusquedaCliente('');
      setRcForm(RC_FORM_VACIO);
    } catch (err) {
      setRcError(err.response?.data?.error ?? 'Error al crear cliente');
    } finally {
      setRcGuardando(false);
    }
  };

  const subtotal  = items.reduce((s, it) => {
    const base = toNum(it.cantidad) * toNum(it.precio_unitario);
    return s + base - base * (toNum(it.descuento_porc) / 100);
  }, 0);
  const descMonto = subtotal * (toNum(form.descuento_porc) / 100);
  const impuesto  = toNum(form.impuesto);
  const total     = subtotal - descMonto + impuesto;

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_cliente)
      return setError('Sucursal y cliente son obligatorios.');
    const itemsValidos = items.filter(it => it.id_producto && toNum(it.cantidad) > 0);
    if (!itemsValidos.length)
      return setError('Agrega al menos un producto con cantidad válida.');
    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
      let cotId = id;
      if (esEdicion) {
        await cotizacionesService.update(id, payload);
      } else {
        const res = await cotizacionesService.create(payload);
        cotId = res.data.id_cotizacion;
      }
      navigate(`/cotizaciones/${cotId}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la cotización.');
    } finally {
      setGuardando(false);
    }
  };

  const monedaSel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-32 text-zinc-400">
        <Spinner /><span className="text-sm">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl pb-10">

      {/* ── Encabezado ── */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
          className="mt-0.5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-0.5">
            {esEdicion ? 'Cotizaciones / Editar' : 'Cotizaciones / Nueva'}
          </p>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            {esEdicion ? 'Editar cotización' : 'Nueva cotización'}
          </h1>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Datos generales ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
          <span className="w-0.5 h-4 rounded-full bg-yellow-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Datos generales</p>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sucursal */}
          <div>
            <label className={labelCls}>Sucursal <span className="text-red-400">*</span></label>
            <select
              value={form.id_sucursal}
              onChange={e => setF('id_sucursal', e.target.value)}
              disabled={esEdicion}
              className={inputCls}
            >
              <option value="">— seleccionar —</option>
              {sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Cliente */}
          <div className="sm:col-span-1 lg:col-span-2">
            <label className={labelCls}>Cliente <span className="text-red-400">*</span></label>
            <input
              type="text" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
              placeholder="Buscar por CI, nombre o código…"
              className={`${inputCls} mb-1.5`}
            />

            {busquedaCliente.trim() && clientesFiltrados.length === 1 ? (
              <div className="px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 truncate">
                    {clientesFiltrados[0].razon_social || [clientesFiltrados[0].nombres, clientesFiltrados[0].apellidos].filter(Boolean).join(' ')}
                  </p>
                  {clienteInfo && (
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5 flex flex-wrap gap-x-2">
                      {clienteInfo.tipo_documento && <span>{clienteInfo.tipo_documento}: {clienteInfo.documento}</span>}
                      {clienteInfo.telefono && <span>· Tel: {clienteInfo.telefono}</span>}
                      {clienteInfo.email && <span>· {clienteInfo.email}</span>}
                    </p>
                  )}
                </div>
                <button
                  type="button" onClick={() => setBusquedaCliente('')}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : clientesFiltrados.length > 0 ? (
              <>
                <select
                  value={form.id_cliente}
                  onChange={e => setF('id_cliente', e.target.value)}
                  className={inputCls}
                >
                  <option value="">— seleccionar —</option>
                  {clientesFiltrados.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      [{c.codigo}] {c.razon_social || [c.nombres, c.apellidos].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
                {clienteInfo && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {clienteInfo.tipo_documento && (
                      <span>{clienteInfo.tipo_documento}: {clienteInfo.documento}</span>
                    )}
                    {clienteInfo.telefono && <span>· Tel: {clienteInfo.telefono}</span>}
                    {clienteInfo.email && <span>· {clienteInfo.email}</span>}
                  </p>
                )}
              </>
            ) : busquedaCliente.trim() ? (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No se encontró a "{busquedaCliente.trim()}" — completá los datos para crearlo.
                </p>

                <div>
                  <label className={labelCls}>Nombre / Razón social *</label>
                  <input
                    type="text" value={rcForm.nombre} onChange={e => setRc('nombre', e.target.value)}
                    placeholder="Ej: Juan Pérez" className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    type="text" value={rcForm.telefono} onChange={e => setRc('telefono', e.target.value)}
                    placeholder="Opcional" className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className={labelCls}>Dirección</label>
                    <input
                      type="text" value={rcForm.direccion} onChange={e => setRc('direccion', e.target.value)}
                      placeholder="Opcional" className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Ciudad</label>
                    <input
                      type="text" value={rcForm.ciudad} onChange={e => setRc('ciudad', e.target.value)}
                      placeholder="Opcional" className={inputCls}
                    />
                  </div>
                </div>

                {rcError && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5">
                    <span>⚠</span> {rcError}
                  </p>
                )}

                <button
                  type="button" onClick={guardarClienteRapido} disabled={rcGuardando}
                  className="w-full py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-xs transition-colors"
                >
                  {rcGuardando ? 'Creando…' : 'Crear y usar este cliente'}
                </button>
              </div>
            ) : null}
          </div>

          {/* Tipo de pago */}
          <div>
            <label className={labelCls}>Tipo de pago</label>
            <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              {[['CONTADO', 'Contado'], ['CREDITO', 'Crédito']].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setF('tipo_cotizacion', val)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    form.tipo_cotizacion === val
                      ? 'bg-yellow-400 text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha vencimiento */}
          <div>
            <label className={labelCls}>Válida hasta</label>
            <input
              type="date"
              value={form.fecha_vencimiento}
              onChange={e => setF('fecha_vencimiento', e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Moneda */}
          <div>
            <label className={labelCls}>Moneda</label>
            <select
              value={form.id_moneda}
              onChange={e => setF('id_moneda', e.target.value)}
              className={inputCls}
            >
              <option value="">— seleccionar —</option>
              {monedas.map(m => (
                <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
              ))}
            </select>
          </div>

          {/* Tipo de cambio */}
          {monedaSel && !monedaSel.es_moneda_base && (
            <div>
              <label className={labelCls}>Tipo de cambio</label>
              <input
                type="number" min="0.000001" step="0.000001"
                value={form.tipo_cambio}
                onChange={e => setF('tipo_cambio', e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {/* Observaciones */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={e => setF('observaciones', e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Condiciones, garantías, notas adicionales..."
            />
          </div>
        </div>
      </div>

      {/* ── Productos ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-yellow-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Productos
              {items.length > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  ({items.length} ítem{items.length !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
        </div>

        {/* ── Desktop: tabla ── */}
        <div className="hidden sm:block overflow-x-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-zinc-400">Sin productos. Haz clic en "Agregar" para comenzar.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="w-8 px-3 py-2 text-center text-xs font-semibold text-zinc-400">#</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Producto</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-24">Cantidad</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-28">Precio</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-20">Desc %</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-20">Garantía</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide w-28">Subtotal</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((fila, i) => (
                  <FilaItem
                    key={i}
                    fila={fila}
                    index={i}
                    productos={productos}
                    onChange={patch => updateItem(i, patch)}
                    onRemove={() => removeItem(i)}
                    isMobile={false}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Mobile: cards ── */}
        <div className="sm:hidden p-3 space-y-3">
          {items.length === 0 ? (
            <p className="text-center py-6 text-sm text-zinc-400">Sin productos. Toca "+ Agregar".</p>
          ) : (
            items.map((fila, i) => (
              <FilaItem
                key={i}
                fila={fila}
                index={i}
                productos={productos}
                onChange={patch => updateItem(i, patch)}
                onRemove={() => removeItem(i)}
                isMobile={true}
              />
            ))
          )}
        </div>

        {/* ── Totales ── */}
        <div className="px-4 sm:px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmt(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">Descuento global</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min={0} max={100} step="0.01"
                    value={form.descuento_porc}
                    onChange={e => setF('descuento_porc', e.target.value)}
                    className="w-14 px-2 py-0.5 text-xs text-right rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                  <span className="text-xs text-zinc-400">%</span>
                  <span className="font-mono text-xs text-red-500 dark:text-red-400 w-20 text-right">−Bs {fmt(descMonto)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">Impuesto</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">Bs</span>
                  <input
                    type="number" min={0} step="0.01"
                    value={form.impuesto}
                    onChange={e => setF('impuesto', e.target.value)}
                    className="w-24 px-2 py-0.5 text-xs text-right rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-zinc-900 dark:text-white">Total</span>
                <span className="font-mono text-lg font-bold text-zinc-900 dark:text-white">Bs {fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Acciones ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando && <Spinner />}
          {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cotización'}
        </button>
        <button
          type="button"
          onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
