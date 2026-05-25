import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { comprasService }  from '../../services/compras.service';
import { proveedoresService } from '../../services/proveedores.service';
import { productosService }   from '../../services/productos.service';
import {
  sucursalesService,
  depositosService,
  monedasService,
  tiposCambioService,
} from '../../services/configuracion.service';

// ── Helpers ───────────────────────────────────────────────────────────────────
const HOY = new Date().toISOString().slice(0, 10);
const fmtMonto = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

function calcSubtotal(it) {
  const base = Number(it.cantidad || 0) * Number(it.precio_unitario || 0);
  const desc = base * (Number(it.descuento_porc || 0) / 100);
  return +(base - desc).toFixed(2);
}

// ── Fila de producto ──────────────────────────────────────────────────────────
function FilaProducto({ fila, productos, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const opciones = useMemo(() => {
    if (!busqueda) return productos.slice(0, 60);
    const q = busqueda.toLowerCase();
    return productos.filter(p =>
      p.producto.toLowerCase().includes(q) ||
      p.codigo_interno.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [productos, busqueda]);

  const sub = calcSubtotal(fila);

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="px-2 py-2 min-w-[240px]">
        <input
          type="text"
          placeholder="Buscar producto…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 mb-1"
        />
        <select
          value={fila.id_producto}
          onChange={e => onChange('id_producto', e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">— Seleccionar —</option>
          {opciones.map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              {p.codigo_interno} — {p.producto}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 w-24">
        <input
          type="number" min="0.01" step="0.01"
          value={fila.cantidad}
          onChange={e => onChange('cantidad', e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
      </td>
      <td className="px-2 py-2 w-32">
        <input
          type="number" min="0" step="0.01"
          value={fila.precio_unitario}
          onChange={e => onChange('precio_unitario', e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
      </td>
      <td className="px-2 py-2 w-20">
        <input
          type="number" min="0" max="100" step="0.1"
          value={fila.descuento_porc}
          onChange={e => onChange('descuento_porc', e.target.value)}
          className="w-full px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-right focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
      </td>
      <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-zinc-900 dark:text-white w-28">
        {fmtMonto(sub)}
      </td>
      <td className="px-2 py-2 text-center">
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-lg leading-none"
          title="Eliminar"
        >×</button>
      </td>
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CompraForm() {
  const { id } = useParams(); // si hay id → modo edición
  const navigate = useNavigate();
  const esEdicion = Boolean(id);

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [sucursales,  setSucursales]  = useState([]);
  const [depositos,   setDepositos]   = useState([]);
  const [monedas,     setMonedas]     = useState([]);
  const [productos,   setProductos]   = useState([]);

  // Datos del formulario
  const [datos, setDatos] = useState({
    id_proveedor:       '',
    id_sucursal:        '',
    id_deposito_destino:'',
    id_moneda:          '',
    tipo_cambio:        '1',
    fecha_pedido:       HOY,
    fecha_estim_llegada:'',
    descuento:          '0',
    impuesto:           '0',
    flete:              '0',
    otros_costos:       '0',
    observaciones:      '',
  });

  const [items, setItems] = useState([
    { id_producto: '', cantidad: '1', precio_unitario: '0', descuento_porc: '0' },
  ]);

  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    Promise.all([
      proveedoresService.getAll(),
      sucursalesService.getAll(),
      depositosService.getAll(),
      monedasService.getAll(),
      productosService.getAll(),
    ]).then(([rp, rs, rd, rm, rpr]) => {
      setProveedores(rp.data.proveedores ?? rp.data ?? []);
      setSucursales( rs.data.sucursales  ?? rs.data ?? []);
      setDepositos(  rd.data.depositos   ?? rd.data ?? []);
      setMonedas(    rm.data.monedas     ?? rm.data ?? []);
      setProductos(  rpr.data.productos  ?? rpr.data ?? []);
    }).catch(() => {});

    if (esEdicion) {
      comprasService.getOne(id).then(res => {
        const { compra, detalle } = res.data;
        setDatos({
          id_proveedor:        String(compra.id_proveedor),
          id_sucursal:         String(compra.id_sucursal),
          id_deposito_destino: String(compra.id_deposito_destino),
          id_moneda:           String(compra.id_moneda),
          tipo_cambio:         String(compra.tipo_cambio),
          fecha_pedido:        compra.fecha_pedido?.slice(0, 10) ?? HOY,
          fecha_estim_llegada: compra.fecha_estim_llegada?.slice(0, 10) ?? '',
          descuento:           String(compra.descuento),
          impuesto:            String(compra.impuesto),
          flete:               String(compra.flete),
          otros_costos:        String(compra.otros_costos),
          observaciones:       compra.observaciones ?? '',
        });
        setItems(detalle.map(d => ({
          id_producto:    String(d.id_producto),
          cantidad:       String(d.cantidad),
          precio_unitario:String(d.precio_unitario),
          descuento_porc: String(d.descuento_porc),
        })));
      }).catch(() => {});
    }
  }, []); // eslint-disable-line

  const setD = (k, v) => setDatos(p => ({ ...p, [k]: v }));

  // Auto-fill exchange rate when currency changes
  useEffect(() => {
    if (!datos.id_moneda || monedas.length === 0) return;
    const selected = monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));
    if (!selected) return;

    if (selected.es_moneda_base) {
      setD('tipo_cambio', '1');
    } else {
      tiposCambioService.getHoy()
        .then(r => {
          const rates = r.data.tipos_cambio ?? r.data ?? [];
          const rate = rates.find(tc =>
            String(tc.id_moneda_origen) === String(selected.id_moneda)
          );
          if (rate) {
            setD('tipo_cambio', String(rate.tasa_compra));
          } else {
            setD('tipo_cambio', '6.86');
          }
        })
        .catch(() => {
          setD('tipo_cambio', '6.86');
        });
    }
  }, [datos.id_moneda, monedas]);

  const addItem = () => setItems(prev => [
    ...prev, { id_producto: '', cantidad: '1', precio_unitario: '0', descuento_porc: '0' },
  ]);

  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, k, v) => setItems(prev =>
    prev.map((it, i) => i === idx ? { ...it, [k]: v } : it)
  );

  // Totales calculados
  const totales = useMemo(() => {
    const subtotal   = items.reduce((s, it) => s + calcSubtotal(it), 0);
    const descuento  = Number(datos.descuento  || 0);
    const impuesto   = Number(datos.impuesto   || 0);
    const flete      = Number(datos.flete      || 0);
    const otros      = Number(datos.otros_costos || 0);
    const total      = +(subtotal - descuento + impuesto + flete + otros).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), descuento, impuesto, flete, otros, total };
  }, [items, datos.descuento, datos.impuesto, datos.flete, datos.otros_costos]);

  const handleGuardar = async () => {
    setError('');
    if (!datos.id_proveedor || !datos.id_sucursal || !datos.id_deposito_destino || !datos.id_moneda)
      return setError('Completa todos los campos de cabecera');
    if (items.some(it => !it.id_producto || Number(it.cantidad) <= 0))
      return setError('Todos los productos deben tener producto y cantidad válidos');

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

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/compras')}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar Pre-pedido' : 'Nueva Compra'}
        </h1>
      </div>

      {/* Datos generales */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4">Datos generales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Proveedor */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Proveedor *</label>
            <select value={datos.id_proveedor} onChange={e => setD('id_proveedor', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— Seleccionar —</option>
              {proveedores.filter(p => p.activo).map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>
                  {p.codigo} — {p.razon_social}
                </option>
              ))}
            </select>
          </div>

          {/* Número factura proveedor */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nº Factura proveedor</label>
            <input type="text" value={datos.numero_factura ?? ''} onChange={e => setD('numero_factura', e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          </div>

          {/* Sucursal */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Sucursal *</label>
            <select value={datos.id_sucursal} onChange={e => setD('id_sucursal', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— Seleccionar —</option>
              {sucursales.filter(s => s.activo).map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Depósito destino */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Depósito destino *</label>
            <select value={datos.id_deposito_destino} onChange={e => setD('id_deposito_destino', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— Seleccionar —</option>
              {depositos.filter(d => d.activo).map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>{d.codigo} — {d.nombre}</option>
              ))}
            </select>
          </div>

          {/* Moneda */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Moneda *</label>
            <select value={datos.id_moneda} onChange={e => setD('id_moneda', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
              <option value="">— Seleccionar —</option>
              {monedas.filter(m => m.activo).map(m => (
                <option key={m.id_moneda} value={m.id_moneda}>{m.codigo} — {m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tipo de cambio */}
          {(() => {
            const selectedMoneda = monedas.find(m => String(m.id_moneda) === String(datos.id_moneda));
            if (selectedMoneda && !selectedMoneda.es_moneda_base) {
              return (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Tipo de cambio *</label>
                  <input type="number" min="0.000001" step="0.000001" value={datos.tipo_cambio}
                    onChange={e => setD('tipo_cambio', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
              );
            }
            return null;
          })()}

          {/* Fecha pedido */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fecha pedido *</label>
            <input type="date" value={datos.fecha_pedido} onChange={e => setD('fecha_pedido', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          </div>

          {/* Fecha estimada llegada */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Est. llegada</label>
            <input type="date" value={datos.fecha_estim_llegada} onChange={e => setD('fecha_estim_llegada', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
          </div>

          {/* Observaciones */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Observaciones</label>
            <textarea value={datos.observaciones} onChange={e => setD('observaciones', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"/>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Productos</p>
          <button
            onClick={addItem}
            className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 text-xs font-semibold transition-colors"
          >
            + Agregar producto
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
                {['Producto', 'Cantidad', 'Precio unit.', 'Desc. %', 'Subtotal', ''].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <FilaProducto
                  key={idx}
                  fila={it}
                  productos={productos}
                  onChange={(k, v) => updateItem(idx, k, v)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-end">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm w-72">
              <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
              <span className="text-right font-mono text-zinc-900 dark:text-white">{fmtMonto(totales.subtotal)}</span>

              <div className="contents">
                <span className="text-zinc-500 dark:text-zinc-400">Descuento global</span>
                <input type="number" min="0" step="0.01" value={datos.descuento}
                  onChange={e => setD('descuento', e.target.value)}
                  className="text-right font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"/>
              </div>

              <div className="contents">
                <span className="text-zinc-500 dark:text-zinc-400">Impuesto</span>
                <input type="number" min="0" step="0.01" value={datos.impuesto}
                  onChange={e => setD('impuesto', e.target.value)}
                  className="text-right font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"/>
              </div>

              <div className="contents">
                <span className="text-zinc-500 dark:text-zinc-400">Flete</span>
                <input type="number" min="0" step="0.01" value={datos.flete}
                  onChange={e => setD('flete', e.target.value)}
                  className="text-right font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"/>
              </div>

              <div className="contents">
                <span className="text-zinc-500 dark:text-zinc-400">Otros costos</span>
                <input type="number" min="0" step="0.01" value={datos.otros_costos}
                  onChange={e => setD('otros_costos', e.target.value)}
                  className="text-right font-mono px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"/>
              </div>

              <span className="font-bold text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1">TOTAL</span>
              <span className="text-right font-bold font-mono text-xl text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-zinc-700 pt-1">{fmtMonto(totales.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 justify-end pb-6">
        <button
          onClick={() => navigate('/compras')}
          className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-6 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear pre-pedido'}
        </button>
      </div>
    </div>
  );
}
