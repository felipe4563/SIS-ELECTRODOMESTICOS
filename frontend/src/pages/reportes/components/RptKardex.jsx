import { useState, useEffect } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmtN, fmt, FiltroFechas, Tabla, EfectoBadge } from './ReportesShared';

export default function RptKardex() {
  const [busqueda, setBusqueda]     = useState('');
  const [productos, setProductos]   = useState([]);
  const [seleccionado, setSelec]    = useState(null);
  const [filtros, setFiltros]       = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]             = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [cargandoProds, setCargP]   = useState(false);

  useEffect(() => {
    if (busqueda.length < 2) { setProductos([]); return; }
    setCargP(true);
    import('../../../services/productos.service').then(m => {
      m.productosService.getAll()
        .then(r => {
          const todos = r.data?.productos || r.data || [];
          const q = busqueda.toLowerCase();
          setProductos(todos.filter(p =>
            p.producto?.toLowerCase().includes(q) || p.codigo_interno?.toLowerCase().includes(q)
          ).slice(0, 20));
          setCargP(false);
        })
        .catch(() => setCargP(false));
    });
  }, [busqueda]);

  const consultar = (prod) => {
    setSelec(prod);
    setBusqueda('');
    setProductos([]);
    setCargando(true);
    reportesService.getKardexProducto(prod.id_producto, filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  };

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const cols = [
    { key: 'fecha',            label: 'Fecha' },
    { key: 'tipo_movimiento',  label: 'Tipo',        bold: true },
    { key: 'efecto',           label: 'Efecto',      render: v => <EfectoBadge efecto={v} /> },
    { key: 'deposito',         label: 'Depósito' },
    { key: 'cantidad',         label: 'Cantidad',    align: 'right', render: v => fmtN(v) },
    { key: 'costo_unitario',   label: 'Costo Unit.', align: 'right', render: v => fmt(v) },
    { key: 'saldo_cantidad',   label: 'Saldo Cant.', align: 'right', render: v => fmtN(v) },
    { key: 'documento_tipo',   label: 'Doc. Tipo' },
    { key: 'documento_numero', label: 'Doc. N°' },
    { key: 'usuario',          label: 'Usuario' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Buscar producto</label>
          <input
            type="text"
            value={seleccionado && !busqueda ? `${seleccionado.codigo_interno} – ${seleccionado.producto}` : busqueda}
            onChange={e => { setBusqueda(e.target.value); setSelec(null); }}
            placeholder="Nombre o código..."
            className="w-64 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400"
          />
          {productos.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
              {cargandoProds && <div className="px-3 py-2 text-xs text-zinc-400">Buscando...</div>}
              {productos.map(p => (
                <button key={p.id_producto} onClick={() => consultar(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <span className="font-mono text-xs text-zinc-400 mr-2">{p.codigo_interno}</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{p.producto}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <FiltroFechas filtros={filtros} onChange={f} />
        {seleccionado && (
          <button onClick={() => consultar(seleccionado)}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
            Actualizar
          </button>
        )}
      </div>

      {!seleccionado && !data && (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">Busca y selecciona un producto para ver su kardex</p>
      )}
      {data && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-white">{data.producto?.producto}</p>
              <p className="text-xs text-zinc-400">{data.producto?.codigo_interno} · {data.movimientos?.length} movimientos</p>
            </div>
          </div>
          <Tabla columnas={cols} filas={data.movimientos || []} cargando={cargando} vacio="Sin movimientos en el período" />
        </>
      )}
    </div>
  );
}
