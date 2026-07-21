import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams }      from 'react-router-dom';
import { FaArrowLeft, FaSpinner }      from 'react-icons/fa';
import { servicioTecnicoService }      from '../../services/servicioTecnico.service';

const INPUT = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const LABEL = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1';
const SECTION = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4';

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
  ).slice(0, 30);

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

/* ── Buscador de producto ─────────────────────────────────────────────────── */
function ProductoPicker({ productos, value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const seleccionado = productos.find(p => p.id_producto === value);
  const filtrados = productos.filter(p =>
    q === '' ||
    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (p.detalle ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (p.marca ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (p.modelo ?? '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 40);

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
        {seleccionado
          ? <span className="truncate">{seleccionado.nombre}{seleccionado.detalle ? ` ${seleccionado.detalle}` : ''}{seleccionado.marca ? ` — ${seleccionado.marca}` : ''}</span>
          : <span className="text-zinc-400">Sin producto del catálogo</span>}
        <svg className="w-4 h-4 text-zinc-400 flex-shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-700">
            <input
              autoFocus
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nombre, marca, modelo…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
          </div>
          {value && (
            <button type="button"
              className="w-full text-left px-4 py-2 text-xs text-zinc-400 hover:text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-b border-zinc-100 dark:border-zinc-700"
              onClick={() => { onChange(null); setOpen(false); }}>
              ✕ Sin producto del catálogo
            </button>
          )}
          {filtrados.length === 0
            ? <p className="px-4 py-3 text-sm text-zinc-400">Sin resultados</p>
            : filtrados.map(p => (
              <button
                key={p.id_producto} type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                onClick={() => { onChange(p); setOpen(false); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {p.nombre}{p.detalle ? ` ${p.detalle}` : ''}
                  </span>
                  {p.stock != null && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0
                      ${Number(p.stock) > 1
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                      {Number(p.stock)} uds
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {[p.marca, p.modelo, p.color].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))
          }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={LABEL}>Producto del catálogo</label>
                <ProductoPicker
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
              <div>
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
              <label className={LABEL}>Sucursal</label>
              <select value={formData.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={INPUT}>
                <option value="">Seleccionar sucursal…</option>
                {catalogo.sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
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
              <input type="number" min="0" step="1000" value={formData.costo_estimado}
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
                  <input type="number" min="0" step="1000" value={formData.costo_final ?? '0'}
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
