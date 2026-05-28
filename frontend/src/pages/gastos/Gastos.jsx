import { useState, useEffect, useCallback, useRef } from 'react';
import { gastosService } from '../../services/gastos.service';
import { sucursalesService, monedasService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';

// ── helpers ───────────────────────────────────────────────────────────────────
const ESTADOS = ['REGISTRADO', 'APROBADO', 'PAGADO', 'ANULADO'];
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'CHEQUE', 'TARJETA', 'OTRO'];

const BADGE = {
  REGISTRADO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  APROBADO:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  PAGADO:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ANULADO:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const fmt = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-BO') : '-';

// ── Modal Categoría ───────────────────────────────────────────────────────────
function ModalCategoria({ item, onClose, onSave }) {
  const [form, setForm]   = useState({ nombre: item?.nombre || '', descripcion: item?.descripcion || '', activo: item?.activo ?? 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Nombre requerido'); return; }
    setLoading(true);
    try {
      if (item) await gastosService.updateCategoria(item.id_categoria_gasto, form);
      else      await gastosService.crearCategoria(form);
      onSave();
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {item ? 'Editar categoría' : 'Nueva categoría'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre *</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
          </div>
          {item && (
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input type="checkbox" checked={!!form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked ? 1 : 0 }))} className="rounded" />
              Activo
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Gasto ───────────────────────────────────────────────────────────────
function ModalGasto({ item, categorias, sucursales, monedas, onClose, onSave }) {
  const hoy   = new Date().toISOString().slice(0, 10);
  const monedaBase = monedas.find(m => m.es_moneda_base) || monedas[0] || {};

  const [form, setForm] = useState({
    id_categoria_gasto: item?.id_categoria_gasto || '',
    id_sucursal:        item?.id_sucursal || sucursales[0]?.id_sucursal || '',
    id_proveedor:       item?.id_proveedor || '',
    descripcion:        item?.descripcion || '',
    fecha:              item?.fecha?.slice(0, 10) || hoy,
    id_moneda:          item?.id_moneda || monedaBase.id_moneda || '',
    tipo_cambio:        item?.tipo_cambio || 1,
    monto:              item?.monto || '',
    metodo_pago:        item?.metodo_pago || 'EFECTIVO',
    numero_comprobante: item?.numero_comprobante || '',
    observaciones:      item?.observaciones || '',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (item) await gastosService.updateGasto(item.id_gasto, form);
      else      await gastosService.crearGasto(form);
      onSave();
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al guardar');
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';
  const labelCls = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            {item ? `Editar gasto ${item.numero}` : 'Nuevo gasto'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría *</label>
              <select value={form.id_categoria_gasto} onChange={e => set('id_categoria_gasto', e.target.value)} className={inputCls} required>
                <option value="">Seleccionar...</option>
                {categorias.filter(c => c.activo).map(c => (
                  <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sucursal *</label>
              <select value={form.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={inputCls} required>
                {sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción *</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} className={inputCls} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Método de pago *</label>
              <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)} className={inputCls}>
                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Moneda *</label>
              <select value={form.id_moneda} onChange={e => set('id_moneda', e.target.value)} className={inputCls} required>
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monto *</label>
              <input type="number" step="0.01" min="0" value={form.monto} onChange={e => set('monto', e.target.value)} className={inputCls} required />
            </div>
          </div>

          <div>
            <label className={labelCls}>N° Comprobante</label>
            <input value={form.numero_comprobante} onChange={e => set('numero_comprobante', e.target.value)} placeholder="Factura, recibo..." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Detalle ─────────────────────────────────────────────────────────────
function ModalDetalle({ id, onClose, onRefresh, puede }) {
  const [gasto, setGasto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion]   = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [uploadFile, setUploadFile]     = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef();

  const cargar = useCallback(async () => {
    try {
      const r = await gastosService.getGasto(id);
      setGasto(r.data.gasto);
    } catch { setErr('Error al cargar el gasto'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const ejecutar = async (a) => {
    setErr('');
    try {
      if (a === 'aprobar') await gastosService.aprobarGasto(id);
      if (a === 'pagar')   await gastosService.pagarGasto(id);
      if (a === 'anular')  await gastosService.anularGasto(id, { motivo: motivoAnular });
      setAccion(null);
      await cargar();
      onRefresh();
    } catch (e) { setErr(e.response?.data?.mensaje || 'Error'); }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setErr('');
    try {
      await gastosService.subirComprobante(id, uploadFile);
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await cargar();
    } catch (e) { setErr(e.response?.data?.mensaje || 'Error al subir'); }
    finally { setUploading(false); }
  };

  const backendBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Detalle del gasto</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-zinc-400 py-8">Cargando...</p>
          ) : !gasto ? (
            <p className="text-center text-red-500 py-8">{err || 'No encontrado'}</p>
          ) : (
            <div className="space-y-4">
              {err && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</p>}

              {/* Estado */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Estado:</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${BADGE[gasto.estado]}`}>{gasto.estado}</span>
                <span className="ml-auto text-xs text-zinc-400">{gasto.numero}</span>
              </div>

              {/* Info principal */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-2 text-sm">
                <Row label="Descripción" value={gasto.descripcion} />
                <Row label="Categoría"   value={gasto.categoria} />
                <Row label="Sucursal"    value={gasto.sucursal} />
                <Row label="Fecha"       value={fmtFecha(gasto.fecha)} />
                <Row label="Monto"       value={`Bs ${fmt(gasto.monto)}`} bold />
                <Row label="Método"      value={gasto.metodo_pago} />
                {gasto.proveedor       && <Row label="Proveedor" value={gasto.proveedor} />}
                {gasto.numero_comprobante && <Row label="N° Comprobante" value={gasto.numero_comprobante} />}
                <Row label="Registrado por" value={gasto.usuario_nombre} />
                {gasto.observaciones && <Row label="Observaciones" value={gasto.observaciones} />}
              </div>

              {/* Comprobante */}
              <div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Comprobante</p>
                {gasto.comprobante_url ? (
                  <div className="space-y-2">
                    {/\.(jpg|jpeg|png|webp)$/i.test(gasto.comprobante_url) ? (
                      <img
                        src={`${backendBase}${gasto.comprobante_url}`}
                        alt="comprobante"
                        className="max-h-48 rounded-xl border border-zinc-200 dark:border-zinc-700 object-contain"
                      />
                    ) : (
                      <a
                        href={`${backendBase}${gasto.comprobante_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-yellow-600 hover:underline"
                      >
                        📄 Ver comprobante PDF
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Sin comprobante adjunto</p>
                )}

                {/* Upload */}
                {gasto.estado !== 'ANULADO' && (
                  <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.webp"
                      onChange={e => setUploadFile(e.target.files[0] || null)}
                      className="text-xs text-zinc-600 dark:text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-2 file:py-1 file:text-xs file:font-semibold file:cursor-pointer"
                    />
                    <button
                      onClick={handleUpload}
                      disabled={!uploadFile || uploading}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors"
                    >
                      {uploading ? 'Subiendo...' : 'Subir'}
                    </button>
                  </div>
                )}
              </div>

              {/* Acciones del flujo */}
              {accion === 'anular' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Motivo de anulación</label>
                  <textarea
                    value={motivoAnular}
                    onChange={e => setMotivoAnular(e.target.value)}
                    rows={2}
                    className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setAccion(null)} className="flex-1 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                    <button onClick={() => ejecutar('anular')} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">Confirmar anulación</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gasto.estado === 'REGISTRADO' && puede('aprobar', 'gastos') && (
                    <button onClick={() => ejecutar('aprobar')} className="px-3 py-2 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors">
                      ✓ Aprobar
                    </button>
                  )}
                  {gasto.estado === 'APROBADO' && puede('pagar', 'gastos') && (
                    <button onClick={() => ejecutar('pagar')} className="px-3 py-2 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">
                      💳 Marcar pagado
                    </button>
                  )}
                  {['REGISTRADO', 'APROBADO'].includes(gasto.estado) && puede('anular', 'gastos') && (
                    <button onClick={() => setAccion('anular')} className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                      ✕ Anular
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-zinc-500 dark:text-zinc-400 shrink-0">{label}</span>
      <span className={`text-zinc-900 dark:text-white text-right ${bold ? 'font-bold' : ''}`}>{value || '-'}</span>
    </div>
  );
}

// ── Tab Categorías ────────────────────────────────────────────────────────────
function TabCategorias({ puede }) {
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalCat, setModalCat] = useState(null);
  const [err, setErr]           = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await gastosService.getCategorias();
      setCats(r.data.categorias);
    } catch { setErr('Error al cargar categorías'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Eliminar categoría "${c.nombre}"?`)) return;
    try {
      await gastosService.deleteCategoria(c.id_categoria_gasto);
      cargar();
    } catch (e) { alert(e.response?.data?.mensaje || 'Error'); }
  };

  return (
    <div className="space-y-4">
      {modalCat !== undefined && modalCat !== false && (
        <ModalCategoria
          item={modalCat || null}
          onClose={() => setModalCat(false)}
          onSave={() => { setModalCat(false); cargar(); }}
        />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Categorías de gasto</h3>
        {puede('gestionar_categorias', 'gastos') && (
          <button
            onClick={() => setModalCat({})}
            className="px-3 py-2 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors"
          >
            + Nueva categoría
          </button>
        )}
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 hidden sm:table-cell">Descripción</th>
                <th className="text-center px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Estado</th>
                {puede('gestionar_categorias', 'gastos') && (
                  <th className="text-right px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-zinc-400">Cargando...</td></tr>
              ) : cats.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-zinc-400">Sin categorías registradas</td></tr>
              ) : cats.map(c => (
                <tr key={c.id_categoria_gasto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{c.nombre}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">{c.descripcion || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {puede('gestionar_categorias', 'gastos') && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModalCat(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Editar">✏️</button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Gastos() {
  const { puede } = usePermission();
  const [tab, setTab] = useState('gastos');

  // datos maestros
  const [categorias, setCategorias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [monedas, setMonedas]       = useState([]);

  // lista gastos
  const [gastos, setGastos]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');

  // filtros
  const [filtros, setFiltros] = useState({
    id_categoria_gasto: '',
    id_sucursal: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    busqueda: '',
    page: 1,
    limit: 20,
  });

  // modales
  const [modalGasto,   setModalGasto]   = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  // cargar maestros
  useEffect(() => {
    Promise.all([
      gastosService.getCategorias(),
      sucursalesService.getAll(),
      monedasService.getAll(),
    ]).then(([catR, sucR, monR]) => {
      setCategorias(catR.data.categorias || []);
      setSucursales(sucR.data?.sucursales || sucR.data || []);
      setMonedas(monR.data?.monedas || monR.data || []);
    }).catch(() => {});
  }, []);

  const cargarGastos = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const params = {};
      Object.entries(filtros).forEach(([k, v]) => { if (v !== '') params[k] = v; });
      const r = await gastosService.getGastos(params);
      setGastos(r.data.gastos);
      setTotal(r.data.total);
      setPages(r.data.pages);
    } catch { setErr('Error al cargar gastos'); }
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { if (tab === 'gastos') cargarGastos(); }, [filtros, tab, cargarGastos]);

  const setFiltro = (k, v) => setFiltros(f => ({ ...f, [k]: v, page: 1 }));

  const inputCls = 'border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="space-y-6">
      {/* Modales */}
      {modalGasto !== null && (
        <ModalGasto
          item={modalGasto.id_gasto ? modalGasto : null}
          categorias={categorias}
          sucursales={sucursales}
          monedas={monedas}
          onClose={() => setModalGasto(null)}
          onSave={() => { setModalGasto(null); cargarGastos(); }}
        />
      )}
      {modalDetalle && (
        <ModalDetalle
          id={modalDetalle}
          onClose={() => setModalDetalle(null)}
          onRefresh={cargarGastos}
          puede={puede}
        />
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gastos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Registro y seguimiento de gastos operativos</p>
        </div>
        {puede('crear', 'gastos') && tab === 'gastos' && (
          <button
            onClick={() => setModalGasto({})}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors"
          >
            + Nuevo gasto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {[{ key: 'gastos', label: 'Gastos' }, { key: 'categorias', label: 'Categorías' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categorias' ? (
        <TabCategorias puede={puede} />
      ) : (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <input
                placeholder="Buscar número, descripción..."
                value={filtros.busqueda}
                onChange={e => setFiltro('busqueda', e.target.value)}
                className={`${inputCls} col-span-1 sm:col-span-2 lg:col-span-1`}
              />
              <select value={filtros.id_categoria_gasto} onChange={e => setFiltro('id_categoria_gasto', e.target.value)} className={inputCls}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>)}
              </select>
              <select value={filtros.id_sucursal} onChange={e => setFiltro('id_sucursal', e.target.value)} className={inputCls}>
                <option value="">Todas las sucursales</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
              <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)} className={inputCls}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input type="date" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} className={inputCls} placeholder="Desde" />
              <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} className={inputCls} placeholder="Hasta" />
              <button
                onClick={() => setFiltros({ id_categoria_gasto: '', id_sucursal: '', estado: '', fecha_desde: '', fecha_hasta: '', busqueda: '', page: 1, limit: 20 })}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Resumen */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{total} gasto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>

          {err && <p className="text-red-500 text-sm">{err}</p>}

          {/* Tabla */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">N°</th>
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Descripción</th>
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 hidden md:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">Sucursal</th>
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 hidden sm:table-cell">Fecha</th>
                    <th className="text-right px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Monto</th>
                    <th className="text-left px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300 hidden md:table-cell">Método</th>
                    <th className="text-center px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Estado</th>
                    <th className="text-center px-4 py-3 font-semibold text-zinc-600 dark:text-zinc-300">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-zinc-400">Cargando...</td></tr>
                  ) : gastos.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-zinc-400">Sin gastos registrados</td></tr>
                  ) : gastos.map(g => (
                    <tr key={g.id_gasto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{g.numero}</td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-white max-w-[160px] truncate" title={g.descripcion}>{g.descripcion}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 hidden md:table-cell">{g.categoria}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 hidden lg:table-cell">{g.sucursal}</td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 hidden sm:table-cell whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-white whitespace-nowrap">Bs {fmt(g.monto)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 hidden md:table-cell">{g.metodo_pago}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE[g.estado]}`}>{g.estado}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setModalDetalle(g.id_gasto)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                            title="Ver detalle"
                          >
                            👁
                          </button>
                          {g.estado === 'REGISTRADO' && puede('editar', 'gastos') && (
                            <button
                              onClick={() => setModalGasto(g)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Editar"
                            >
                              ✏️
                            </button>
                          )}
                          {g.estado === 'REGISTRADO' && puede('aprobar', 'gastos') && (
                            <button
                              onClick={async () => {
                                try { await gastosService.aprobarGasto(g.id_gasto); cargarGastos(); }
                                catch (e) { alert(e.response?.data?.mensaje || 'Error'); }
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                              title="Aprobar"
                            >
                              ✓
                            </button>
                          )}
                          {g.estado === 'APROBADO' && puede('pagar', 'gastos') && (
                            <button
                              onClick={async () => {
                                try { await gastosService.pagarGasto(g.id_gasto); cargarGastos(); }
                                catch (e) { alert(e.response?.data?.mensaje || 'Error'); }
                              }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Marcar pagado"
                            >
                              💳
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                  disabled={filtros.page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Página {filtros.page} de {pages}
                </span>
                <button
                  onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                  disabled={filtros.page >= pages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
