import { useNavigate, useLocation } from 'react-router-dom';
import { FaBolt, FaBuilding, FaSpinner } from 'react-icons/fa';
import logo from '/logo.png';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';

export default function SelectorSucursal() {
  const { usuario, seleccionarSucursal, cargando, error } = useAuth();
  const { actualizar }  = useAbilityUpdater();
  const navigate        = useNavigate();
  const location        = useLocation();
  let destino = location.state?.from?.pathname ?? '/dashboard';
  if (destino === '/login') destino = '/dashboard';

  const sucursales = usuario?.sucursales ?? [];

  const handleSeleccionar = async (id_sucursal) => {
    try {
      await seleccionarSucursal(id_sucursal);
      actualizar(usuario?.permisos ?? []);
      navigate(destino, { replace: true });
    } catch { /* error manejado en AuthContext */ }
  };

  if (!usuario) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">

      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-amber-500/5 rounded-full blur-3xl dark:block hidden" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl dark:shadow-black/50 transition-colors duration-300">

          <div className="flex justify-center mb-8">
            <img src={logo} alt="Megaelectra" className="h-16 sm:h-20 w-auto object-contain" />
          </div>

          <div className="mb-7 text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Seleccionar sucursal
            </h1>
            <p className="text-gray-500 dark:text-slate-500 text-sm mt-1">
              Hola <span className="font-medium text-gray-700 dark:text-slate-300">{usuario.nombres}</span>,
              elige desde qué sucursal trabajarás.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {sucursales.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-slate-500 py-4">
              No tienes sucursales asignadas. Contacta al administrador.
            </p>
          ) : (
            <div className="space-y-3">
              {sucursales.map((s) => (
                <button
                  key={s.id_sucursal}
                  onClick={() => handleSeleccionar(s.id_sucursal)}
                  disabled={cargando}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200
                             text-left
                             bg-gray-50 dark:bg-slate-800
                             border-gray-200 dark:border-slate-700
                             hover:border-amber-400 dark:hover:border-amber-500/60
                             hover:bg-amber-50 dark:hover:bg-amber-500/5
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                    {cargando
                      ? <FaSpinner className="animate-spin h-4 w-4 text-amber-500" />
                      : <FaBuilding className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{s.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{s.codigo}</p>
                  </div>
                  <FaBolt className="ml-auto h-3.5 w-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-gray-400 dark:text-slate-600 text-xs">
            ¿Problemas? Contacta al administrador.
          </p>

        </div>
      </div>
    </div>
  );
}
