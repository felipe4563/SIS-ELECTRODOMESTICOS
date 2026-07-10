import { useState, useEffect, useCallback, useRef } from 'react';
import { gastosService } from '../../services/gastos.service';
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

const CARD_BORDER = {
  REGISTRADO: 'border-l-blue-400',
  APROBADO:   'border-l-yellow-400',
  PAGADO:     'border-l-green-400',
  ANULADO:    'border-l-red-400',
};

const fmt      = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });
const fmtFecha = (d) => {
  if (!d) return '-';
  const date = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-BO');
};

const INPUT = 'w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors';
const LABEL = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

function ErrorBox({ msg }) {
  return (
    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2.5">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  );
}

function ModalShell({ onClose, title, children, maxW = 'sm:max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={`bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full ${maxW} max-h-[92vh] overflow-y-auto`}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-0.5 h-5 rounded-full bg-yellow-400 flex-shrink-0" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Modal Categoría ───────────────────────────────────────────────────────────
function ModalCategoria({ item, onClose, onSave }) {
  const [form, setForm]     = useState({ nombre: item?.nombre || '', descripcion: item?.descripcion || '', activo: item?.activo ?? 1 });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const esEdicion = !!item?.id_categoria_gasto;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Nombre requerido'); return; }
    setLoading(true);
    try {
      if (esEdicion) await gastosService.updateCategoria(item.id_categoria_gasto, form);
      else           await gastosService.crearCategoria(form);
      onSave();
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al guardar');
    } finally { setLoading(false); }
  };

  return (
    <ModalShell onClose={onClose} title={esEdicion ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && <ErrorBox msg={error} />}
        <div>
          <label className={LABEL}>Nombre *</label>
          <input
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej. Servicios básicos"
            className={INPUT}
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL}>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={2}
            placeholder="Descripción opcional..."
            className={`${INPUT} resize-none`}
          />
        </div>
        {esEdicion && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={!!form.activo}
              onClick={() => setForm(f => ({ ...f, activo: form.activo ? 0 : 1 }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.activo ? 'bg-yellow-400' : 'bg-zinc-300 dark:bg-zinc-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.activo ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Activo</span>
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Modal Gasto ───────────────────────────────────────────────────────────────
function ModalGasto({ item, categorias, sucursales, monedas, onClose, onSave }) {
  const hoy        = new Date().toISOString().slice(0, 10);
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
  const [error, setError]     = useState('');
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

  return (
    <ModalShell onClose={onClose} title={item ? `Editar · ${item.numero}` : 'Nuevo gasto'} maxW="sm:max-w-2xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {error && <ErrorBox msg={error} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Categoría *</label>
            <select value={form.id_categoria_gasto} onChange={e => set('id_categoria_gasto', e.target.value)} className={INPUT} required>
              <option value="">Seleccionar...</option>
              {categorias.filter(c => c.activo).map(c => (
                <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Sucursal *</label>
            <select value={form.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={INPUT} required>
              {sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Descripción *</label>
          <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej. Compra de material de limpieza" className={INPUT} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Fecha *</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={INPUT} required />
          </div>
          <div>
            <label className={LABEL}>Método de pago *</label>
            <select value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)} className={INPUT}>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Moneda *</label>
            <select value={form.id_moneda} onChange={e => set('id_moneda', e.target.value)} className={INPUT} required>
              {monedas.map(m => (
                <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Monto *</label>
            <input type="number" step="0.01" min="0" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" className={INPUT} required />
          </div>
        </div>

        <div>
          <label className={LABEL}>N° Comprobante</label>
          <input value={form.numero_comprobante} onChange={e => set('numero_comprobante', e.target.value)} placeholder="Factura, recibo, N° de nota..." className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Observaciones</label>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={2} placeholder="Notas adicionales..." className={`${INPUT} resize-none`} />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Guardar gasto'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Modal Detalle ─────────────────────────────────────────────────────────────
function ModalDetalle({ id, onClose, onRefresh, puede }) {
  const [gasto, setGasto]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [accion, setAccion]         = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [err, setErr]               = useState('');
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
    <ModalShell onClose={onClose} title="Detalle del gasto">
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-12 text-zinc-400">
            <Spinner /> <span className="text-sm">Cargando...</span>
          </div>
        ) : !gasto ? (
          <div className="py-12 text-center text-sm text-zinc-400">{err || 'Gasto no encontrado'}</div>
        ) : (
          <div className="space-y-5">
            {err && <ErrorBox msg={err} />}

            {/* Número + estado con borde de color */}
            <div className={`flex items-start gap-3 pl-3 border-l-4 ${CARD_BORDER[gasto.estado]} py-1`}>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{gasto.numero}</p>
                <p className="text-base font-bold text-zinc-900 dark:text-white mt-0.5 truncate">{gasto.descripcion}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${BADGE[gasto.estado]}`}>{gasto.estado}</span>
            </div>

            {/* Info grid */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Categoría</dt>
                  <dd className="text-zinc-900 dark:text-white font-medium">{gasto.categoria || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Sucursal</dt>
                  <dd className="text-zinc-900 dark:text-white font-medium">{gasto.sucursal || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Fecha</dt>
                  <dd className="text-zinc-900 dark:text-white font-medium">{fmtFecha(gasto.fecha)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Método</dt>
                  <dd className="text-zinc-900 dark:text-white font-medium">{gasto.metodo_pago || '—'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Monto</dt>
                  <dd className="text-xl font-bold font-mono text-zinc-900 dark:text-white">Bs {fmt(gasto.monto)}</dd>
                </div>
                {gasto.proveedor && (
                  <div className="col-span-2">
                    <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Proveedor</dt>
                    <dd className="text-zinc-900 dark:text-white font-medium">{gasto.proveedor}</dd>
                  </div>
                )}
                {gasto.numero_comprobante && (
                  <div className="col-span-2">
                    <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">N° Comprobante</dt>
                    <dd className="font-mono text-sm text-zinc-900 dark:text-white">{gasto.numero_comprobante}</dd>
                  </div>
                )}
                <div className="col-span-2">
                  <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Registrado por</dt>
                  <dd className="text-zinc-900 dark:text-white font-medium">{gasto.usuario_nombre || '—'}</dd>
                </div>
                {gasto.observaciones && (
                  <div className="col-span-2">
                    <dt className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">Observaciones</dt>
                    <dd className="text-zinc-600 dark:text-zinc-300 text-sm">{gasto.observaciones}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Comprobante */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Comprobante</p>
              </div>
              {gasto.comprobante_url ? (
                /\.(jpg|jpeg|png|webp)$/i.test(gasto.comprobante_url) ? (
                  <img
                    src={`${backendBase}${gasto.comprobante_url}`}
                    alt="comprobante"
                    className="max-h-48 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 object-contain bg-zinc-50 dark:bg-zinc-800"
                  />
                ) : (
                  <a
                    href={`${backendBase}${gasto.comprobante_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-300 hover:underline"
                  >
                    📄 Ver comprobante PDF
                  </a>
                )
              ) : (
                <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl py-5 text-center">
                  <p className="text-xs text-zinc-400">Sin comprobante adjunto</p>
                </div>
              )}

              {gasto.estado !== 'ANULADO' && puede('adjuntar_comprobante', 'gastos') && (
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.webp"
                    onChange={e => setUploadFile(e.target.files[0] || null)}
                    className="flex-1 text-xs text-zinc-600 dark:text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-yellow-400 file:px-2 file:py-1 file:text-xs file:font-semibold file:cursor-pointer file:hover:bg-yellow-300 file:transition-colors"
                  />
                  <button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {uploading ? 'Subiendo...' : 'Subir'}
                  </button>
                </div>
              )}
            </div>

            {/* Acciones del flujo */}
            {accion === 'anular' ? (
              <div className="space-y-3 border border-red-200 dark:border-red-800/40 rounded-2xl p-4 bg-red-50 dark:bg-red-900/10">
                <label className="block text-sm font-semibold text-red-700 dark:text-red-400">Motivo de anulación</label>
                <textarea
                  value={motivoAnular}
                  onChange={e => setMotivoAnular(e.target.value)}
                  rows={2}
                  placeholder="Describe el motivo..."
                  className="w-full border border-red-200 dark:border-red-800/40 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setAccion(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => ejecutar('anular')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                    Confirmar anulación
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gasto.estado === 'REGISTRADO' && puede('aprobar', 'gastos') && (
                  <button onClick={() => ejecutar('aprobar')} className="flex-1 min-w-[120px] py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors">
                    ✓ Aprobar
                  </button>
                )}
                {gasto.estado === 'APROBADO' && puede('pagar', 'gastos') && (
                  <button onClick={() => ejecutar('pagar')} className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors">
                    💳 Marcar pagado
                  </button>
                )}
                {['REGISTRADO', 'APROBADO'].includes(gasto.estado) && puede('anular', 'gastos') && (
                  <button onClick={() => setAccion('anular')} className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 transition-colors">
                    ✕ Anular
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
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

  const BadgeActivo = ({ activo }) => (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${activo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );

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
        <div className="flex items-center gap-2.5">
          <span className="w-0.5 h-5 rounded-full bg-yellow-400" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Categorías de gasto</h3>
        </div>
        {puede('categorias_gestionar', 'gastos') && (
          <button onClick={() => setModalCat({})} className="px-3 py-2 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors">
            + Nueva categoría
          </button>
        )}
      </div>

      {err && <ErrorBox msg={err} />}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Descripción</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Estado</th>
                {puede('categorias_gestionar', 'gastos') && (
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={4} className="py-10">
                  <div className="flex items-center justify-center gap-2 text-zinc-400"><Spinner /><span className="text-sm">Cargando...</span></div>
                </td></tr>
              ) : cats.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-sm text-zinc-400">Sin categorías registradas</td></tr>
              ) : cats.map(c => (
                <tr key={c.id_categoria_gasto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-white">{c.nombre}</td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">{c.descripcion || <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-center"><BadgeActivo activo={c.activo} /></td>
                  {puede('categorias_gestionar', 'gastos') && (
                    <td className="px-5 py-3.5 text-right">
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

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-zinc-400 py-10"><Spinner /><span className="text-sm">Cargando...</span></div>
          ) : cats.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">Sin categorías registradas</div>
          ) : cats.map(c => (
            <div key={c.id_categoria_gasto} className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{c.nombre}</p>
                {c.descripcion && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{c.descripcion}</p>}
              </div>
              <BadgeActivo activo={c.activo} />
              {puede('categorias_gestionar', 'gastos') && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setModalCat(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">✏️</button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Gastos() {
  const { puede } = usePermission();
  const [tab, setTab] = useState('gastos');

  const [categorias, setCategorias] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [monedas, setMonedas]       = useState([]);

  const [gastos, setGastos]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');

  const [filtros, setFiltros] = useState({
    id_categoria_gasto: '', id_sucursal: '', estado: '',
    fecha_desde: '', fecha_hasta: '', busqueda: '', page: 1, limit: 20,
  });

  const [modalGasto,   setModalGasto]   = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  useEffect(() => {
    gastosService.getFormData()
      .then(r => {
        setCategorias(r.data.categorias || []);
        setSucursales(r.data.sucursales || []);
        setMonedas(r.data.monedas || []);
      })
      .catch(() => {});
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

  const FC = 'border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors w-full';

  return (
    <div className="space-y-5">
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Gastos</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Registro y seguimiento de gastos operativos</p>
        </div>
        {puede('crear', 'gastos') && tab === 'gastos' && (
          <button
            onClick={() => setModalGasto({})}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-yellow-400 text-zinc-900 hover:bg-yellow-300 transition-colors shadow-sm"
          >
            + Nuevo gasto
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
        {[
          { key: 'gastos',     label: 'Gastos',     visible: true },
          { key: 'categorias', label: 'Categorías', visible: puede('categorias_ver', 'gastos') || puede('categorias_gestionar', 'gastos') },
        ].filter(t => t.visible).map(t => (
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
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2.5">
              <span className="w-0.5 h-4 rounded-full bg-yellow-400" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Filtros</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <input
                placeholder="Buscar número o descripción..."
                value={filtros.busqueda}
                onChange={e => setFiltro('busqueda', e.target.value)}
                className={`${FC} sm:col-span-2 lg:col-span-1`}
              />
              <select value={filtros.id_categoria_gasto} onChange={e => setFiltro('id_categoria_gasto', e.target.value)} className={FC}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>)}
              </select>
              {puede('ver_todos', 'gastos') && (
                <select value={filtros.id_sucursal} onChange={e => setFiltro('id_sucursal', e.target.value)} className={FC}>
                  <option value="">Todas las sucursales</option>
                  {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
                </select>
              )}
              <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)} className={FC}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input type="date" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} className={FC} />
              <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} className={FC} />
              <button
                onClick={() => setFiltros({ id_categoria_gasto: '', id_sucursal: '', estado: '', fecha_desde: '', fecha_hasta: '', busqueda: '', page: 1, limit: 20 })}
                className="px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Conteo */}
          <div className="px-1 flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-white">{total}</span>{' '}
              gasto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>
          </div>

          {err && <ErrorBox msg={err} />}

          {/* Lista */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">

            {/* Desktop tabla (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    {['N°','Descripción','Categoría','Sucursal','Fecha','Monto','Método','Estado','Acciones'].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap
                        ${i === 0 || i >= 4 ? '' : ''}
                        ${[2].includes(i) ? 'hidden lg:table-cell' : ''}
                        ${[3,6].includes(i) ? 'hidden xl:table-cell' : ''}
                        ${i === 5 || i === 8 ? 'text-right' : i === 7 || i === 8 ? 'text-center' : 'text-left'}
                        ${i === 8 ? 'text-center' : ''}
                      `}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                  {loading ? (
                    <tr><td colSpan={9} className="py-14">
                      <div className="flex items-center justify-center gap-2.5 text-zinc-400"><Spinner /><span className="text-sm">Cargando...</span></div>
                    </td></tr>
                  ) : gastos.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-14 text-sm text-zinc-400">Sin gastos registrados</td></tr>
                  ) : gastos.map(g => (
                    <tr key={g.id_gasto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{g.numero}</td>
                      <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-white max-w-[180px] truncate" title={g.descripcion}>{g.descripcion}</td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">{g.categoria}</td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 hidden xl:table-cell">{g.sucursal}</td>
                      <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold font-mono text-zinc-900 dark:text-white whitespace-nowrap">Bs {fmt(g.monto)}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 hidden xl:table-cell">{g.metodo_pago}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BADGE[g.estado]}`}>{g.estado}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setModalDetalle(g.id_gasto)} className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Ver">👁</button>
                          {g.estado === 'REGISTRADO' && puede('editar', 'gastos') && (
                            <button onClick={() => setModalGasto(g)} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Editar">✏️</button>
                          )}
                          {g.estado === 'REGISTRADO' && puede('aprobar', 'gastos') && (
                            <button onClick={async () => { try { await gastosService.aprobarGasto(g.id_gasto); cargarGastos(); } catch (e) { alert(e.response?.data?.mensaje || 'Error'); }}} className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Aprobar">✓</button>
                          )}
                          {g.estado === 'APROBADO' && puede('pagar', 'gastos') && (
                            <button onClick={async () => { try { await gastosService.pagarGasto(g.id_gasto); cargarGastos(); } catch (e) { alert(e.response?.data?.mensaje || 'Error'); }}} className="p-1.5 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Pagar">💳</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards (< md) */}
            <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <div className="flex items-center justify-center gap-2.5 py-12 text-zinc-400"><Spinner /><span className="text-sm">Cargando...</span></div>
              ) : gastos.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-400">Sin gastos registrados</div>
              ) : gastos.map(g => (
                <div key={g.id_gasto} className={`flex border-l-4 ${CARD_BORDER[g.estado]} hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors`}>
                  <div className="flex-1 px-4 py-3.5 space-y-1.5 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 pt-0.5">{g.numero}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${BADGE[g.estado]}`}>{g.estado}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{g.descripcion}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{g.categoria} · {g.sucursal}</p>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">{fmtFecha(g.fecha)} · {g.metodo_pago}</span>
                      <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">Bs {fmt(g.monto)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-0.5 px-2 border-l border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                    <button onClick={() => setModalDetalle(g.id_gasto)} className="p-2 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Ver">👁</button>
                    {g.estado === 'REGISTRADO' && puede('editar', 'gastos') && (
                      <button onClick={() => setModalGasto(g)} className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Editar">✏️</button>
                    )}
                    {g.estado === 'REGISTRADO' && puede('aprobar', 'gastos') && (
                      <button onClick={async () => { try { await gastosService.aprobarGasto(g.id_gasto); cargarGastos(); } catch(e) { alert(e.response?.data?.mensaje || 'Error'); }}} className="p-2 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Aprobar">✓</button>
                    )}
                    {g.estado === 'APROBADO' && puede('pagar', 'gastos') && (
                      <button onClick={async () => { try { await gastosService.pagarGasto(g.id_gasto); cargarGastos(); } catch(e) { alert(e.response?.data?.mensaje || 'Error'); }}} className="p-2 rounded-lg text-zinc-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Pagar">💳</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                <button
                  onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}
                  disabled={filtros.page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Pág. <span className="font-semibold text-zinc-900 dark:text-white">{filtros.page}</span> de <span className="font-semibold text-zinc-900 dark:text-white">{pages}</span>
                </span>
                <button
                  onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}
                  disabled={filtros.page >= pages}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
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
