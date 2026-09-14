import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cajaService } from '../../services/caja.service';
import { cobrosService } from '../../services/cobros.service';
import { bancosService } from '../../services/configuracion.service';
import { usePermission } from '../../hooks/usePermission';

const fmt = (n) => Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 });

function Spinner() {
  return <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-yellow-400 rounded-full animate-spin" />;
}

const COLORES = {
  azul:     { bg: 'bg-blue-50 dark:bg-blue-900/20',     texto: 'text-blue-600 dark:text-blue-400',     barra: 'bg-blue-500' },
  verde:    { bg: 'bg-green-50 dark:bg-green-900/20',   texto: 'text-green-600 dark:text-green-400',   barra: 'bg-green-500' },
  ambar:    { bg: 'bg-amber-50 dark:bg-amber-900/20',   texto: 'text-amber-600 dark:text-amber-400',   barra: 'bg-amber-500' },
  morado:   { bg: 'bg-purple-50 dark:bg-purple-900/20', texto: 'text-purple-600 dark:text-purple-400', barra: 'bg-purple-500' },
};

function Chip({ children, tono = 'zinc' }) {
  const tonos = {
    zinc:  'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
    verde: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    rojo:  'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300',
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${tonos[tono]}`}>{children}</span>;
}

function Tarjeta({ color, icono, titulo, subtitulo, to, cargando, error, statPrincipal, statLabel, children }) {
  const c = COLORES[color];
  return (
    <Link
      to={to}
      className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-yellow-400 dark:hover:border-yellow-500/60 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${c.bg}`}>{icono}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">{titulo}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitulo}</p>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 text-zinc-400 mt-5 mb-2"><Spinner /><span className="text-xs">Cargando...</span></div>
      ) : error ? (
        <p className="text-xs text-red-500 mt-5">Error al cargar</p>
      ) : (
        <>
          <div className="mt-4">
            <p className={`text-2xl font-bold font-mono ${c.texto}`}>{statPrincipal}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{statLabel}</p>
          </div>
          {children && <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 flex-1">{children}</div>}
        </>
      )}
    </Link>
  );
}

export default function ResumenCajas() {
  const { puede } = usePermission();

  const vePuedeCaja = puede('ver', 'caja');
  const puedeCobros = puede('ver', 'cobros');
  const puedeBancos = puede('ver', 'bancos');

  const [cargandoCaja, setCargandoCaja] = useState(vePuedeCaja);
  const [errorCaja, setErrorCaja]       = useState(false);
  const [general, setGeneral] = useState(null);
  const [chica, setChica]     = useState(null);

  const [cargandoCobros, setCargandoCobros] = useState(puedeCobros);
  const [errorCobros, setErrorCobros]       = useState(false);
  const [cobros, setCobros] = useState(null);

  const [cargandoBancos, setCargandoBancos] = useState(puedeBancos);
  const [errorBancos, setErrorBancos]       = useState(false);
  const [bancos, setBancos] = useState(null);

  useEffect(() => {
    if (!vePuedeCaja) return;
    cajaService.getCajas()
      .then(async (r) => {
        const cajas = r.data.cajas || [];
        const generales = cajas.filter(c => c.tipo !== 'CHICA');
        const chicas     = cajas.filter(c => c.tipo === 'CHICA');
        const abiertasGenerales = generales.filter(c => c.id_arqueo);
        const chicasAbiertas    = chicas.filter(c => c.id_arqueo);

        setGeneral({
          totalCajas: generales.length,
          abiertas: abiertasGenerales.length,
          montoApertura: abiertasGenerales.reduce((s, c) => s + Number(c.monto_apertura || 0), 0),
          detalle: generales,
        });

        const saldos = await Promise.all(
          chicasAbiertas.map(c => cajaService.getSaldoActual(c.id_caja).then(r => ({ id_caja: c.id_caja, ...r.data })).catch(() => null))
        );
        const validos = saldos.filter(Boolean);
        const porCaja = new Map(validos.map(v => [v.id_caja, v]));

        setChica({
          totalCajas: chicas.length,
          abiertas: chicasAbiertas.length,
          saldoActual: validos.reduce((s, v) => s + Number(v.saldo_actual || 0), 0),
          fondoFijo: validos.reduce((s, v) => s + Number(v.monto_fondo_fijo || 0), 0),
          detalle: chicas.map(c => ({ ...c, saldo: porCaja.get(c.id_caja)?.saldo_actual ?? null })),
        });
      })
      .catch(() => setErrorCaja(true))
      .finally(() => setCargandoCaja(false));
  }, [vePuedeCaja]);

  useEffect(() => {
    if (!puedeCobros) return;
    cobrosService.getCuentasPorCobrar()
      .then(r => {
        const rows = r.data || [];
        setCobros({
          clientes: rows.length,
          totalPendiente: rows.reduce((s, c) => s + Number(c.total_pendiente || 0), 0),
          top: [...rows].sort((a, b) => b.total_pendiente - a.total_pendiente).slice(0, 3),
        });
      })
      .catch(() => setErrorCobros(true))
      .finally(() => setCargandoCobros(false));
  }, [puedeCobros]);

  useEffect(() => {
    if (!puedeBancos) return;
    bancosService.getAll()
      .then(r => {
        const rows = r.data.bancos || [];
        setBancos({ total: rows.length, lista: rows.slice(0, 6) });
      })
      .catch(() => setErrorBancos(true))
      .finally(() => setCargandoBancos(false));
  }, [puedeBancos]);

  const nombreCliente = (c) => c.razon_social || `${c.nombres || ''} ${c.apellidos || ''}`.trim();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Resumen de Cajas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Vista general de las cajas y cuentas de la empresa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {vePuedeCaja && (
          <Tarjeta
            color="azul" icono="🏦" titulo="Caja General / Punto de Venta" subtitulo="Efectivo del día a día" to="/caja"
            cargando={cargandoCaja} error={errorCaja}
            statPrincipal={`Bs ${fmt(general?.montoApertura)}`}
            statLabel={`Monto de apertura · ${general?.abiertas ?? 0} de ${general?.totalCajas ?? 0} abiertas`}
          >
            {general?.detalle?.map(c => (
              <div key={c.id_caja} className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{c.nombre} <span className="text-zinc-400 dark:text-zinc-500">· {c.sucursal}</span></span>
                <Chip tono={c.id_arqueo ? 'verde' : 'zinc'}>{c.id_arqueo ? 'Abierta' : 'Cerrada'}</Chip>
              </div>
            ))}
            {general?.detalle?.length === 0 && <p className="text-xs text-zinc-400">Sin cajas registradas</p>}
          </Tarjeta>
        )}

        {vePuedeCaja && (
          <Tarjeta
            color="verde" icono="💵" titulo="Caja Chica" subtitulo="Fondo fijo para gastos menores" to="/caja"
            cargando={cargandoCaja} error={errorCaja}
            statPrincipal={`Bs ${fmt(chica?.saldoActual)}`}
            statLabel={`Saldo actual de Bs ${fmt(chica?.fondoFijo)} de fondo fijo`}
          >
            {chica?.fondoFijo > 0 && (
              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-2">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min(100, (chica.saldoActual / chica.fondoFijo) * 100)}%` }}
                />
              </div>
            )}
            {chica?.detalle?.map(c => (
              <div key={c.id_caja} className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{c.nombre} <span className="text-zinc-400 dark:text-zinc-500">· {c.sucursal}</span></span>
                {c.id_arqueo
                  ? <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-200">Bs {fmt(c.saldo)}</span>
                  : <Chip>Cerrada</Chip>}
              </div>
            ))}
            {chica?.detalle?.length === 0 && <p className="text-xs text-zinc-400">Sin cajas chicas registradas</p>}
          </Tarjeta>
        )}

        {puedeCobros && (
          <Tarjeta
            color="ambar" icono="🧾" titulo="Cuentas por Cobrar" subtitulo="Ventas a crédito pendientes" to="/cobros"
            cargando={cargandoCobros} error={errorCobros}
            statPrincipal={`Bs ${fmt(cobros?.totalPendiente)}`}
            statLabel={`${cobros?.clientes ?? 0} cliente${cobros?.clientes === 1 ? '' : 's'} con saldo pendiente`}
          >
            {cobros?.top?.map(c => (
              <div key={c.id_cliente} className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{nombreCliente(c)}</span>
                <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-200">Bs {fmt(c.total_pendiente)}</span>
              </div>
            ))}
            {cobros?.top?.length === 0 && <p className="text-xs text-zinc-400">Sin cuentas pendientes</p>}
          </Tarjeta>
        )}

        {puedeBancos && (
          <Tarjeta
            color="morado" icono="🏧" titulo="Bancos" subtitulo="Catálogo de bancos registrados" to="/configuracion/bancos"
            cargando={cargandoBancos} error={errorBancos}
            statPrincipal={bancos?.total ?? 0}
            statLabel="Bancos registrados en el catálogo"
          >
            {bancos?.lista?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {bancos.lista.map(b => <Chip key={b.id_banco}>{b.sigla || b.nombre}</Chip>)}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Sin bancos registrados</p>
            )}
          </Tarjeta>
        )}
      </div>

      {!vePuedeCaja && !puedeCobros && !puedeBancos && (
        <div className="text-center py-16 text-sm text-zinc-400">No tienes permisos para ver ningún módulo de caja.</div>
      )}
    </div>
  );
}
