import { useState, useEffect } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';

export default function CatalogoPDF() {
  const [marcas,      setMarcas]     = useState([]);
  const [categorias,  setCategorias] = useState([]);
  const [filtros,     setFiltros]    = useState({ id_marca: '', id_categoria: '' });
  const [generando,   setGenerando]  = useState(false);
  const [error,       setError]      = useState(null);

  useEffect(() => {
    svc.getCatalogoMarcas()
      .then(r => setMarcas(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    svc.getCatalogoCategorias()
      .then(r => setCategorias(Array.isArray(r.data) ? r.data : []))
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

  const inputCls = 'w-full border border-zinc-300 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">📄 Catálogo PDF</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Genera un catálogo de productos con precios y stock actual.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Filtrar por marca</label>
            <select
              value={filtros.id_marca}
              onChange={e => setFiltros(f => ({ ...f, id_marca: e.target.value }))}
              className={inputCls}
            >
              <option value="">Todas las marcas</option>
              {marcas.map(m => <option key={m.id_marca} value={m.id_marca}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Filtrar por categoría</label>
            <select
              value={filtros.id_categoria}
              onChange={e => setFiltros(f => ({ ...f, id_categoria: e.target.value }))}
              className={inputCls}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={generar}
          disabled={generando}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {generando ? <span className="animate-spin">⏳</span> : '📄'}
          {generando ? 'Generando…' : 'Generar Catálogo PDF'}
        </button>
      </div>
    </div>
  );
}
