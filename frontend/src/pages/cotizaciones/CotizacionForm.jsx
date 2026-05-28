import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cotizacionesService } from '../../services/cotizaciones.service';
import { clientesService }     from '../../services/clientes.service';
import { productosService }    from '../../services/productos.service';
import { sucursalesService, monedasService } from '../../services/configuracion.service';
import api from '../../api/axios';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

function FilaItem({ fila, index, productos, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');
  const filtrados = productos.filter(p =>
    !busqueda ||
    p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').includes(busqueda)
  );

  const base     = Number(fila.cantidad ?? 0) * Number(fila.precio_unitario ?? 0);
  const desc     = base * (Number(fila.descuento_porc ?? 0) / 100);
  const subtotal = +(base - desc).toFixed(2);

  const inputCls = 'w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400';

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 align-top">
      <td className="px-3 py-2 min-w-[200px]">
        <input type="text" placeholder="Buscar producto…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className={inputCls + ' mb-1'} />
        <select value={fila.id_producto}
          onChange={e => {
            const prod = productos.find(p => String(p.id_producto) === e.target.value);
            onChange({ id_producto: e.target.value, precio_unitario: prod?.precio_publico ?? 0 });
          }}
          className={inputCls}>
          <option value="">— seleccionar —</option>
          {filtrados.slice(0, 50).map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              [{p.codigo_interno}] {p.producto}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 w-24">
        <input type="number" min={0.01} step="0.01" value={fila.cantidad}
          onChange={e => onChange({ cantidad: e.target.value })}
          className={inputCls + ' text-right'} />
      </td>
      <td className="px-3 py-2 w-28">
        <input type="number" min={0} step="0.01" value={fila.precio_unitario}
          onChange={e => onChange({ precio_unitario: e.target.value })}
          className={inputCls + ' text-right'} />
      </td>
      <td className="px-3 py-2 w-20">
        <input type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
          onChange={e => onChange({ descuento_porc: e.target.value })}
          className={inputCls + ' text-right'} />
      </td>
      <td className="px-3 py-2 w-28 text-right font-mono text-sm font-semibold text-zinc-900 dark:text-white">
        {fmtMonto(subtotal)}
      </td>
      <td className="px-3 py-2 w-10 text-center">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      </td>
    </tr>
  );
}

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
  const [items,      setItems]      = useState([{ id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0 }]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [cargando,   setCargando]   = useState(esEdicion);
  const [error,      setError]      = useState('');

  useEffect(() => {
    Promise.all([
      sucursalesService.getAll(),
      clientesService.getAll(),
      productosService.getAll(),
      monedasService.getAll(),
    ]).then(([rs, rc, rp, rm]) => {
      setSucursales(rs.data.sucursales ?? rs.data ?? []);
      setClientes(rc.data.clientes ?? rc.data ?? []);
      setProductos((rp.data.productos ?? rp.data ?? []).filter(p => p.activo));
      const mons = rm.data.monedas ?? rm.data ?? [];
      setMonedas(mons);
      const base = mons.find(m => m.es_moneda_base);
      if (base && !esEdicion) setForm(p => ({ ...p, id_moneda: String(base.id_moneda) }));
    }).catch(() => {});

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
            id_producto: String(d.id_producto),
            cantidad: d.cantidad, precio_unitario: d.precio_unitario,
            descuento_porc: d.descuento_porc ?? 0,
          })));
        })
        .catch(() => navigate('/cotizaciones'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!form.id_moneda || monedas.length === 0) return;
    const sel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));
    if (!sel) return;
    if (sel.es_moneda_base) { setF('tipo_cambio', 1); return; }
    api.get('/tipos-cambio/hoy').then(r => {
      const rates = r.data.tipos_cambio ?? r.data ?? [];
      const rate  = rates.find(tc => String(tc.id_moneda_origen) === String(sel.id_moneda));
      setF('tipo_cambio', rate ? Number(rate.tasa_venta) : 6.96);
    }).catch(() => setF('tipo_cambio', 6.96));
  }, [form.id_moneda, monedas]); // eslint-disable-line

  useEffect(() => {
    if (!form.id_cliente) { setClienteInfo(null); return; }
    setClienteInfo(clientes.find(c => String(c.id_cliente) === String(form.id_cliente)) ?? null);
  }, [form.id_cliente, clientes]);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addItem    = () => setItems(p => [...p, { id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0 }]);
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const subtotal  = items.reduce((s, it) => {
    const base = Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0);
    return s + base - base * (Number(it.descuento_porc ?? 0) / 100);
  }, 0);
  const descMonto = subtotal * (Number(form.descuento_porc) / 100);
  const impuesto  = Number(form.impuesto);
  const total     = subtotal - descMonto + impuesto;

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_cliente)
      return setError('Sucursal y cliente son obligatorios');
    const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
    if (!itemsValidos.length) return setError('Agregá al menos un producto con cantidad válida');

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
      setError(err.response?.data?.mensaje ?? 'Error al guardar la cotización');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <button onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
          ← Cotizaciones
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar cotización' : 'Nueva cotización'}
        </h1>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Datos de la cotización</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sucursal */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sucursal *</label>
            <select value={form.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)}
              disabled={esEdicion} className={inputCls}>
              <option value="">— seleccionar —</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Cliente *</label>
            <select value={form.id_cliente} onChange={e => setF('id_cliente', e.target.value)} className={inputCls}>
              <option value="">— seleccionar —</option>
              {clientes.filter(c => c.activo).map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  [{c.codigo}] {c.razon_social || `${c.nombres} ${c.apellidos}`}
                </option>
              ))}
            </select>
            {clienteInfo && (
              <p className="text-xs text-zinc-400 mt-1">
                {clienteInfo.telefono && `Tel: ${clienteInfo.telefono}`}
                {clienteInfo.email    && ` · ${clienteInfo.email}`}
              </p>
            )}
          </div>

          {/* Tipo cotización */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo *</label>
            <div className="flex gap-2">
              {['CONTADO', 'CREDITO'].map(t => (
                <button key={t} onClick={() => setF('tipo_cotizacion', t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    form.tipo_cotizacion === t
                      ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}>
                  {t === 'CONTADO' ? 'Contado' : 'Crédito'}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha vencimiento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Válida hasta</label>
            <input type="date" value={form.fecha_vencimiento}
              onChange={e => setF('fecha_vencimiento', e.target.value)} className={inputCls} />
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Moneda</label>
            <select value={form.id_moneda} onChange={e => setF('id_moneda', e.target.value)} className={inputCls}>
              <option value="">— seleccionar —</option>
              {monedas.filter(m => m.activo).map(m => (
                <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
              ))}
            </select>
          </div>

          {/* Tipo cambio */}
          {(() => {
            const sel = monedas.find(m => String(m.id_moneda) === String(form.id_moneda));
            return sel && !sel.es_moneda_base ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo de cambio *</label>
                <input type="number" min="0.000001" step="0.000001" value={form.tipo_cambio}
                  onChange={e => setF('tipo_cambio', e.target.value)} className={inputCls} />
              </div>
            ) : null;
          })()}
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea value={form.observaciones} onChange={e => setF('observaciones', e.target.value)}
            rows={2} className={inputCls} placeholder="Notas adicionales, condiciones, etc." />
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos</p>
          <button onClick={addItem}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cantidad</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Precio unit.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Desc %</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((fila, i) => (
                <FilaItem key={i} fila={fila} index={i}
                  productos={productos}
                  onChange={patch => updateItem(i, patch)}
                  onRemove={() => removeItem(i)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm min-w-[260px]">
            <span className="text-zinc-500 dark:text-zinc-400">Subtotal:</span>
            <span className="text-right font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmtMonto(subtotal)}</span>

            <div className="flex items-center gap-1">
              <span className="text-zinc-500 dark:text-zinc-400">Desc. global:</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <input type="number" min={0} max={100} step="0.01" value={form.descuento_porc}
                onChange={e => setF('descuento_porc', e.target.value)}
                className="w-16 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400" />
              <span className="text-xs text-zinc-400">%</span>
              <span className="font-mono text-zinc-600 dark:text-zinc-400 ml-1">-{fmtMonto(descMonto)}</span>
            </div>

            <span className="text-zinc-500 dark:text-zinc-400">Impuesto (Bs):</span>
            <div className="flex justify-end">
              <input type="number" min={0} step="0.01" value={form.impuesto}
                onChange={e => setF('impuesto', e.target.value)}
                className="w-24 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400" />
            </div>

            <span className="text-base font-bold text-zinc-900 dark:text-white">Total:</span>
            <span className="text-right text-base font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(total)}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        <button onClick={guardar} disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear cotización'}
        </button>
        <button onClick={() => navigate(esEdicion ? `/cotizaciones/${id}` : '/cotizaciones')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
