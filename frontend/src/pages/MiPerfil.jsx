import { useState, useEffect } from 'react';
import { FaSpinner, FaCheck, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { usuariosService } from '../services/usuariosRoles.service';
import authService from '../services/auth.service';
import PageHeader from '../components/ui/PageHeader';

const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

// ── Campo de contraseña con toggle ───────────────────────────────────────────
function CampoPass({ label, name, value, onChange, placeholder }) {
  const [ver, setVer] = useState(false);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          name={name}
          type={ver ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputCls} pr-10`}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setVer(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
          {ver ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Banner de resultado ──────────────────────────────────────────────────────
function Banner({ tipo, texto }) {
  if (!texto) return null;
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border ${
      tipo === 'ok'
        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400'
        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
    }`}>
      {tipo === 'ok' ? <FaCheck className="h-3.5 w-3.5 shrink-0" /> : <FaTimes className="h-3.5 w-3.5 shrink-0" />}
      {texto}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function MiPerfil() {
  const { usuario, actualizarPerfil } = useAuth();

  // Datos del perfil
  const [perfil,     setPerfil]     = useState({ nombres: '', apellidos: '', email: '', telefono: '' });
  const [guardandoP, setGuardandoP] = useState(false);
  const [bannerP,    setBannerP]    = useState(null);

  // Cambio de contraseña
  const [pass,      setPass]      = useState({ actual: '', nueva: '', confirmar: '' });
  const [guardandoC,setGuardandoC]= useState(false);
  const [bannerC,   setBannerC]   = useState(null);

  useEffect(() => {
    if (usuario) {
      setPerfil({
        nombres:   usuario.nombres  ?? '',
        apellidos: usuario.apellidos ?? '',
        email:     usuario.email    ?? '',
        telefono:  usuario.telefono ?? '',
      });
    }
  }, [usuario]);

  const handlePerfilChange = (e) => setPerfil(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePassChange   = (e) => setPass(p => ({ ...p, [e.target.name]: e.target.value }));

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setBannerP(null);
    setGuardandoP(true);
    try {
      await usuariosService.updateMiPerfil(perfil);
      actualizarPerfil(perfil);
      setBannerP({ tipo: 'ok', texto: 'Perfil actualizado correctamente' });
    } catch (err) {
      setBannerP({ tipo: 'err', texto: err.response?.data?.error || 'Error al actualizar' });
    } finally {
      setGuardandoP(false);
    }
  };

  const guardarContrasena = async (e) => {
    e.preventDefault();
    setBannerC(null);
    if (pass.nueva !== pass.confirmar) {
      setBannerC({ tipo: 'err', texto: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    if (pass.nueva.length < 6) {
      setBannerC({ tipo: 'err', texto: 'Mínimo 6 caracteres' });
      return;
    }
    setGuardandoC(true);
    try {
      await authService.cambiarContrasena({ contrasena_actual: pass.actual, contrasena_nueva: pass.nueva });
      setPass({ actual: '', nueva: '', confirmar: '' });
      setBannerC({ tipo: 'ok', texto: 'Contraseña actualizada correctamente' });
    } catch (err) {
      setBannerC({ tipo: 'err', texto: err.response?.data?.error || 'Error al cambiar contraseña' });
    } finally {
      setGuardandoC(false);
    }
  };

  const iniciales = [usuario?.nombres?.[0], usuario?.apellidos?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Mi Perfil" description="Información de tu cuenta y seguridad" />

      {/* Avatar + resumen */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 text-zinc-900 flex items-center justify-center text-2xl font-bold shrink-0 shadow-md shadow-amber-500/20">
          {iniciales}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{usuario?.nombres} {usuario?.apellidos}</p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">{usuario?.email ?? 'Sin email'}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{usuario?.rol_nombre ?? `Rol ${usuario?.rol}`}</span>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Datos personales</h2>
        <form onSubmit={guardarPerfil} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombres *</label>
              <input name="nombres" value={perfil.nombres} onChange={handlePerfilChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellidos *</label>
              <input name="apellidos" value={perfil.apellidos} onChange={handlePerfilChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input name="email" type="email" value={perfil.email} onChange={handlePerfilChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={perfil.telefono} onChange={handlePerfilChange} className={inputCls} placeholder="+591 7..." />
            </div>
          </div>
          {bannerP && <Banner tipo={bannerP.tipo} texto={bannerP.texto} />}
          <div className="flex justify-end">
            <button type="submit" disabled={guardandoP}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardandoP && <FaSpinner className="animate-spin h-4 w-4" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Cambiar contraseña</h2>
        <form onSubmit={guardarContrasena} className="space-y-4">
          <CampoPass label="Contraseña actual *" name="actual"    value={pass.actual}    onChange={handlePassChange} placeholder="••••••••" />
          <CampoPass label="Nueva contraseña *"  name="nueva"     value={pass.nueva}     onChange={handlePassChange} placeholder="Mínimo 6 caracteres" />
          <CampoPass label="Confirmar nueva *"   name="confirmar" value={pass.confirmar} onChange={handlePassChange} placeholder="Repetir nueva contraseña" />
          {bannerC && <Banner tipo={bannerC.tipo} texto={bannerC.texto} />}
          <div className="flex justify-end">
            <button type="submit" disabled={guardandoC}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 disabled:opacity-50 transition-all">
              {guardandoC && <FaSpinner className="animate-spin h-4 w-4" />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
