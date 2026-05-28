import { useState, useEffect, useRef } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';
import { productosService } from '../../services/productos.service';
import { usePermission } from '../../hooks/usePermission';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtFecha = (d) => d ? new Date(d).toLocaleString('es-BO') : '-';
const cls = (...c) => c.filter(Boolean).join(' ');

function Toast({ msg, tipo = 'ok', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = tipo === 'error'
    ? 'bg-red-600 text-white'
    : 'bg-green-600 text-white';
  return (
    <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 max-w-sm ${bg}`}>
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 text-lg leading-none">✕</button>
    </div>
  );
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'excel',      label: 'Excel',             icon: '📊' },
  { id: 'barras',     label: 'Códigos de Barra',  icon: '📷' },
  { id: 'impresora',  label: 'Impresora',         icon: '🖨️' },
  { id: 'factura',    label: 'Plantilla Factura', icon: '🧾' },
  { id: 'bd',         label: 'Limpiar BD',        icon: '🗑️', perm: 'eliminar_bd' },
];

// ── SECCIÓN EXCEL ─────────────────────────────────────────────────────────────
function SeccionExcel({ toast }) {
  const [archivo,   setArchivo]   = useState(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const importar = async () => {
    if (!archivo) return;
    setImporting(true);
    setResultado(null);
    try {
      const r = await svc.importarProductos(archivo);
      setResultado(r.data);
      const { creados, actualizados, errores } = r.data;
      toast(`✅ ${creados} creados, ${actualizados} actualizados, ${errores.length} errores`, 'ok');
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error al importar', 'error');
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Exportar */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
        <h3 className="font-semibold text-zinc-900 dark:text-white">Exportar productos</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Descarga el catálogo completo o la plantilla vacía para importar.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={svc.urlExportarProductos()}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
          >
            📥 Descargar Catálogo
          </a>
          <a
            href={svc.urlPlantilla()}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            📋 Descargar Plantilla
          </a>
        </div>
      </div>

      {/* Importar */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white">Importar productos</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sube un archivo Excel con el formato de la plantilla. Los productos existentes se actualizarán.</p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-8 text-center cursor-pointer hover:border-yellow-400 transition-colors"
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => setArchivo(e.target.files?.[0] || null)} />
          <p className="text-3xl mb-2">📊</p>
          {archivo
            ? <p className="text-sm font-medium text-zinc-900 dark:text-white">{archivo.name}</p>
            : <p className="text-sm text-zinc-500 dark:text-zinc-400">Haz clic o arrastra el archivo Excel aquí</p>
          }
        </div>

        {archivo && (
          <button
            onClick={importar}
            disabled={importing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {importing ? <><span className="animate-spin">⏳</span> Importando…</> : '⬆️ Importar'}
          </button>
        )}

        {resultado && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                ✅ {resultado.creados} creados
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                🔄 {resultado.actualizados} actualizados
              </span>
              {resultado.errores?.length > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium">
                  ❌ {resultado.errores.length} errores
                </span>
              )}
            </div>
            {resultado.errores?.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-900/20">
                    <tr>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300">Fila</th>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300">Campo</th>
                      <th className="px-3 py-2 text-left text-red-700 dark:text-red-300">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                    {resultado.errores.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400">{e.fila}</td>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-mono">{e.campo}</td>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400">{e.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECCIÓN CÓDIGO DE BARRAS ──────────────────────────────────────────────────
function SeccionBarras({ toast }) {
  const [busqueda,    setBusqueda]    = useState('');
  const [todosProds,  setTodosProds]  = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [copias, setCopias]   = useState(1);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    productosService.getAll()
      .then(r => setTodosProds(r.data.productos || r.data || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const q = busqueda.toLowerCase().trim();
  const productos = q.length >= 2
    ? todosProds.filter(p =>
        p.producto?.toLowerCase().includes(q) ||
        p.codigo_interno?.toLowerCase().includes(q) ||
        p.codigo_barras?.toLowerCase().includes(q)
      ).slice(0, 20)
    : [];

  const toggleSelect = (p) => {
    setSeleccionados(prev =>
      prev.find(x => x.id_producto === p.id_producto)
        ? prev.filter(x => x.id_producto !== p.id_producto)
        : [...prev, p]
    );
  };

  const urlImprimir = seleccionados.length > 0
    ? svc.urlImprimirBarras(seleccionados.map(p => p.id_producto), copias)
    : null;

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white">Generar códigos de barra</h3>

        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto por nombre o código…"
          className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {cargando && <p className="text-sm text-zinc-400 animate-pulse">Cargando productos…</p>}

        {productos.length > 0 && (
          <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-zinc-200 dark:border-zinc-700 p-2">
            {productos.map(p => {
              const sel = seleccionados.find(x => x.id_producto === p.id_producto);
              return (
                <button
                  key={p.id_producto}
                  onClick={() => toggleSelect(p)}
                  className={cls(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    sel
                      ? 'bg-yellow-400/20 border border-yellow-400 text-zinc-900 dark:text-white'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent'
                  )}
                >
                  <span>{sel ? '✅' : '⬜'}</span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 w-24 shrink-0">{p.codigo_interno}</span>
                  <span className="truncate">{p.producto}</span>
                </button>
              );
            })}
          </div>
        )}

        {seleccionados.length > 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">Seleccionados ({seleccionados.length})</p>
              <div className="flex flex-wrap gap-2">
                {seleccionados.map(p => (
                  <span key={p.id_producto}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium">
                    {p.producto.slice(0, 20)}
                    <button onClick={() => toggleSelect(p)} className="hover:opacity-70">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Preview código del primer producto */}
            <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Vista previa</p>
              <img
                src={svc.urlImagenBarras(seleccionados[0].id_producto)}
                alt="Código de barras"
                className="max-w-[280px]"
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span>Copias por producto:</span>
                <input
                  type="number" min={1} max={50} value={copias}
                  onChange={e => setCopias(Math.max(1, Math.min(50, Number(e.target.value))))}
                  className="w-16 border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </label>
              <a
                href={urlImprimir}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors"
              >
                🖨️ Imprimir PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECCIÓN IMPRESORA ─────────────────────────────────────────────────────────
function SeccionImpresora({ toast }) {
  const [form, setForm]     = useState({ nombre: '', puerto: '', tipo: 'TICKET' });
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    svc.getImpresora().then(r => setForm({ nombre: r.data.nombre || '', puerto: r.data.puerto || '', tipo: r.data.tipo || 'TICKET' }))
      .catch(() => {}).finally(() => setLoad(false));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await svc.updateImpresora(form);
      toast('✅ Configuración de impresora guardada', 'ok');
    } catch { toast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-zinc-400 animate-pulse">Cargando…</p>;

  return (
    <form onSubmit={guardar} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-5 max-w-lg">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-white">Configuración de impresora</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Parámetros para la impresora de tickets o A4.</p>
      </div>

      {[
        { label: 'Nombre / IP', key: 'nombre', placeholder: 'ej: 192.168.1.100 o EPSON-TM' },
        { label: 'Puerto',     key: 'puerto', placeholder: 'ej: 9100 o /dev/usb/lp0' },
      ].map(({ label, key, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">{label}</label>
          <input
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Tipo</label>
        <div className="flex gap-3">
          {['TICKET', 'A4'].map(t => (
            <button
              key={t} type="button"
              onClick={() => setForm(f => ({ ...f, tipo: t }))}
              className={cls(
                'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                form.tipo === t
                  ? 'bg-yellow-400 border-yellow-400 text-zinc-900'
                  : 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-yellow-400'
              )}
            >
              {t === 'TICKET' ? '🧾 Ticket' : '📄 A4'}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {saving ? 'Guardando…' : '💾 Guardar Configuración'}
      </button>
    </form>
  );
}

// ── SECCIÓN PLANTILLA FACTURA ─────────────────────────────────────────────────
function SeccionFactura({ toast }) {
  const [form, setForm]     = useState({ encabezado: '', pie_pagina: '', mostrar_logo: true, mostrar_qr: true, color_primario: '#18181b' });
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    svc.getPlantillaFactura().then(r => setForm(prev => ({ ...prev, ...r.data })))
      .catch(() => {}).finally(() => setLoad(false));
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await svc.updatePlantillaFactura(form);
      toast('✅ Plantilla de factura guardada', 'ok');
    } catch { toast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-zinc-400 animate-pulse">Cargando…</p>;

  return (
    <form onSubmit={guardar} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-5 max-w-lg">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-white">Plantilla de Factura / Ticket</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Personaliza el encabezado y pie de página de tus comprobantes.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Encabezado</label>
        <textarea
          value={form.encabezado}
          onChange={e => setForm(f => ({ ...f, encabezado: e.target.value }))}
          rows={3}
          placeholder="Texto que aparece en la parte superior del ticket…"
          className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Pie de página</label>
        <textarea
          value={form.pie_pagina}
          onChange={e => setForm(f => ({ ...f, pie_pagina: e.target.value }))}
          rows={3}
          placeholder="ej: ¡Gracias por su compra! • No se aceptan cambios…"
          className="w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Color primario</label>
          <div className="flex items-center gap-2">
            <input
              type="color" value={form.color_primario}
              onChange={e => setForm(f => ({ ...f, color_primario: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-zinc-300 dark:border-zinc-600 cursor-pointer"
            />
            <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">{form.color_primario}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {[
            { key: 'mostrar_logo', label: 'Mostrar logo' },
            { key: 'mostrar_qr',   label: 'Mostrar QR de pago' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                className={cls(
                  'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
                  form[key] ? 'bg-yellow-400' : 'bg-zinc-300 dark:bg-zinc-600'
                )}
              >
                <span className={cls(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                  form[key] ? 'translate-x-4' : ''
                )} />
              </div>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {saving ? 'Guardando…' : '💾 Guardar Plantilla'}
      </button>
    </form>
  );
}

// ── SECCIÓN ELIMINAR BD ───────────────────────────────────────────────────────
function SeccionEliminarBD({ toast }) {
  const [tablas, setTablas]       = useState([]);
  const [tablaSelec, setTabla]    = useState('');
  const [confirm1, setConfirm1]   = useState(false);
  const [confirmTxt, setConfTxt]  = useState('');
  const [loading, setLoad]        = useState(false);

  useEffect(() => {
    svc.getTablasBorrables().then(r => setTablas(r.data)).catch(() => {});
  }, []);

  const ejecutar = async () => {
    if (confirmTxt !== 'CONFIRMAR BORRADO') {
      toast('El texto de confirmación no coincide', 'error');
      return;
    }
    setLoad(true);
    try {
      const r = await svc.eliminarRegistros(tablaSelec, confirmTxt);
      toast(`✅ ${r.data.eliminados} registros eliminados de "${tablaSelec}"`, 'ok');
      setConfirm1(false);
      setConfTxt('');
      setTabla('');
    } catch (e) {
      toast(e.response?.data?.mensaje || 'Error', 'error');
    } finally { setLoad(false); }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400">Zona Peligrosa — Solo SUPER ADMIN</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">Esta acción elimina registros permanentemente y queda registrada en auditoría.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1.5">Selecciona la tabla a limpiar</label>
          <select
            value={tablaSelec}
            onChange={e => { setTabla(e.target.value); setConfirm1(false); setConfTxt(''); }}
            className="w-full border border-red-300 dark:border-red-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <option value="">-- Seleccionar tabla --</option>
            {tablas.map(t => (
              <option key={t.tabla} value={t.tabla}>{t.label} ({t.tabla})</option>
            ))}
          </select>
        </div>

        {tablaSelec && !confirm1 && (
          <button
            onClick={() => setConfirm1(true)}
            className="px-5 py-2.5 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Continuar con la eliminación →
          </button>
        )}

        {tablaSelec && confirm1 && (
          <div className="space-y-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Para confirmar, escribe exactamente: <code className="font-mono font-bold">CONFIRMAR BORRADO</code>
            </p>
            <input
              value={confirmTxt}
              onChange={e => setConfTxt(e.target.value)}
              placeholder="CONFIRMAR BORRADO"
              className="w-full border border-red-300 dark:border-red-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
            />
            <div className="flex gap-3">
              <button
                onClick={ejecutar}
                disabled={loading || confirmTxt !== 'CONFIRMAR BORRADO'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? '⏳ Eliminando…' : '🗑️ Eliminar registros'}
              </button>
              <button
                onClick={() => { setConfirm1(false); setConfTxt(''); }}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Herramientas() {
  const [tab, setTab]     = useState('excel');
  const [toast, setToast] = useState(null);
  const { puede }         = usePermission();

  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo });

  const tabsVisibles = TABS.filter(t => !t.perm || puede(t.perm, 'herramientas'));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">🛠️ Herramientas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Funcionalidades administrativas y de mantenimiento del sistema.
        </p>
      </div>

      {/* Tabs — scroll horizontal en mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max sm:min-w-0 sm:flex-wrap bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
          {tabsVisibles.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cls(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                tab === t.id
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              )}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 sm:p-6">
        {tab === 'excel'     && <SeccionExcel     toast={showToast} />}
        {tab === 'barras'    && <SeccionBarras    toast={showToast} />}
        {tab === 'impresora' && <SeccionImpresora toast={showToast} />}
        {tab === 'factura'   && <SeccionFactura   toast={showToast} />}
        {tab === 'bd'        && puede('eliminar_bd', 'herramientas') && <SeccionEliminarBD toast={showToast} />}
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
    </div>
  );
}
