import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { inventarioService }      from '../../services/inventario.service';

const fmtNum = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ── Fila de producto ──────────────────────────────────────────────────────────
function FilaItem({ fila, productos, stockOrigen, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = productos.filter(p =>
    !busqueda ||
    p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
  );

  const disponible   = fila.id_producto ? (stockOrigen[fila.id_producto] ?? 0) : null;
  const excede       = disponible !== null && Number(fila.cantidad) > disponible;
  const sinStock     = disponible !== null && disponible <= 0;

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 align-top">
      {/* Producto */}
      <td className="px-3 py-2.5">
        <input
          type="text"
          placeholder="Buscar…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full mb-1 px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
        <select
          value={fila.id_producto}
          onChange={e => { onChange('id_producto', e.target.value); setBusqueda(''); }}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">— seleccionar producto —</option>
          {filtrados.slice(0, 60).map(p => (
            <option key={p.id_producto} value={p.id_producto}>
              [{p.codigo_interno}] {p.producto}
            </option>
          ))}
        </select>
      </td>

      {/* Stock disponible */}
      <td className="px-3 py-2.5 w-36 text-center">
        {disponible === null ? (
          <span className="text-xs text-zinc-400">—</span>
        ) : sinStock ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            Sin stock
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
            ${excede
              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}>
            {fmtNum(disponible)} disp.
          </span>
        )}
      </td>

      {/* Cantidad */}
      <td className="px-3 py-2.5 w-32">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={fila.cantidad}
          onChange={e => onChange('cantidad', e.target.value)}
          className={`w-full px-2 py-1.5 text-xs rounded-lg border text-right font-mono
            focus:outline-none focus:ring-1
            ${excede
              ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 focus:ring-orange-400'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-yellow-400'
            }`}
        />
        {excede && (
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 text-right">
            Supera el disponible
          </p>
        )}
      </td>

      {/* Quitar */}
      <td className="px-3 py-2.5 w-10 text-center">
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-base leading-none"
        >×</button>
      </td>
    </tr>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TransferenciaForm() {
  const navigate = useNavigate();

  const [depositos,     setDepositos]     = useState([]);
  const [productos,     setProductos]     = useState([]);
  const [stockOrigen,   setStockOrigen]   = useState({});
  const [cargandoStock, setCargandoStock] = useState(false);

  const [form, setForm] = useState({
    id_deposito_origen: '', id_deposito_destino: '', observaciones: '',
  });
  const [items,     setItems]     = useState([{ id_producto: '', cantidad: 1 }]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');

  // Cargar catálogos
  useEffect(() => {
    inventarioService.getFormData()
      .then(r => {
        setDepositos(r.data.depositos ?? []);
        setProductos(r.data.productos ?? []);
      })
      .catch(() => {});
  }, []);

  // Al cambiar depósito origen → cargar stock
  const handleOrigenChange = async (id) => {
    setForm(p => ({ ...p, id_deposito_origen: id, id_deposito_destino: p.id_deposito_destino === id ? '' : p.id_deposito_destino }));
    setStockOrigen({});
    if (!id) return;
    setCargandoStock(true);
    try {
      const r = await inventarioService.getStockDeposito(id);
      const map = {};
      (r.data.stock ?? []).forEach(s => { map[String(s.id_producto)] = s.cantidad_disponible; });
      setStockOrigen(map);
    } catch { /* silencioso */ }
    finally { setCargandoStock(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addItem    = () => setItems(p => [...p, { id_producto: '', cantidad: 1 }]);
  const removeItem = i  => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  // Resumen de items con stock válido
  const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
  const hayExcesos   = itemsValidos.some(it => {
    const disp = stockOrigen[String(it.id_producto)];
    return disp !== undefined && Number(it.cantidad) > disp;
  });

  const guardar = async () => {
    setError('');
    if (!form.id_deposito_origen || !form.id_deposito_destino)
      return setError('Seleccioná depósito origen y destino');
    if (form.id_deposito_origen === form.id_deposito_destino)
      return setError('Origen y destino no pueden ser el mismo depósito');
    if (!itemsValidos.length)
      return setError('Agregá al menos un producto con cantidad válida');
    if (hayExcesos)
      return setError('Hay productos con cantidad mayor al stock disponible en origen');

    setGuardando(true);
    try {
      const res = await transferenciasService.create({ ...form, items: itemsValidos });
      navigate(`/inventario/transferencias/${res.data.id_transferencia}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar la transferencia');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  const depositoOrigen  = depositos.find(d => String(d.id_deposito) === String(form.id_deposito_origen));
  const depositoDestino = depositos.find(d => String(d.id_deposito) === String(form.id_deposito_destino));

  // Productos con stock > 0 en origen (para resumen)
  const productosConStock = Object.entries(stockOrigen)
    .filter(([, disp]) => disp > 0)
    .map(([id, disp]) => ({
      ...productos.find(p => String(p.id_producto) === id),
      disponible: disp,
    }))
    .filter(p => p.id_producto)
    .sort((a, b) => b.disponible - a.disponible);

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nueva transferencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Movimiento de stock entre depósitos</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
          <span className="mt-0.5 shrink-0">⚠</span>
          {error}
        </div>
      )}

      {/* Depósitos + observaciones */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Origen */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              Depósito Origen *
            </label>
            <select
              value={form.id_deposito_origen}
              onChange={e => handleOrigenChange(e.target.value)}
              className={inputCls}
            >
              <option value="">— seleccionar —</option>
              {depositos.map(d => (
                <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>
              ))}
            </select>
            {depositoOrigen && (
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                {cargandoStock ? 'Cargando stock…' : `${productosConStock.length} producto(s) con stock`}
              </p>
            )}
          </div>

          {/* Destino */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              Depósito Destino *
            </label>
            <select
              value={form.id_deposito_destino}
              onChange={e => setF('id_deposito_destino', e.target.value)}
              className={inputCls}
              disabled={!form.id_deposito_origen}
            >
              <option value="">— seleccionar —</option>
              {depositos
                .filter(d => String(d.id_deposito) !== String(form.id_deposito_origen))
                .map(d => (
                  <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>
                ))
              }
            </select>
            {depositoDestino && (
              <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                El stock llegará a este depósito
              </p>
            )}
          </div>
        </div>

        {/* Flecha visual entre depósitos */}
        {depositoOrigen && depositoDestino && (
          <div className="flex items-center gap-3 px-1">
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-400">
              {depositoOrigen.nombre}
            </span>
            <span className="text-zinc-400 text-sm flex-1 text-center">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-400">
              {depositoDestino.nombre}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
            Observaciones
          </label>
          <textarea
            rows={2}
            value={form.observaciones}
            onChange={e => setF('observaciones', e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Motivo de la transferencia…"
          />
        </div>
      </div>

      {/* Stock disponible en origen */}
      {form.id_deposito_origen && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Stock disponible en origen
              </p>
              {depositoOrigen && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{depositoOrigen.nombre}</p>
              )}
            </div>
            {cargandoStock && (
              <span className="text-xs text-zinc-400 animate-pulse">Cargando…</span>
            )}
          </div>

          {!cargandoStock && productosConStock.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-zinc-400">
              No hay productos con stock disponible en este depósito
            </div>
          )}

          {!cargandoStock && productosConStock.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Código</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Disponible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {productosConStock.map(p => (
                    <tr key={p.id_producto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{p.producto}</td>
                      <td className="px-4 py-2 font-mono text-xs text-zinc-400">{p.codigo_interno}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-green-600 dark:text-green-400">
                        {fmtNum(p.disponible)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Productos a transferir */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos a transferir</p>
            {itemsValidos.length > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5">{itemsValidos.length} producto(s) seleccionado(s)</p>
            )}
          </div>
          <button
            onClick={addItem}
            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors"
          >
            + Agregar
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Disponible en origen</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cantidad a enviar</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((fila, i) => (
              <FilaItem
                key={i}
                fila={fila}
                productos={productos}
                stockOrigen={stockOrigen}
                onChange={(k, v) => updateItem(i, k, v)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 items-center">
        <button
          onClick={guardar}
          disabled={guardando || itemsValidos.length === 0}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : 'Crear transferencia'}
        </button>
        <button
          onClick={() => navigate('/inventario/transferencias')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
        {hayExcesos && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            ⚠ Revisá las cantidades — superan el stock disponible
          </span>
        )}
      </div>

    </div>
  );
}
