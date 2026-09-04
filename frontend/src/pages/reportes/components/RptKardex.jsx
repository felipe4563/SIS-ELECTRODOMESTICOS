import { useState, useMemo } from 'react';
import { inventarioService } from '../../../services/inventario.service';
import { hoy, inicioMes, fmtN, fmt, FiltroFechas, Tabla, EfectoBadge } from './ReportesShared';
import { useEmpresa } from '../../../contexts/EmpresaContext';
import { exportarKardexPDF } from './RptKardexPDF';

export default function RptKardex() {
  const { empresa } = useEmpresa();

  const [filtros, setFiltros] = useState({
    fecha_desde: inicioMes(),
    fecha_hasta: hoy(),
    id_producto: '',
    id_deposito: '',
  });

  // Datos crudos — todos los movimientos (sin filtros de backend)
  const [rawMovs, setRawMovs]     = useState([]);
  const [cargando, setCargando]   = useState(false);
  const [consultado, setConsult]  = useState(false);
  const [exportando, setExport]   = useState(false);

  // Catálogos derivados de los datos cargados
  const [listaProductos, setListaProds] = useState([]);
  const [listaDepositos, setListaDeps]  = useState([]);

  const consultar = () => {
    setCargando(true);
    inventarioService.getKardex({ limit: 200 })
      .then(r => {
        const movs = r.data?.kardex ?? [];
        setRawMovs(movs);

        // Derivar listas únicas de productos y depósitos presentes en el kardex
        const prodsMap = {};
        const depsMap  = {};
        for (const m of movs) {
          if (m.id_producto && !prodsMap[m.id_producto]) {
            prodsMap[m.id_producto] = {
              id:     m.id_producto,
              nombre: m.producto_nombre,
              codigo: m.codigo_interno,
            };
          }
          if (m.id_deposito && !depsMap[m.id_deposito]) {
            depsMap[m.id_deposito] = {
              id:     m.id_deposito,
              nombre: m.deposito_nombre,
              codigo: m.deposito_codigo,
            };
          }
        }
        setListaProds(Object.values(prodsMap).sort((a, b) => a.nombre?.localeCompare(b.nombre)));
        setListaDeps(Object.values(depsMap).sort((a, b)  => a.nombre?.localeCompare(b.nombre)));
        setConsult(true);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  };

  // Filtrado client-side puro
  const movsFiltrados = useMemo(() => {
    return rawMovs.filter(m => {
      const fecha = m.fecha?.slice(0, 10) ?? '';
      if (filtros.fecha_desde && fecha < filtros.fecha_desde) return false;
      if (filtros.fecha_hasta && fecha > filtros.fecha_hasta) return false;
      if (filtros.id_producto && String(m.id_producto) !== String(filtros.id_producto)) return false;
      if (filtros.id_deposito && String(m.id_deposito) !== String(filtros.id_deposito)) return false;
      return true;
    });
  }, [rawMovs, filtros]);

  const exportarPDF = async () => {
    if (!movsFiltrados.length) return;
    setExport(true);
    try {
      // Mapear campos de inventario al formato que espera el PDF
      const movsPDF = movsFiltrados.map(m => ({
        id_kardex:        m.id_kardex,
        fecha:            m.fecha,
        tipo_movimiento:  m.tipo_movimiento,
        efecto:           m.efecto,
        deposito:         m.deposito_nombre,
        cantidad:         m.cantidad,
        costo_unitario:   m.costo_unitario,
        saldo_cantidad:   m.saldo_cantidad,
        saldo_costo:      m.saldo_costo,
        documento_tipo:   m.documento_tipo,
        documento_numero: m.documento_numero,
        observaciones:    m.observaciones,
        usuario:          [m.usuario_nombres, m.usuario_apellidos].filter(Boolean).join(' ') || null,
      }));

      const prodSelec = filtros.id_producto
        ? listaProductos.find(p => String(p.id) === String(filtros.id_producto))
        : null;

      await exportarKardexPDF({
        movimientos: movsPDF,
        producto:    prodSelec ? { producto: prodSelec.nombre, codigo_interno: prodSelec.codigo } : null,
        empresa,
        filtros,
      });
    } catch { /* silencioso */ }
    finally { setExport(false); }
  };

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  /* ── Métricas ── */
  const totalEntradas = movsFiltrados
    .filter(m => m.efecto === 'ENTRADA')
    .reduce((a, m) => a + Number(m.cantidad ?? 0), 0);
  const totalSalidas = movsFiltrados
    .filter(m => m.efecto === 'SALIDA')
    .reduce((a, m) => a + Number(m.cantidad ?? 0), 0);

  const cols = [
    { key: 'fecha',            label: 'Fecha / Hora' },
    { key: 'tipo_movimiento',  label: 'Tipo',         bold: true },
    { key: 'efecto',           label: 'Efecto',        render: v => <EfectoBadge efecto={v} /> },
    { key: 'producto_nombre',  label: 'Producto',
      render: (v, row) => (
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">{v}</p>
          <p className="text-[11px] font-mono text-zinc-400">{row.codigo_interno}</p>
        </div>
      ),
    },
    { key: 'deposito_nombre',  label: 'Depósito' },
    {
      key: 'cantidad', label: 'Cantidad', align: 'right',
      render: (v, row) => {
        const n   = Number(v ?? 0);
        const esE = row.efecto === 'ENTRADA';
        const esS = row.efecto === 'SALIDA';
        return (
          <span className={`font-mono font-semibold ${esE ? 'text-green-600 dark:text-green-400' : esS ? 'text-red-600 dark:text-red-400' : ''}`}>
            {esE ? '+' : esS ? '−' : ''}{fmtN(Math.abs(n))}
          </span>
        );
      },
    },
    { key: 'costo_unitario',  label: 'Costo Unit.', align: 'right', render: v => fmt(v) },
    {
      key: 'saldo_cantidad', label: 'Saldo Cant.', align: 'right',
      render: v => <span className="font-semibold text-zinc-900 dark:text-white">{fmtN(v)}</span>,
    },
    { key: 'saldo_costo',      label: 'Saldo Costo',  align: 'right', render: v => fmt(v) },
    { key: 'documento_tipo',   label: 'Doc. Tipo' },
    { key: 'documento_numero', label: 'Doc. N°',      render: v => v ? <span className="font-mono text-xs">{v}</span> : '—' },
    {
      key: 'usuario_nombres', label: 'Usuario',
      render: (v, row) => [v, row.usuario_apellidos].filter(Boolean).join(' ') || '—',
    },
    {
      key: 'observaciones', label: 'Observaciones',
      render: v => v ? <span className="text-zinc-400 italic text-xs">{v}</span> : '—',
    },
  ];

  return (
    <div className="space-y-4">

      {/* ── Fila superior: botón Consultar ── */}
      <div className="flex flex-wrap gap-3 items-end">
        <button
          onClick={consultar}
          disabled={cargando}
          className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
        >
          {cargando ? 'Cargando…' : consultado ? 'Recargar todo' : 'Cargar kardex'}
        </button>

        {consultado && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 self-center">
            {rawMovs.length} movimientos cargados
            {movsFiltrados.length !== rawMovs.length && ` · ${movsFiltrados.length} visibles`}
          </p>
        )}

        {movsFiltrados.length > 0 && (
          <button
            onClick={exportarPDF}
            disabled={exportando}
            className="ml-auto px-3 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 font-semibold text-sm rounded-xl transition-colors border border-red-200 dark:border-red-500/30 flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {exportando ? 'Generando…' : 'PDF'}
          </button>
        )}
      </div>

      {/* ── Filtros (solo visibles después de cargar) ── */}
      {consultado && (
        <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-3">Filtros</p>
          <div className="flex flex-wrap gap-3 items-end">

            {/* Producto */}
            <div className="w-full sm:w-72">
              <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Producto</label>
              <select
                value={filtros.id_producto}
                onChange={e => f('id_producto', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">Todos los productos</option>
                {listaProductos.map(p => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Depósito */}
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1">Depósito</label>
              <select
                value={filtros.id_deposito}
                onChange={e => f('id_deposito', e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">Todos</option>
                {listaDepositos.map(d => (
                  <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>
                ))}
              </select>
            </div>

            {/* Fechas */}
            <FiltroFechas filtros={filtros} onChange={f} />

            {/* Limpiar filtros */}
            {(filtros.id_producto || filtros.id_deposito ||
              filtros.fecha_desde !== inicioMes() || filtros.fecha_hasta !== hoy()) && (
              <button
                onClick={() => setFiltros({ fecha_desde: inicioMes(), fecha_hasta: hoy(), id_producto: '', id_deposito: '' })}
                className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Estado inicial ── */}
      {!consultado && !cargando && (
        <p className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
          Presiona "Cargar kardex" para traer todos los movimientos y luego filtrar
        </p>
      )}

      {/* ── Métricas + tabla ── */}
      {consultado && (
        <>
          <div className="flex flex-wrap items-center gap-5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm">
            <div className="text-center">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Entradas</p>
              <p className="font-semibold text-green-600 dark:text-green-400 font-mono">+{fmtN(totalEntradas)}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Salidas</p>
              <p className="font-semibold text-red-600 dark:text-red-400 font-mono">−{fmtN(totalSalidas)}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Movimientos</p>
              <p className="font-semibold text-zinc-900 dark:text-white">{movsFiltrados.length}</p>
            </div>
          </div>

          <Tabla
            columnas={cols}
            filas={movsFiltrados}
            cargando={cargando}
            vacio="Sin movimientos para los filtros seleccionados"
          />
        </>
      )}
    </div>
  );
}
