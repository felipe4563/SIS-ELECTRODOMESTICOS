import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  empresaService,
  sucursalesService,
  depositosService,
  monedasService,
  tiposCambioService,
  bancosService,
  impuestosService,
} from '../../services/configuracion.service';
import PageHeader from '../../components/ui/PageHeader';

const SECCIONES = [
  { key: 'empresa',      label: 'Empresa',        icono: '🏢', path: '/configuracion/empresa' },
  { key: 'sucursales',   label: 'Sucursales',      icono: '🏪', path: '/configuracion/sucursales' },
  { key: 'depositos',    label: 'Depósitos',       icono: '🏭', path: '/configuracion/depositos' },
  { key: 'monedas',      label: 'Monedas',         icono: '💱', path: '/configuracion/monedas' },
  { key: 'tipos_cambio', label: 'Tipos de cambio', icono: '📈', path: '/configuracion/tipos-cambio' },
  { key: 'bancos',       label: 'Bancos',          icono: '🏦', path: '/configuracion/bancos' },
  { key: 'impuestos',    label: 'Impuestos',       icono: '💲', path: '/configuracion/impuestos' },
];

const INIT = { empresa: null, sucursales: null, depositos: null, monedas: null, tipos_cambio: null, bancos: null, impuestos: null };

export default function ConfiguracionIndex() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState(INIT);

  useEffect(() => {
    async function cargar() {
      const [emp, suc, dep, mon, tc, ban, imp] = await Promise.allSettled([
        empresaService.get(),
        sucursalesService.getAll(),
        depositosService.getAll(),
        monedasService.getAll(),
        tiposCambioService.getAll(),
        bancosService.getAll(),
        impuestosService.getAll(),
      ]);

      setEstado({
        empresa:      emp.status === 'fulfilled' && !!(emp.value.data?.empresa?.razon_social && emp.value.data?.empresa?.nit),
        sucursales:   suc.status === 'fulfilled' && (suc.value.data?.sucursales?.length  ?? 0) > 0,
        depositos:    dep.status === 'fulfilled' && (dep.value.data?.depositos?.length   ?? 0) > 0,
        monedas:      mon.status === 'fulfilled' && (mon.value.data?.monedas?.length     ?? 0) > 0,
        tipos_cambio: tc.status  === 'fulfilled' && (tc.value.data?.tipos_cambio?.length ?? 0) > 0,
        bancos:       ban.status === 'fulfilled' && (ban.value.data?.bancos?.length      ?? 0) > 0,
        impuestos:    imp.status === 'fulfilled' && (imp.value.data?.impuestos?.length   ?? 0) > 0,
      });
    }
    cargar();
  }, []);

  return (
    <div>
      <PageHeader
        titulo="Configuración del sistema"
        subtitulo="Revisa y gestiona los datos base del sistema"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {SECCIONES.map(sec => (
          <div
            key={sec.key}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{sec.icono}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{sec.label}</p>
                {estado[sec.key] === null  && <span className="text-xs text-gray-400 dark:text-zinc-500">Verificando...</span>}
                {estado[sec.key] === true  && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✅ Configurado</span>}
                {estado[sec.key] === false && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ Pendiente</span>}
              </div>
            </div>
            <button
              onClick={() => navigate(sec.path)}
              className="w-full py-2 px-4 rounded-xl text-sm font-semibold transition-colors
                         bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         text-white dark:text-slate-900"
            >
              Gestionar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
