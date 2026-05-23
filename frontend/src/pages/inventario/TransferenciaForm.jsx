import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferenciasService } from '../../services/transferencias.service';
import { depositosService }       from '../../services/depositos.service';
import { productosService }       from '../../services/productos.service';

function FilaItem({ fila, productos, onChange, onRemove }) {
  const [busqueda, setBusqueda] = useState('');
  const filtrados = productos.filter(p =>
    !busqueda || p.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="px-3 py-2">
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <select
            value={fila.id_producto}
            onChange={e => onChange('id_producto', e.target.value)}
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
      <td className="px-3 py-2 w-32">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={fila.cantidad}
          onChange={e => onChange('cantidad', e.target.value)}
          className="w-full px-2 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 text-right"
        />
      </td>
      <td className="px-3 py-2 w-10 text-center">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-base leading-none">×</button>
      </td>
    </tr>
  );
}

export default function TransferenciaForm() {
  const navigate = useNavigate();
  const [depositos, setDepositos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    id_deposito_origen: '', id_deposito_destino: '', observaciones: '',
  });
  const [items, setItems] = useState([{ id_producto: '', cantidad: 1 }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([depositosService.getAll(), productosService.getAll()])
      .then(([rd, rp]) => {
        setDepositos(rd.data.depositos ?? rd.data ?? []);
        setProductos(rp.data.productos ?? rp.data ?? []);
      })
      .catch(() => {});
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addItem = () => setItems(p => [...p, { id_producto: '', cantidad: 1 }]);
  const removeItem = i => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const guardar = async () => {
    setError('');
    if (!form.id_deposito_origen || !form.id_deposito_destino) {
      return setError('Seleccioná origen y destino');
    }
    if (form.id_deposito_origen === form.id_deposito_destino) {
      return setError('Origen y destino no pueden ser iguales');
    }
    const itemsValidos = items.filter(it => it.id_producto && Number(it.cantidad) > 0);
    if (!itemsValidos.length) return setError('Agregá al menos un producto con cantidad válida');

    setGuardando(true);
    try {
      const res = await transferenciasService.create({ ...form, items: itemsValidos });
      navigate(`/inventario/transferencias/${res.data.id_transferencia}`);
    } catch (err) {
      setError(err.response?.data?.mensaje ?? 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nueva transferencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Movimiento de stock entre depósitos</p>
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
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Depósito Origen *</label>
            <select value={form.id_deposito_origen} onChange={e => setF('id_deposito_origen', e.target.value)} className={inputCls}>
              <option value="">— seleccionar —</option>
              {depositos.map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Depósito Destino *</label>
            <select value={form.id_deposito_destino} onChange={e => setF('id_deposito_destino', e.target.value)} className={inputCls}>
              <option value="">— seleccionar —</option>
              {depositos
                .filter(d => String(d.id_deposito) !== String(form.id_deposito_origen))
                .map(d => <option key={d.id_deposito} value={d.id_deposito}>{d.nombre}</option>)
              }
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea
            rows={2}
            value={form.observaciones}
            onChange={e => setF('observaciones', e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Motivo de la transferencia…"
          />
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Productos a transferir</p>
          <button onClick={addItem} className="text-xs px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold transition-colors">
            + Agregar
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60">
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Producto</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Cantidad</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((fila, i) => (
              <FilaItem
                key={i}
                fila={fila}
                productos={productos}
                onChange={(k, v) => updateItem(i, k, v)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors"
        >
          {guardando ? 'Guardando…' : 'Crear transferencia'}
        </button>
        <button
          onClick={() => navigate('/inventario/transferencias')}
          className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
