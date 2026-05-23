import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { ajustesService }   from '../../services/ajustes.service';
import { depositosService } from '../../services/depositos.service';
import { productosService } from '../../services/productos.service';

function FilaProducto({ fila, productos, stockMap, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');
  const filtrados = productos.filter(p =>
    !busqueda ||
    p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
  );
  const diferencia = Number(fila.cantidad_fisica) - Number(fila.cantidad_sistema);

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="px-3 py-2">
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Buscar…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <select
            value={fila.id_producto}
            onChange={e => {
              const id = e.target.value;
              const cantSistema = stockMap[id] ?? 0;
              onChange({ id_producto: id, cantidad_sistema: cantSistema });
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
        </div>
      </td>
      <td className="px-3 py-2 w-28 text-right">
        <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
          {Number(fila.cantidad_sistema).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-3 py-2 w-28">
        <input
          type="number"
          min={0}
          step="0.01"
          value={fila.cantidad_fisica}
          onChange={e => onChange({ cantidad_fisica: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
        />
      </td>
      <td className="px-3 py-2 w-28 text-right font-mono font-semibold">
        <span className={diferencia > 0 ? 'text-green-600 dark:text-green-400' : diferencia < 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-400'}>
          {diferencia > 0 ? '+' : ''}{diferencia.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </span>
      </td>
      <td className="px-3 py-2 w-10 text-center">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
      </td>
    </tr>
  );
}

export default function AjusteForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const esEdicion = Boolean(id);

  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [stockMap,  setStockMap]  = useState({});
  const [form, setForm] = useState({ id_deposito: '', motivo: '' });
  const [items, setItems] = useState([{ id_producto: '', cantidad_sistema: 0, cantidad_fisica: 0 }]);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState('');
  const [cargando,  setCargando]  = useState(esEdicion);

  useEffect(() => {
    Promise.all([depositosService.getAll(), productosService.getAll()])
      .then(([rd, rp]) => {
        setDepositos(rd.data.depositos ?? rd.data ?? []);
        setProductos(rp.data.productos ?? rp.data ?? []);
      })
      .catch(() => {});

    if (esEdicion) {
      ajustesService.getOne(id)
        .then(r => {
          const a = r.data;
          setForm({ id_deposito: a.id_deposito, motivo: a.motivo ?? '' });
          setItems((a.detalle ?? []).map(d => ({
            id_producto: d.id_producto,
            cantidad_sistema: d.cantidad_sistema,
            cantidad_fisica: d.cantidad_fisica,
          })));
        })
        .catch(() => navigate('/inventario/ajustes'))
        .finally(() => setCargando(false));
    }
  }, []); // eslint-disable-line

  // Load stock for selected deposit
  useEffect(() => {
    if (!form.id_deposito) { setStockMap({}); return; }
    api.get('/inventario/stock')
      .then(r => {
        const map = {};
        for (const prod of r.data.productos ?? []) {
          const s = prod.stock?.[form.id_deposito];
          map[prod.id_producto] = Number(s?.cantidad ?? 0);
        }
        setStockMap(map);
        // Update existing items' cantidad_sistema
        setItems(prev => prev.map(it => ({
          ...it,
          cantidad_sistema: it.id_producto ? (map[it.id_producto] ?? 0) : it.cantidad_sistema,
        })));
      })
      .catch(() => {});
  }, [form.id_deposito]); // eslint-disable-line

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addItem = () => setItems(p => [...p, { id_producto: '', cantidad_sistema: 0, cantidad_fisica: 0 }]);
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, patch) => setItems(p => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const guardar = async () => {
    setError('');
    if (!form.id_deposito) return setError('Seleccioná un depósito');
    const itemsValidos = items.filter(it => it.id_producto);
    if (!itemsValidos.length) return setError('Agregá al menos un producto');

    setGuardando(true);
    try {
      const payload = { ...form, items: itemsValidos };
      let ajusteId = id;
      if (esEdicion) {
        await ajustesService.update(id, payload);
      } else {
        const res = await ajustesService.create(payload);
        ajusteId = res.data.id_ajuste;
      }
      navigate(`/inventario/ajustes/${ajusteId}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  if (cargando) return <div className="flex items-center justify-center py-32 text-zinc-400">Cargando…</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {esEdicion ? 'Editar ajuste' : 'Nuevo ajuste de inventario'}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Corrección por conteo físico</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Depósito *</label>
            <select value={form.id_deposito} onChange={e => setF('id_deposito', e.target.value)}
              disabled={esEdicion} className={inputCls}>
              <option value="">— seleccionar —</option>
              {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Motivo</label>
            <input type="text" value={form.motivo} onChange={e => setF('motivo', e.target.value)}
              placeholder="Ej: Conteo mensual" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos</p>
          <button onClick={addItem} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Stock sistema</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Conteo físico</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Diferencia</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((fila, i) => (
                <FilaProducto
                  key={i}
                  fila={fila}
                  productos={productos}
                  stockMap={stockMap}
                  onChange={patch => updateItem(i, patch)}
                  onRemove={() => removeItem(i)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear ajuste'}
        </button>
        <button
          onClick={() => navigate(esEdicion ? `/inventario/ajustes/${id}` : '/inventario/ajustes')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
