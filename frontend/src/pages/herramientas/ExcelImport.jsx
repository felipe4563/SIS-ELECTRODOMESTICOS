import { useState, useRef } from 'react';
import { herramientasService as svc } from '../../services/herramientas.service';

export default function ExcelImport() {
  const [archivo,   setArchivo]  = useState(null);
  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error,     setError]    = useState(null);
  const [drag,      setDrag]     = useState(false);
  const fileRef = useRef();

  const importar = async () => {
    if (!archivo) return;
    setImporting(true);
    setResultado(null);
    setError(null);
    try {
      const r = await svc.importarProductos(archivo);
      setResultado(r.data);
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setArchivo(f);
      setResultado(null);
      setError(null);
    }
  };

  const resetear = () => {
    setArchivo(null);
    setResultado(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
          📊
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
            Importar Productos desde Excel
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Compatible con lista de precios (MARCA · PRODUCTO · DETALLE…) y plantilla estándar.
            Marcas, categorías y proveedores nuevos se crean automáticamente.
          </p>
        </div>
      </div>

      {/* Preview strip */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="ml-2 text-xs text-zinc-400 font-mono">lista_precios.xlsx</span>
          <span className="ml-auto text-xs text-zinc-500 hidden sm:block">
            MARCA · PRODUCTO · DETALLE · P.PÚBLICO · P.MAYOR
          </span>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-4 space-y-1.5">
          {/* Header row */}
          <div className="h-5 rounded bg-emerald-600/80 flex items-center px-2 gap-2">
            {['MARCA','PRODUCTO','DETALLE','P.PÚBLICO','P.MAYOR'].map(h => (
              <div key={h} className="h-1.5 flex-1 bg-white/40 rounded" />
            ))}
          </div>
          {/* Data rows */}
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-4 rounded flex items-center px-2 gap-2 ${i % 2 === 0 ? 'bg-white dark:bg-zinc-700' : 'bg-zinc-50 dark:bg-zinc-750'}`}>
              <div className="h-1.5 w-14 bg-amber-400/60 rounded flex-shrink-0" />
              <div className="h-1.5 w-24 bg-zinc-300 dark:bg-zinc-500 rounded flex-shrink-0" />
              <div className="h-1.5 flex-1 bg-zinc-200 dark:bg-zinc-600 rounded" />
              <div className="h-1.5 w-12 bg-teal-400/60 rounded flex-shrink-0" />
              <div className="h-1.5 w-12 bg-blue-400/60 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Upload card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-4 space-y-4">

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            className={[
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              drag      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
              : archivo ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-yellow-400',
            ].join(' ')}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                setArchivo(e.target.files?.[0] || null);
                setResultado(null);
                setError(null);
              }}
            />
            <svg
              className={['w-10 h-10 mx-auto mb-3', archivo ? 'text-green-500' : 'text-zinc-400'].join(' ')}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
            {archivo ? (
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">{archivo.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{(archivo.size / 1024).toFixed(1)} KB · haz clic para cambiar</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Arrastra tu Excel aquí o haz clic para buscar</p>
                <p className="text-xs text-zinc-400 mt-1">.xlsx o .xls</p>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          {importing ? (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-yellow-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Importando productos…</span>
            </div>
          ) : (
            <>
              <button
                onClick={importar}
                disabled={!archivo}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Importar productos
              </button>
              {archivo && (
                <button
                  onClick={resetear}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                >
                  Cancelar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">Importación completada</span>
            {resultado.formato && (
              <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                {resultado.formato === 'lista_precios' ? 'Lista de precios' : 'Plantilla estándar'}
              </span>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { v: resultado.creados,            label: 'creados',             color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                { v: resultado.actualizados,       label: 'actualizados',        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                resultado.stockActualizados  > 0 && { v: resultado.stockActualizados,  label: 'stock actualizados', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' },
                resultado.sucursalesCreadas  > 0 && { v: resultado.sucursalesCreadas,  label: 'sucursales nuevas',  color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                resultado.depositosCreados   > 0 && { v: resultado.depositosCreados,   label: 'puntos de venta',    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
                resultado.proveedoresCreados > 0 && { v: resultado.proveedoresCreados, label: 'proveedores nuevos', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
                resultado.marcasCreadas      > 0 && { v: resultado.marcasCreadas,      label: 'marcas nuevas',      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
                resultado.categoriasCreadas  > 0 && { v: resultado.categoriasCreadas,  label: 'categorías nuevas',  color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
                resultado.errores?.length    > 0 && { v: resultado.errores.length,     label: 'errores',            color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
              ].filter(Boolean).map((it, i) => (
                <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${it.color}`}>
                  {it.v} {it.label}
                </span>
              ))}
            </div>

            {resultado.errores?.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                    <tr>
                      {['Fila', 'Campo', 'Error'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-red-700 dark:text-red-300 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                    {resultado.errores.map((e, i) => (
                      <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/10">
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-mono">{e.fila}</td>
                        <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-mono">{e.campo}</td>
                        <td className="px-3 py-1.5 text-red-500 dark:text-red-400">{e.msg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={resetear}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
