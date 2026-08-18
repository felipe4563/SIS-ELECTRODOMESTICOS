import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { comprasService }     from '../../services/compras.service';
import { tiposCambioService } from '../../services/configuracion.service';
import { FaArrowLeft, FaSpinner, FaPlus, FaTrash } from 'react-icons/fa';

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOY      = new Date().toISOString().slice(0, 10);
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors';
const labelCls = 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1';

function calcSubtotal(it) {
  const base = Number(it.cantidad || 0) * Number(it.precio_unitario || 0);
  const desc = base * (Number(it.descuento_porc || 0) / 100);
  const imp  = (base - desc) * (Number(it.impuesto_porc || 0) / 100);
  return +(base - desc + imp).toFixed(2);
}

// ── Ítem de producto (card responsivo) ───────────────────────────────────────
function ItemProducto({ fila, productos, impuestos, idProveedor, onChange, onRemove, esUnico }) {
  const [busqueda, setBusqueda] = useState('');
  const [verTodos, setVerTodos] = useState(false);

  const productosDelProveedor = useMemo(
    () => idProveedor ? productos.filter(p => String(p.id_proveedor_default) === String(idProveedor)) : productos,
    [productos, idProveedor]
  );
  const hayFiltroProveedor = Boolean(idProveedor) && productosDelProveedor.length !== productos.length;
  const base = (verTodos || !hayFiltroProveedor) ? productos : productosDelProveedor;

  const opciones = useMemo(() => {
    if (!busqueda) return base.slice(0, 60);
    const q = busqueda.toLowerCase();
    return base.filter(p =>
      p.producto.toLowerCase().includes(q) ||
      p.codigo_interno.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [base, busqueda]);

  const sub = calcSubtotal(fila);

  return (
    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      {/* Selector de producto */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            placeholder="Buscar por nombre o código…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={inputCls + ' text-xs'}
          />
          {hayFiltroProveedor && (
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 cursor-pointer select-none w-fit">
              <input
                type="checkbox" checked={verTodos}
                onChange={e => setVerTodos(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-yellow-400"
              />
              Ver todos los productos (no solo los de este proveedor)
            </label>
          )}
          <select
            value={fila.id_producto}
            onChange={e => {
              const id   = e.target.value;
              const prod = productos.find(p => String(p.id_producto) === String(id));
              const impDef = prod?.id_impuesto_default
                ? impuestos.find(i => String(i.id_impuesto) === String(prod.id_impuesto_default))
                : impuestos.find(i => i.es_default);
              onChange({
                id_producto:     id,
                precio_unitario: prod ? String(prod.precio_real) : '0',
                id_impuesto:     impDef ? String(impDef.id_impuesto) : '',
                impuesto_porc:   impDef ? String(impDef.porcentaje) : '0',
              });
            }}
            className={inputCls + ' text-xs'}
          >
            <option value="">— Seleccionar producto —</option>
            {opciones.map(p => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.codigo_interno} — {p.producto}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onRemove}
          disabled={esUnico}
          className="self-start mt-1 p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-25 transition-colors"
          title="Eliminar ítem"
        >
          <FaTrash className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Campos numéricos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" min="0.01" step="0.01"
            value={fila.cantidad} onChange={e => onChange('cantidad', e.target.value)}
            className={inputCls + ' text-right'} />
        </div>
        <div>
          <label className={labelCls}>Precio unit.</label>
          <input type="number" min="0" step="0.01"
            value={fila.precio_unitario} onChange={e => onChange('precio_unitario', e.target.value)}
            className={inputCls + ' text-right'} />
        </div>
        <div>
          <label className={labelCls}>Descuento %</label>
          <input type="number" min="0" max="100" step="0.1"
            value={fila.descuento_porc} onChange={e => onChange('descuento_porc', e.target.value)}
            className={inputCls + ' text-right'} />
        </div>
        <div>
          <label className={labelCls}>Impuesto</label>
          <select
            value={fila.id_impuesto}
            onChange={e => {
              const imp = impuestos.find(i => String(i.id_impuesto) === e.target.value);
              onChange({ id_impuesto: e.target.value, impuesto_porc: imp ? String(imp.porcentaje) : '0' });
            }}
            className={inputCls}
          >
            <option value="">Sin imp.</option>
            {impuestos.map(i => (
              <option key={i.id_impuesto} value={i.id_impuesto}>
                {i.codigo} ({Number(i.porcentaje).toFixed(0)}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subtotal del ítem */}
      <div className="mt-2.5 flex justify-end items-center gap-2">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">Subtotal:</span>
        <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
          {fmtMonto(sub)}
        </span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CompraForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  const [catalogo,  setCatalogo]  = useState(null);   // null = cargando
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  const [datos, setDatos] = useState({
    id_proveedor:        '',
    id_sucursal:         '',
    id_deposito_destino: '',
    id_moneda:           '',
    tipo_cambio:         '1',
    numero_factura:      '',
    fecha_pedido:        HOY,
    fecha_estim_llegada: '',
    descuento:           '0',
    impuesto:            '0',
    flete:               '0',
    otros_costos:        '0',
    observaciones:       '',
  });

  const [items, setItems] = useState([
    { id_producto: '', cantidad: '1', precio_unitario: '0', descuento_porc: '0', id_impuesto: '', impuesto_porc: '0' },
  ]);

  // Carga catálogos + compra (si es edición)
  useEffect(() => {
    comprasService.getFormData()
      .then(({ data }) => {
        setCatalogo({
          proveedores: data.proveedores ?? [],
          sucursales:  data.sucursales  ?? [],
          depositos:   data.depositos   ?? [],
          monedas:     data.monedas     ?? [],
          productos:   data.productos   ?? [],
          impuestos:   (data.impuestos ?? []).filter(i => i.tipo === 'COMPRA' || i.tipo === 'AMBOS'),
        });
      })
      .catch(() => setCatalogo({ proveedores: [], sucursales: [], depositos: [], monedas: [], productos: [], impuestos: [] }));

    if (esEdicion) {
      comprasService.getOne(id).then(res => {
        const { compra, detalle } = res.data;
        setDatos({
          id_proveedor:        String(compra.id_proveedor),
          id_sucursal:         String(compra.id_sucursal),
          id_deposito_destino: String(compra.id_deposito_destino),
          id_moneda:           String(compra.id_moneda),
          tipo_cambio:         String(compra.tipo_cambio),
          numero_factura:      compra.numero_factura ?? '',
          fecha_pedido:        compra.fecha_pedido?.slice(0, 10) ?? HOY,
          fecha_estim_llegada: compra.fecha_estim_llegada?.slice(0, 10) ?? '',
          descuento:           String(compra.descuento),
          impuesto:            String(compra.impuesto),
          flete:               String(compra.flete),
          otros_costos:        String(compra.otros_costos),
          observaciones:       compra.observaciones ?? '',
        });
        setItems(detalle.map(d => ({
          id_producto:     String(d.id_producto),
          cantidad:        String(d.cantidad),
          precio_unitario: String(d.precio_unitario),
          descuento_porc:  String(d.descuento_porc),
          id_impuesto:     d.id_impuesto ? String(d.id_impuesto) : '',
          impuesto_porc:   String(d.impuesto_porc ?? 0),
        })));
      }).catch(() => {});
    }
  }, []); // eslint-disable-line

  const setD = (k, v) => setDatos(p => ({ ...p, [k]: v }));

  // Auto-fill tipo de cambio al cambiar moneda
  useEffect(() => {
    if (!datos.id_moneda || !catalogo?.monedas.length) return;
    const mon = catalogo.monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));
    if (!mon) return;
    if (mon.es_moneda_base) {
      setD('tipo_cambio', '1');
    } else {
      tiposCambioService.getHoy()
        .then(r => {
          const rates = r.data.tipos_cambio ?? r.data ?? [];
          const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(mon.id_moneda));
          setD('tipo_cambio', rate ? String(rate.tasa_compra) : '6.86');
        })
        .catch(() => setD('tipo_cambio', '6.86'));
    }
  }, [datos.id_moneda, catalogo?.monedas]); // eslint-disable-line

  const addItem    = () => setItems(prev => [...prev, { id_producto: '', cantidad: '1', precio_unitario: '0', descuento_porc: '0', id_impuesto: '', impuesto_porc: '0' }]);
  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, kOrUpdates, v) => setItems(prev =>
    prev.map((it, i) => {
      if (i !== idx) return it;
      return typeof kOrUpdates === 'object' ? { ...it, ...kOrUpdates } : { ...it, [kOrUpdates]: v };
    })
  );

  const totales = useMemo(() => {
    const subtotal  = items.reduce((s, it) => s + calcSubtotal(it), 0);
    const descuento = Number(datos.descuento    || 0);
    const impuesto  = Number(datos.impuesto     || 0);
    const flete     = Number(datos.flete        || 0);
    const otros     = Number(datos.otros_costos || 0);
    const total     = +(subtotal - descuento + impuesto + flete + otros).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), descuento, impuesto, flete, otros, total };
  }, [items, datos.descuento, datos.impuesto, datos.flete, datos.otros_costos]);

  const handleGuardar = async () => {
    setError('');
    if (!datos.id_proveedor || !datos.id_sucursal || !datos.id_deposito_destino || !datos.id_moneda)
      return setError('Completa los campos obligatorios: proveedor, depósito destino y moneda');
    if (items.some(it => !it.id_producto || Number(it.cantidad) <= 0))
      return setError('Cada ítem debe tener un producto y cantidad mayor a 0');

    setGuardando(true);
    try {
      const payload = {
        ...datos,
        items: items.map(it => ({
          id_producto:     Number(it.id_producto),
          cantidad:        Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          descuento_porc:  Number(it.descuento_porc),
          descuento_monto: 0,
          impuesto_porc:   0,
        })),
      };
      if (esEdicion) {
        await comprasService.update(id, payload);
        navigate(`/compras/${id}`);
      } else {
        const res = await comprasService.create(payload);
        navigate(`/compras/${res.data.id_compra}`);
      }
    } catch (e) {
      setError(e?.response?.data?.error ?? 'Error al guardar la compra');
    } finally {
      setGuardando(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!catalogo) return (
    <div className="flex items-center justify-center h-64 gap-3 text-zinc-400 dark:text-zinc-500">
      <FaSpinner className="animate-spin h-5 w-5" />
      <span className="text-sm">Cargando formulario…</span>
    </div>
  );

  const monedaSel = catalogo.monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));

  return (
    <div className="max-w-4xl space-y-5 pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/compras')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <FaArrowLeft className="h-3.5 w-3.5" /> Volver
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar Pre-pedido' : 'Nueva Compra'}
        </h1>
      </div>

      {/* Datos generales */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-5">
          Datos generales
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Proveedor */}
          <div className="sm:col-span-2">
            <label className={labelCls}>Proveedor *</label>
            <select value={datos.id_proveedor} onChange={e => setD('id_proveedor', e.target.value)} className={inputCls}>
              <option value="">— Seleccionar proveedor —</option>
              {catalogo.proveedores.map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>{p.codigo} — {p.razon_social}</option>
              ))}
            </select>
          </div>

          {/* Nº Factura */}
          <div>
            <label className={labelCls}>Nº Factura proveedor</label>
            <input type="text" value={datos.numero_factura} onChange={e => setD('numero_factura', e.target.value)}
              placeholder="Opcional" className={inputCls} />
          </div>

          {/* Depósito destino (define la sucursal automáticamente) */}
          <div>
            <label className={labelCls}>Depósito / Almacén destino *</label>
            <select
              value={datos.id_deposito_destino}
              onChange={e => {
                const idDep = e.target.value;
                const dep   = catalogo.depositos.find(d => String(d.id_deposito) === idDep);
                setDatos(p => ({
                  ...p,
                  id_deposito_destino: idDep,
                  id_sucursal: dep ? String(dep.id_sucursal) : '',
                }));
              }}
              className={inputCls}
            >
              <option value="">— Seleccionar —</option>
              {catalogo.depositos.map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>
                  {d.codigo} — {d.nombre} ({d.sucursal_nombre})
                </option>
              ))}
            </select>
          </div>

          {/* Moneda */}
          <div>
            <label className={labelCls}>Moneda *</label>
            <select value={datos.id_moneda} onChange={e => setD('id_moneda', e.target.value)} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {catalogo.monedas.map(m => (
                <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} — {m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tipo de cambio (solo si moneda no es base) */}
          {monedaSel && !monedaSel.es_moneda_base && (
            <div>
              <label className={labelCls}>Tipo de cambio *</label>
              <input type="number" min="0.000001" step="0.000001" value={datos.tipo_cambio}
                onChange={e => setD('tipo_cambio', e.target.value)} className={inputCls} />
            </div>
          )}

          {/* Fecha pedido */}
          <div>
            <label className={labelCls}>Fecha pedido *</label>
            <input type="date" value={datos.fecha_pedido} onChange={e => setD('fecha_pedido', e.target.value)} className={inputCls} />
          </div>

          {/* Fecha est. llegada */}
          <div>
            <label className={labelCls}>Est. llegada</label>
            <input type="date" value={datos.fecha_estim_llegada} onChange={e => setD('fecha_estim_llegada', e.target.value)} className={inputCls} />
          </div>

          {/* Observaciones */}
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelCls}>Observaciones</label>
            <textarea value={datos.observaciones} onChange={e => setD('observaciones', e.target.value)}
              rows={2} placeholder="Notas adicionales…"
              className={inputCls + ' resize-none'} />
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

        {/* Cabecera de la sección */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Productos</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {items.length} ítem{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={addItem}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 text-xs font-semibold transition-colors">
            <FaPlus className="h-3 w-3" /> Agregar producto
          </button>
        </div>

        {/* Ítems */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((it, idx) => (
            <ItemProducto
              key={idx}
              fila={it}
              productos={catalogo.productos}
              impuestos={catalogo.impuestos}
              idProveedor={datos.id_proveedor}
              onChange={(k, v) => updateItem(idx, k, v)}
              onRemove={() => removeItem(idx)}
              esUnico={items.length === 1}
            />
          ))}
        </div>

        {/* Totales */}
        <div className="px-5 py-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2.5">

              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-white">{fmtMonto(totales.subtotal)}</span>
              </div>

              {[
                { label: 'Descuento global', key: 'descuento' },
                { label: 'Impuesto',         key: 'impuesto' },
                { label: 'Flete',            key: 'flete' },
                { label: 'Otros costos',     key: 'otros_costos' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={datos[key]}
                    onChange={e => setD(key, e.target.value)}
                    className="w-36 text-right font-mono px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors"
                  />
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-base text-zinc-900 dark:text-white">TOTAL</span>
                <span className="font-bold font-mono text-2xl text-zinc-900 dark:text-white">
                  {fmtMonto(totales.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => navigate('/compras')}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {guardando && <FaSpinner className="animate-spin h-4 w-4" />}
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear pre-pedido'}
        </button>
      </div>

    </div>
  );
}
