import { useState, useEffect } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';

export default function CatalogoPDF() {
  const [marcas,      setMarcas]      = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [sucursales,  setSucursales]  = useState([]);
  const [filtros,     setFiltros]     = useState({ id_marca: '', id_categoria: '', id_sucursal: '' });
  const [generando,   setGenerando]   = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    svc.getCatalogoMarcas()
      .then(r => setMarcas(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    svc.getCatalogoCategorias()
      .then(r => setCategorias(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    svc.getCatalogoSucursales()
      .then(r => setSucursales(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const generar = async () => {
    setGenerando(true);
    setError(null);
    try {
      const res = await svc.getCatalogoPDF(filtros);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al generar el catálogo');
    } finally {
      setGenerando(false);
    }
  };

  const limpiar   = () => setFiltros({ id_marca: '', id_categoria: '', id_sucursal: '' });
  const hayFiltros = filtros.id_marca || filtros.id_categoria || filtros.id_sucursal;

  const selectCls = [
    'w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2',
    'text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white',
    'focus:outline-none focus:ring-2 focus:ring-amber-400 transition',
  ].join(' ');

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
          📄
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            PDF listo para entregar a vendedores — solo productos con stock disponible, agrupados por categoría.
          </p>
        </div>
      </div>

      {/* PDF preview strip */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="ml-2 text-xs text-zinc-400 font-mono">catalogo.pdf</span>
          <span className="ml-auto text-xs text-zinc-500 hidden sm:block">
            Código · Producto · P.Público · P.Mayor · Bono · Stock
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 space-y-2">
          {/* Simulated PDF header */}
          <div className="h-10 rounded bg-zinc-900 flex items-center px-3 gap-3">
            <div className="w-6 h-6 rounded bg-amber-400/30 flex-shrink-0" />
            <div className="space-y-1 flex-1">
              <div className="h-1.5 w-28 bg-amber-400/60 rounded" />
              <div className="h-2 w-36 bg-white/40 rounded" />
            </div>
            <div className="h-1 w-10 bg-zinc-600 rounded" />
          </div>
          {/* Category row */}
          <div className="h-4 rounded bg-amber-400/80 flex items-center px-2">
            <div className="w-1 h-full bg-amber-600 rounded mr-2 flex-shrink-0" />
            <div className="h-1 w-20 bg-amber-900/40 rounded" />
          </div>
          {/* Table rows */}
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-3.5 rounded flex items-center px-2 gap-2 ${i % 2 === 0 ? 'bg-white dark:bg-zinc-700' : 'bg-zinc-50 dark:bg-zinc-750'}`}>
              <div className="h-1 w-10 bg-zinc-300 dark:bg-zinc-500 rounded flex-shrink-0" />
              <div className="h-1 w-24 bg-zinc-300 dark:bg-zinc-500 rounded flex-shrink-0" />
              <div className="h-1 flex-1" />
              <div className="h-1 w-12 bg-teal-400/60 rounded flex-shrink-0" />
              <div className="h-1 w-10 bg-blue-400/60 rounded flex-shrink-0" />
              <div className="h-1 w-8 bg-zinc-400/60 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter + action card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">

        {/* Filters */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Filtros</span>
            {hayFiltros && (
              <button
                onClick={limpiar}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Sucursal
              </label>
              <select
                value={filtros.id_sucursal}
                onChange={e => setFiltros(f => ({ ...f, id_sucursal: e.target.value }))}
                className={selectCls}
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(s => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>
                    {s.nombre}{s.tipo === 'PRINCIPAL' ? ' (Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Marca
              </label>
              <select
                value={filtros.id_marca}
                onChange={e => setFiltros(f => ({ ...f, id_marca: e.target.value }))}
                className={selectCls}
              >
                <option value="">Todas las marcas</option>
                {marcas.map(m => (
                  <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Categoría
              </label>
              <select
                value={filtros.id_categoria}
                onChange={e => setFiltros(f => ({ ...f, id_categoria: e.target.value }))}
                className={selectCls}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {hayFiltros && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {filtros.id_sucursal && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium">
                {sucursales.find(s => String(s.id_sucursal) === filtros.id_sucursal)?.nombre}
                <button
                  onClick={() => setFiltros(f => ({ ...f, id_sucursal: '' }))}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition"
                >×</button>
              </span>
            )}
            {filtros.id_marca && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-medium">
                {marcas.find(m => String(m.id_marca) === filtros.id_marca)?.nombre}
                <button
                  onClick={() => setFiltros(f => ({ ...f, id_marca: '' }))}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition"
                >×</button>
              </span>
            )}
            {filtros.id_categoria && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
                {categorias.find(c => String(c.id_categoria) === filtros.id_categoria)?.nombre}
                <button
                  onClick={() => setFiltros(f => ({ ...f, id_categoria: '' }))}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition"
                >×</button>
              </span>
            )}
          </div>
        )}

        {/* Divider + action */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            onClick={generar}
            disabled={generando}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {generando ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <span>📄</span>
                Generar catálogo PDF
              </>
            )}
          </button>
          {!generando && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Se abrirá en una nueva pestaña
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
