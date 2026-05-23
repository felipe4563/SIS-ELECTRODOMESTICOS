import { useState, useEffect, useMemo } from 'react';
import { inventarioService } from '../../services/inventario.service';
import { usePermission }     from '../../hooks/usePermission';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtFecha = s => s ? new Date(s).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtNum   = n => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ── Modal de confirmación ────────────────────────────────────────────────────
function ModalAtender({ alerta, onConfirm, onCancel, loading }) {
  if (!alerta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-700">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Marcar como atendida</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
          <span className="font-semibold">{alerta.producto_nombre}</span>
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          {alerta.deposito_nombre} · Stock actual: <span className="font-mono font-semibold">{fmtNum(alerta.cantidad_actual)}</span>
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          ¿Confirmas que esta alerta ya fue atendida?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function Alertas() {
  const { puede } = usePermission();
  const puedeAtender = puede('alertas_atender', 'inventario');

  const [alertas,  setAlertas]  = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab,      setTab]      = useState('pendientes'); // pendientes | atendidas | todas
  const [busqueda, setBusqueda] = useState('');
  const [modal,    setModal]    = useState(null);   // alerta seleccionada
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const params = tab === 'pendientes' ? { atendida: 0 }
                   : tab === 'atendidas'  ? { atendida: 1 }
                   : {};
      const res = await inventarioService.getAlertas(params);
      setAlertas(res.data);
    } catch { /* silencioso */ }
    finally  { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [tab]); // eslint-disable-line

  const alertasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (!q) return alertas;
    return alertas.filter(a =>
      a.producto_nombre.toLowerCase().includes(q) ||
      a.codigo_interno.toLowerCase().includes(q)  ||
      a.marca_nombre.toLowerCase().includes(q)    ||
      a.deposito_nombre.toLowerCase().includes(q)
    );
  }, [alertas, busqueda]);

  // Resumen
  const stats = useMemo(() => {
    const todas = alertas;
    const sinStock = todas.filter(a => Number(a.cantidad_actual) === 0).length;
    return { total: todas.length, sinStock };
  }, [alertas]);

  const handleAtender = async () => {
    setSaving(true);
    setError('');
    try {
      await inventarioService.atenderAlerta(modal.id_alerta);
      setModal(null);
      cargar();
    } catch (e) {
      setError(e?.response?.data?.mensaje ?? 'Error al atender la alerta');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { key: 'pendientes', label: 'Pendientes' },
    { key: 'atendidas',  label: 'Atendidas' },
    { key: 'todas',      label: 'Todas' },
  ];

  return (
    <div className="space-y-5">

      <ModalAtender
        alerta={modal}
        onConfirm={handleAtender}
        onCancel={() => { setModal(null); setError(''); }}
        loading={saving}
      />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Alertas de Stock</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Productos por debajo del stock mínimo configurado
          </p>
        </div>
        <button
          onClick={cargar}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* Tarjetas rápidas (solo visibles en pestaña pendientes) */}
      {tab === 'pendientes' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-200 dark:border-orange-900/30 p-4">
            <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Alertas pendientes</p>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.total}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30 p-4">
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">Productos sin stock</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.sinStock}</p>
          </div>
        </div>
      )}

      {/* Tabs + Filtro */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar producto, marca, depósito…"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-zinc-400">Cargando alertas…</div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
            <span className="text-4xl">✅</span>
            <p className="text-sm">
              {tab === 'pendientes' ? 'No hay alertas pendientes' : 'Sin resultados'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60">
                    {['Producto', 'Marca', 'Depósito', 'Cant. Actual', 'Stock Mín.', 'Diferencia', 'Fecha alerta',
                      ...(tab !== 'pendientes' ? ['Atendida', 'Atendida por'] : []),
                      ...(puedeAtender && tab === 'pendientes' ? ['Acción'] : [])
                    ].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {alertasFiltradas.map(a => {
                    const diferencia = Number(a.cantidad_actual) - Number(a.stock_minimo);
                    const sinStock   = Number(a.cantidad_actual) === 0;
                    return (
                      <tr key={a.id_alerta}
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                          sinStock ? 'bg-red-50/40 dark:bg-red-900/5' : ''
                        }`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900 dark:text-white">{a.producto_nombre}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{a.codigo_interno}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{a.marca_nombre}</td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{a.deposito_nombre}</p>
                          <p className="text-[11px] font-mono text-zinc-400">{a.deposito_codigo}</p>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`font-mono font-semibold ${sinStock ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {fmtNum(a.cantidad_actual)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-zinc-600 dark:text-zinc-400">
                          {fmtNum(a.stock_minimo)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-mono">
                            {fmtNum(diferencia)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                          {fmtFecha(a.fecha_generada)}
                        </td>

                        {tab !== 'pendientes' && (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                              {a.atendida
                                ? <><span className="text-green-600 dark:text-green-400">✓</span> {fmtFecha(a.fecha_atendida)}</>
                                : <span className="text-orange-500">Pendiente</span>
                              }
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                              {a.atendida_por_nombres
                                ? `${a.atendido_por_nombres} ${a.atendido_por_apellidos}`
                                : '—'
                              }
                            </td>
                          </>
                        )}

                        {puedeAtender && tab === 'pendientes' && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setModal(a)}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              Atender
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-600">
              {alertasFiltradas.length} alerta{alertasFiltradas.length !== 1 ? 's' : ''}
              {busqueda && alertasFiltradas.length !== alertas.length && ` (filtrado de ${alertas.length})`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
