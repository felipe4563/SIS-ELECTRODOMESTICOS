import { useState, useEffect } from 'react';
import { gastosService } from '../../services/gastos.service';
import { cajaService } from '../../services/caja.service';
import { hoyLocal } from '../../utils/fechaLocal';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'QR', 'CHEQUE', 'TARJETA', 'OTRO'];

const INPUT = 'w-full border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
const LABEL = 'block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

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

// Formulario completo de gasto (categoría + subcategoría, sucursal, moneda, comprobante...).
// Se usa tanto en Gastos → Nuevo gasto como en Caja Chica → Registrar gasto, para que la
// experiencia de registrar un gasto sea siempre la misma sin importar desde dónde se entre.
//
// `cajaFija` (opcional): { id_caja, id_sucursal } — cuando se abre desde el detalle de una
// caja/arqueo específico, fija la sucursal y la caja del gasto a ese turno en vez de dejar
// que el usuario elija entre todas sus cajas abiertas.
export default function ModalGasto({ item, categorias, sucursales, monedas, cajaFija, onClose, onSave }) {
  const hoy        = hoyLocal();
  const monedaBase = monedas.find(m => m.es_moneda_base) || monedas[0] || {};

  const [form, setForm] = useState({
    id_categoria_gasto: item?.id_categoria_gasto || '',
    id_sucursal:        item?.id_sucursal || cajaFija?.id_sucursal || sucursales[0]?.id_sucursal || '',
    id_proveedor:       item?.id_proveedor || '',
    descripcion:        item?.descripcion || '',
    fecha:              item?.fecha?.slice(0, 10) || hoy,
    id_moneda:          item?.id_moneda || monedaBase.id_moneda || '',
    tipo_cambio:        item?.tipo_cambio || 1,
    monto:              item?.monto || '',
    metodo_pago:        item?.metodo_pago || 'EFECTIVO',
    numero_comprobante: item?.numero_comprobante || '',
    observaciones:      item?.observaciones || '',
    id_caja:            item?.id_caja || cajaFija?.id_caja || '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [categoriaRaizSeleccionada, setCategoriaRaizSeleccionada] = useState(() => {
    if (!item?.id_categoria_gasto) return '';
    const actual = categorias.find(c => c.id_categoria_gasto === item.id_categoria_gasto);
    return actual?.id_categoria_gasto_padre ? String(actual.id_categoria_gasto_padre) : String(item.id_categoria_gasto);
  });
  const subcategorias = categorias.filter(c => c.activo && String(c.id_categoria_gasto_padre) === categoriaRaizSeleccionada);

  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  useEffect(() => {
    if (cajaFija) return; // ya sabemos exactamente qué caja usar, no hace falta consultar
    cajaService.getMisCajasAbiertas()
      .then(r => {
        const cajas = r.data.cajas || [];
        setCajasAbiertas(cajas);
        if (cajas.length === 1) setForm(f => ({ ...f, id_caja: cajas[0].id_caja }));
      })
      .catch(() => {});
  }, [cajaFija]);

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
            <select
              value={categoriaRaizSeleccionada}
              onChange={e => {
                const raizId = e.target.value;
                setCategoriaRaizSeleccionada(raizId);
                const raiz = categorias.find(c => String(c.id_categoria_gasto) === raizId);
                const tieneHijos = categorias.some(c => String(c.id_categoria_gasto_padre) === raizId);
                set('id_categoria_gasto', tieneHijos ? '' : (raiz?.id_categoria_gasto || ''));
              }}
              className={INPUT}
              required
            >
              <option value="">Seleccionar...</option>
              {categorias.filter(c => c.activo && !c.id_categoria_gasto_padre).map(c => (
                <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Subcategoría</label>
            <select
              value={form.id_categoria_gasto}
              onChange={e => set('id_categoria_gasto', e.target.value)}
              className={INPUT}
              disabled={!categoriaRaizSeleccionada || subcategorias.length === 0}
              required={subcategorias.length > 0}
            >
              <option value="">{subcategorias.length ? 'Seleccionar...' : '— Sin subcategorías —'}</option>
              {subcategorias.map(c => (
                <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Sucursal *</label>
          <select value={form.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={INPUT} required disabled={!!cajaFija}>
            {sucursales.map(s => (
              <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {!cajaFija && cajasAbiertas.length > 1 && (
          <div>
            <label className={LABEL}>Caja *</label>
            <select value={form.id_caja} onChange={e => set('id_caja', e.target.value)} className={INPUT} required>
              <option value="">Seleccionar...</option>
              {cajasAbiertas.map(c => (
                <option key={c.id_caja} value={c.id_caja}>{c.caja} ({c.tipo === 'CHICA' ? 'Chica' : 'General'}) — {c.sucursal}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL}>Descripción *</label>
          <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Ej. Compra de material de limpieza" className={INPUT} required autoFocus />
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
