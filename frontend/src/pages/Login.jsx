import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaLock, FaSpinner, FaEye, FaEyeSlash, FaBolt, FaUser } from 'react-icons/fa';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';

const BACKEND = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');

export default function Login() {
  const [identificador,     setIdentificador]     = useState('');
  const [contrasena,        setContrasena]        = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [logoSrc,           setLogoSrc]           = useState('/logo.png');

  const { login, cargando, error } = useAuth();
  const { actualizar }             = useAbilityUpdater();
  const navigate                   = useNavigate();
  const location                   = useLocation();
  const destino = location.state?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    fetch(`${BACKEND}/api/empresa/publico`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.logo_url) {
          setLogoSrc(d.logo_url.startsWith('http') ? d.logo_url : BACKEND + d.logo_url);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identificador || !contrasena) return;
    try {
      const usuario = await login(identificador.trim(), contrasena);
      actualizar(usuario.permisos ?? []);
      if (usuario.debe_cambiar_pass) {
        navigate('/cambiar-contrasena', { replace: true });
      } else if ((usuario.sucursales?.length ?? 0) > 1) {
        navigate('/seleccionar-sucursal', { replace: true, state: { from: location.state?.from } });
      } else {
        navigate(destino, { replace: true });
      }
    } catch { /* error manejado en AuthContext */ }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">

      {/* Glow de fondo (solo dark) */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-amber-500/5 rounded-full blur-3xl dark:block hidden" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Tarjeta */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl dark:shadow-black/50 transition-colors duration-300">

          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logoSrc} alt="Megaelectra" className="h-16 sm:h-20 w-auto object-contain" onError={(e) => { e.target.src = '/logo.png'; }} />
          </div>

          {/* Encabezado */}
          <div className="mb-7 text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Iniciar sesión
            </h1>
            <p className="text-gray-500 dark:text-slate-500 text-sm mt-1">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Identificador */}
            <div className="space-y-1.5">
              <label htmlFor="identificador" className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                Correo electrónico o cédula
              </label>
              <div className="relative">
                <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="identificador"
                  type="text"
                  value={identificador}
                  onChange={e => setIdentificador(e.target.value)}
                  placeholder="correo@ejemplo.com o CI"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors
                             bg-gray-50 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="contrasena" className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                Contraseña
              </label>
              <div className="relative">
                <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={e => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-colors
                             bg-gray-50 dark:bg-slate-800
                             border border-gray-200 dark:border-slate-700
                             text-gray-900 dark:text-white
                             placeholder-gray-400 dark:placeholder-slate-600
                             focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                >
                  {mostrarContrasena
                    ? <FaEyeSlash className="h-3.5 w-3.5" />
                    : <FaEye     className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando || !identificador || !contrasena}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                         bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         text-white dark:text-slate-900
                         shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
            >
              {cargando ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4" />
                  Verificando...
                </>
              ) : (
                <>
                  <FaBolt className="h-3.5 w-3.5" />
                  Ingresar
                </>
              )}
            </button>

          </form>

          <p className="mt-6 text-center text-gray-400 dark:text-slate-600 text-xs">
            ¿Problemas para acceder? Contacta al administrador.
          </p>

        </div>
      </div>
    </div>
  );
}
