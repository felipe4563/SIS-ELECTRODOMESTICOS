import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaSpinner, FaShieldAlt } from 'react-icons/fa';
import { useAuth }           from '../contexts/AuthContext';
import { useAbilityUpdater } from '../contexts/AbilityContext';
import authService           from '../services/auth.service';
import logo                  from '/logo.png';
import { AbilityContext }    from '../contexts/AbilityContext';
import { redirigirPostAuth } from '../utils/authRedirect';
import { validatePassword }  from '../utils/validation';

function CampoPassword({ label, name, placeholder, value, mostrar, onChange, onToggle }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
        {label}
      </label>
      <div className="relative">
        <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-slate-500 pointer-events-none" />
        <input
          type={mostrar ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-colors
                     bg-gray-50 dark:bg-slate-800
                     border border-gray-200 dark:border-slate-700
                     text-gray-900 dark:text-white
                     placeholder-gray-400 dark:placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
        >
          {mostrar ? <FaEyeSlash className="h-3.5 w-3.5" /> : <FaEye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function CambiarContrasena() {
  const { usuario, logout, marcarContrasenaActualizada } = useAuth();
  const { limpiar }  = useAbilityUpdater();
  const navigate     = useNavigate();
  const ability      = useContext(AbilityContext);

  const esCambioObligatorio = usuario?.debe_cambiar_pass ?? false;

  const [form, setForm] = useState({
    contrasena_actual: '',
    contrasena_nueva:  '',
    confirmar:         '',
  });

  const [ver, setVer] = useState({
    actual:   false,
    nueva:    false,
    confirmar: false,
  });

  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState(null);
  const [exito,    setExito]    = useState(false);

  const toggleVer   = (campo) => setVer(prev => ({ ...prev, [campo]: !prev[campo] }));
  const handleChange = (e)    => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const passErr = validatePassword(form.contrasena_nueva);
    if (passErr) return setError(passErr);
    if (form.contrasena_nueva !== form.confirmar)
      return setError('Las contraseñas nuevas no coinciden.');
    if (!esCambioObligatorio && !form.contrasena_actual)
      return setError('Ingresa tu contraseña actual.');

    setCargando(true);
    try {
      await authService.cambiarContrasena({
        contrasena_actual: esCambioObligatorio ? undefined : form.contrasena_actual,
        contrasena_nueva:  form.contrasena_nueva,
      });
      marcarContrasenaActualizada();
      setExito(true);
      setTimeout(() => redirigirPostAuth(ability, navigate, '/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  const handleCancelar = async () => {
    limpiar();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">

      <div className="relative w-full max-w-md">

        {/* Tarjeta */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl dark:shadow-black/50 transition-colors duration-300">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="h-16 sm:h-20 w-auto object-contain" />
          </div>

          {/* Encabezado */}
          <div className="flex items-center gap-2 justify-center mb-2">
            <FaShieldAlt className="text-amber-500 h-5 w-5" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cambiar contraseña</h2>
          </div>

          {/* Aviso obligatorio */}
          {esCambioObligatorio && (
            <p className="text-center text-amber-700 dark:text-amber-300 text-xs sm:text-sm mt-3 mb-5
                          bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30
                          rounded-xl px-3 py-2">
              Por seguridad debes cambiar tu contraseña antes de continuar.
            </p>
          )}

          {/* Éxito */}
          {exito && (
            <div className="mt-3 mb-4 px-4 py-3 rounded-xl text-sm text-center
                            bg-green-50 dark:bg-green-500/10
                            border border-green-200 dark:border-green-500/30
                            text-green-700 dark:text-green-300">
              ✅ Contraseña actualizada. Redirigiendo...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm
                            bg-red-50 dark:bg-red-500/10
                            border border-red-200 dark:border-red-500/20
                            text-red-600 dark:text-red-400">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-5">

            {!esCambioObligatorio && (
              <CampoPassword
                label="Contraseña actual"
                name="contrasena_actual"
                placeholder="Tu contraseña actual"
                value={form.contrasena_actual}
                mostrar={ver.actual}
                onChange={handleChange}
                onToggle={() => toggleVer('actual')}
              />
            )}

            <CampoPassword
              label="Nueva contraseña"
              name="contrasena_nueva"
              placeholder="Mínimo 6 caracteres"
              value={form.contrasena_nueva}
              mostrar={ver.nueva}
              onChange={handleChange}
              onToggle={() => toggleVer('nueva')}
            />

            <CampoPassword
              label="Confirmar nueva contraseña"
              name="confirmar"
              placeholder="Repite la nueva contraseña"
              value={form.confirmar}
              mostrar={ver.confirmar}
              onChange={handleChange}
              onToggle={() => toggleVer('confirmar')}
            />

            <button
              type="submit"
              disabled={cargando || exito}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                         bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                         text-white dark:text-slate-900
                         shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
            >
              {cargando ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4" />
                  Guardando...
                </>
              ) : (
                'Guardar nueva contraseña'
              )}
            </button>

            {!esCambioObligatorio && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full py-2 px-4 rounded-xl text-sm transition-colors
                           text-gray-500 dark:text-slate-500
                           hover:text-gray-800 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
            )}

            {esCambioObligatorio && (
              <button
                type="button"
                onClick={handleCancelar}
                className="w-full py-2 px-4 rounded-xl text-sm transition-colors
                           text-gray-400 dark:text-slate-600
                           hover:text-gray-700 dark:hover:text-slate-400"
              >
                Cerrar sesión
              </button>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
