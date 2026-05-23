import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ventasService }    from '../../services/ventas.service';
import { clientesService }  from '../../services/clientes.service';
import { productosService } from '../../services/productos.service';
import { sucursalesService, depositosService, monedasService } from '../../services/configuracion.service';
import api from '../../api/axios';
import { usePermission }    from '../../hooks/usePermission';

const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

function FilaItem({ fila, index, productos, stockMap, tipoVenta, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = productos.filter(p =>
    !busqueda ||
    p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').includes(busqueda)
  );

  const precioBase = tipoVenta === 'MAYOR'
    ? (productos.find(p => String(p.id_producto) === String(fila.id_producto))?.precio_mayor ?? 0)
    : (productos.find(p => String(p.id_producto) === String(fila.id_producto))?.precio_publico ?? 0);

  const disponible = fila.id_producto ? (stockMap[fila.id_producto] ?? 0) : null;

  const base = Number(fila.cantidad ?? 0) * Number(fila.precio_unitario ?? 0);
  const desc = base * (Number(fila.descuento_porc ?? 0) / 100);
  const subtotal = +(base - desc).toFixed(2);

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 align-top">
      {/* Producto */}
      <td className="px-3 py-2 min-w-[200px]">
        <input
          type="text" placeholder="Buscar producto…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full mb-1 px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
        <select
          value={fila.id_producto}
          onChange={e => {
            const id = e.target.value;
            const prod = productos.find(p => String(p.id_producto) === id);
            const precio = tipoVenta === 'MAYOR' ? (prod?.precio_mayor ?? 0) : (prod?.precio_publico ?? 0);
            onChange({ id_producto: id, precio_unitario: precio });
          }}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">— seleccionar —</option>
          {filtrados.slice(0, 50).map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              [{p.codigo_interno}] {p.producto}
            </option>
          ))}
        </select>
        {disponible !== null && (
          <p className={`text-[10px] mt-0.5 ${disponible <= 0 ? 'text-red-500' : 'text-zinc-400'}`}>
            Stock disponible: {fmtMonto(disponible)}
          </p>
        )}
      </td>
      {/* Cantidad */}
      <td className="px-3 py-2 w-24">
        <input
          type="number" min={0.01} step="0.01" value={fila.cantidad}
          onChange={e => onChange({ cantidad: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
        />
      </td>
      {/* Precio */}
      <td className="px-3 py-2 w-28">
        <input
          type="number" min={0} step="0.01" value={fila.precio_unitario}
          onChange={e => onChange({ precio_unitario: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
        />
        {precioBase > 0 && (
          <p className="text-[10px] text-zinc-400 text-right mt-0.5">Base: {fmtMonto(precioBase)}</p>
        )}
      </td>
      {/* Descuento % */}
      <td className="px-3 py-2 w-20">
        <input
          type="number" min={0} max={100} step="0.01" value={fila.descuento_porc}
          onChange={e => onChange({ descuento_porc: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
        />
      </td>
      {/* Subtotal */}
      <td className="px-3 py-2 w-28 text-right font-mono text-sm font-semibold text-zinc-900 dark:text-white">
        {fmtMonto(subtotal)}
      </td>
      {/* Eliminar */}
      <td className="px-3 py-2 w-10 text-center">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
      </td>
    </tr>
  );
}

export default function VentaForm() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const esEdicion  = Boolean(id);
  const { puede } = usePermission();

  const [sucursales, setSucursales] = useState([]);
  const [depositos,  setDepositos]  = useState([]);
  const [clientes,   setClientes]   = useState([]);
  const [productos,  setProductos]  = useState([]);
  const [monedas,    setMonedas]    = useState([]);
  const [stockMap,   setStockMap]   = useState({});

  const [form, setForm] = useState({
    tipo_venta: 'MENOR', id_sucursal: '', id_deposito: '', id_cliente: '',
    id_moneda: '', tipo_cambio: 1, condicion_pago: 'CONTADO', dias_credito: 0,
    descuento_porc: 0, impuesto: 0, requiere_entrega: false,
    direccion_entrega: '', fecha_entrega: '', observaciones: '',
  });
  const [items, setItems]     = useState([{ id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0 }]);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando,  setCargando]  = useState(esEdicion);
  const [error,     setError]     = useState('');

  // Load catalogs
  useEffect(() => {
    Promise.all([
      sucursalesService.getAll(),
      depositosService.getAll(),
      clientesService.getAll(),
      productosService.getAll(),
      monedasService.getAll(),
    ]).then(([rs, rd, rc, rp, rm]) => {
      setSucursales(rs.data.sucursales ?? rs.data ?? []);
      const deps = rd.data.depositos ?? rd.data ?? [];
      setDepositos(deps.filter(d => d.permite_venta && d.activo));
      setClientes(rc.data.clientes ?? rc.data ?? []);
      setProductos((rp.data.productos ?? rp.data ?? []).filter(p => p.activo));
      const mons = rm.data.monedas ?? rm.data ?? [];
      setMonedas(mons);
      const base = mons.find(m => m.es_moneda_base);
      if (base && !esEdicion) setForm(p => ({ ...p, id_moneda: String(base.id_moneda) }));
    }).catch(() => {});

    if (esEdicion) {
      ventasService.getOne(id)
        .then(r => {
          const v = r.data;
          setForm({
            tipo_venta: v.tipo_venta, id_sucursal: String(v.id_sucursal),
            id_deposito: String(v.id_deposito), id_cliente: String(v.id_cliente),
            id_moneda: String(v.id_moneda), tipo_cambio: v.tipo_cambio,
            condicion_pago: v.condicion_pago, dias_credito: v.dias_credito,
            descuento_porc: v.descuento_porc ?? 0, impuesto: v.impuesto ?? 0,
            requiere_entrega: Boolean(v.requiere_entrega),
            direccion_entrega: v.direccion_entrega ?? '',
            fecha_entrega: v.fecha_entrega ? v.fecha_entrega.slice(0, 10) : '',
            observaciones: v.observaciones ?? '',
          });
          setItems((v.detalle ?? []).map(d => ({
            id_producto: String(d.id_producto),
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_porc: d.descuento_porc ?? 0,
          })));
        })
        .catch(() => navigate('/ventas'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  // Load stock when deposit changes
  useEffect(() => {
    if (!form.id_deposito) { setStockMap({}); return; }
    api.get('/inventario/stock').then(r => {
      const map = {};
      for (const prod of r.data.productos ?? []) {
        const s = prod.stock?.[form.id_deposito];
        map[prod.id_producto] = Number(s?.cantidad_disponible ?? s?.cantidad ?? 0);
      }
      setStockMap(map);
    }).catch(() => {});
  }, [form.id_deposito]);

  // Update prices when tipo_venta changes
  useEffect(() => {
    setItems(prev => prev.map(it => {
      if (!it.id_producto) return it;
      const prod = productos.find(p => String(p.id_producto) === String(it.id_producto));
      if (!prod) return it;
      return {
        ...it,
        precio_unitario: form.tipo_venta === 'MAYOR' ? (prod.precio_mayor ?? 0) : (prod.precio_publico ?? 0),
      };
    }));
  }, [form.tipo_venta]); // eslint-disable-line

  // Load client info when client changes
  useEffect(() => {
    if (!form.id_cliente) { setClienteInfo(null); return; }
    const cli = clientes.find(c => String(c.id_cliente) === String(form.id_cliente));
    setClienteInfo(cli ?? null);
  }, [form.id_cliente, clientes]);

  const setF  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addItem = () => setItems(p => [...p, { id_producto: '', cantidad: 1, precio_unitario: 0, descuento_porc: 0 }]);
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  // Totals
  const subtotal = items.reduce((s, it) => {
    const base = Number(it.cantidad ?? 0) * Number(it.precio_unitario ?? 0);
    const desc = base * (Number(it.descuento_porc ?? 0) / 100);
    return s + (base - desc);
  }, 0);
  const descMonto  = subtotal * (Number(form.descuento_porc) / 100);
  const impuesto   = Number(form.impuesto);
  const total      = subtotal - descMonto + impuesto;

  const guardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.id_deposito || !form.id_cliente) {
      return setError('Sucursal, depósito y cliente son obligatorios');
    }
    const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
    if (!itemsValidos.length) return setError('Agregá al menos un producto con cantidad válida');

    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
      let ventaId = id;
      if (esEdicion) {
        await ventasService.update(id, payload);
      } else {
        const res = await ventasService.create(payload);
        ventaId = res.data.id_venta;
      }
      navigate(`/ventas/${ventaId}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la venta');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <button onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-1">
          ← Ventas
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar venta' : 'Nueva venta'}
        </h1>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Datos de la venta</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo venta */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo de venta *</label>
            <div className="flex gap-2">
              {['MENOR', 'MAYOR'].map(t => (
                <button
                  key={t}
                  onClick={() => setF('tipo_venta', t)}
                  disabled={esEdicion}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    form.tipo_venta === t
                      ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  } disabled:opacity-60`}
                >
                  {t === 'MENOR' ? 'Al por menor' : 'Al por mayor'}
                </button>
              ))}
            </div>
          </div>

          {/* Sucursal */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Sucursal *</label>
            <select value={form.id_sucursal} onChange={e => setF('id_sucursal', e.target.value)}
              disabled={esEdicion} className={inputCls}>
              <option value="">— seleccionar —</option>
              {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Depósito */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Depósito / Punto de venta *</label>
            <select value={form.id_deposito} onChange={e => setF('id_deposito', e.target.value)}
              disabled={esEdicion} className={inputCls}>
              <option value="">— seleccionar —</option>
              {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
            </select>
          </div>

          {/* Cliente */}
          <div>
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
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className={clienteInfo.permite_credito ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}>
                  {clienteInfo.permite_credito ? `Crédito: Bs ${fmtMonto(clienteInfo.limite_credito)} | Saldo: Bs ${fmtMonto(clienteInfo.saldo_actual)}` : 'Sin crédito'}
                </span>
              </div>
            )}
          </div>

          {/* Condición de pago */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Condición de pago *</label>
            <select value={form.condicion_pago} onChange={e => setF('condicion_pago', e.target.value)} className={inputCls}>
              <option value="CONTADO">Contado</option>
              {puede('vender_credito', 'ventas') && <option value="CREDITO">Crédito</option>}
            </select>
          </div>

          {/* Días crédito */}
          {form.condicion_pago === 'CREDITO' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Días de crédito</label>
              <input type="number" min={0} value={form.dias_credito}
                onChange={e => setF('dias_credito', e.target.value)} className={inputCls} />
            </div>
          )}

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
        </div>

        {/* Entrega */}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="entrega" checked={form.requiere_entrega}
            onChange={e => setF('requiere_entrega', e.target.checked)}
            className="w-4 h-4 rounded accent-yellow-400" />
          <label htmlFor="entrega" className="text-sm text-zinc-700 dark:text-zinc-300">Requiere entrega a domicilio</label>
        </div>
        {form.requiere_entrega && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Dirección de entrega</label>
              <input type="text" value={form.direccion_entrega} onChange={e => setF('direccion_entrega', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Fecha de entrega</label>
              <input type="datetime-local" value={form.fecha_entrega} onChange={e => setF('fecha_entrega', e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea value={form.observaciones} onChange={e => setF('observaciones', e.target.value)}
            rows={2} className={inputCls} placeholder="Notas adicionales…" />
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
                <FilaItem
                  key={i} fila={fila} index={i}
                  productos={productos} stockMap={stockMap}
                  tipoVenta={form.tipo_venta}
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
              <input
                type="number" min={0} max={100} step="0.01" value={form.descuento_porc}
                onChange={e => setF('descuento_porc', e.target.value)}
                className="w-16 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <span className="text-xs text-zinc-400">%</span>
              <span className="font-mono text-zinc-600 dark:text-zinc-400 ml-1">-{fmtMonto(descMonto)}</span>
            </div>

            <span className="text-zinc-500 dark:text-zinc-400">Impuesto (Bs):</span>
            <div className="flex justify-end">
              <input
                type="number" min={0} step="0.01" value={form.impuesto}
                onChange={e => setF('impuesto', e.target.value)}
                className="w-24 px-2 py-0.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>

            <span className="text-base font-bold text-zinc-900 dark:text-white">Total:</span>
            <span className="text-right text-base font-bold font-mono text-zinc-900 dark:text-white">Bs {fmtMonto(total)}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={guardar} disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear venta'}
        </button>
        <button onClick={() => navigate(esEdicion ? `/ventas/${id}` : '/ventas')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
