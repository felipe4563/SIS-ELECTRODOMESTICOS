import { useState, useEffect, useRef } from 'react';
import { FaBuilding, FaSave, FaSpinner, FaCamera } from 'react-icons/fa';
import { empresaService } from '../../services/configuracion.service';
import { useEmpresa, buildLogoUrl } from '../../contexts/EmpresaContext';
import PageHeader from '../../components/ui/PageHeader';

const campo = 'block w-full px-3 py-2.5 rounded-xl text-sm transition-colors bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50';
const label = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';

export default function Empresa() {
  const { setEmpresa: setEmpresaCtx, recargar } = useEmpresa() ?? {};
  const [empresa,   setEmpresa]   = useState(null);
  const [form,      setForm]      = useState({});
  const [cargando,  setCargando]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo,  setSubiendo]  = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    empresaService.get()
      .then(({ data }) => {
        setEmpresa(data.empresa);
        setForm(data.empresa);
        setLogoPreview(buildLogoUrl(data.empresa.logo_url));
      })
      .catch(() => setError('No se pudo cargar la información de la empresa'))
      .finally(() => setCargando(false));
  }, []);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(false);
    setGuardando(true);
    try {
      const { data } = await empresaService.update(empresa.id_empresa, form);
      setEmpresa(data.empresa);
      setForm(data.empresa);
      setEmpresaCtx?.(data.empresa);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local inmediato
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);

    setSubiendo(true);
    setError(null);
    try {
      const { data } = await empresaService.uploadLogo(empresa.id_empresa, file);
      setEmpresa(data.empresa);
      setForm(data.empresa);
      setEmpresaCtx?.(data.empresa);
      recargar?.();
      const remoteUrl = buildLogoUrl(data.empresa.logo_url);
      setLogoPreview(remoteUrl);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir el logo');
      setLogoPreview(buildLogoUrl(empresa?.logo_url));
      URL.revokeObjectURL(localUrl);
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-64 text-gray-400 dark:text-zinc-500">
      <FaSpinner className="animate-spin h-6 w-6 mr-2" /> Cargando...
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Datos de la Empresa"
        description="Información general de tu empresa"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {exito && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-sm">
          ✅ Datos guardados correctamente
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">

        {/* ── Sección logo ── */}
        <div className="flex items-center gap-5 pb-5 border-b border-gray-100 dark:border-zinc-800">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              {logoPreview && logoPreview !== '/logo.png' ? (
                <img
                  src={logoPreview}
                  alt="Logo empresa"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoPreview('/logo.png')}
                />
              ) : (
                <FaBuilding className="text-gray-300 dark:text-zinc-600 h-10 w-10" />
              )}
            </div>
            {subiendo && (
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                <FaSpinner className="animate-spin text-white h-6 w-6" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Logo de la empresa</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Se usa en comprobantes, facturas y el menú lateral. PNG o JPG, máx. 5 MB.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              disabled={subiendo}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
            >
              <FaCamera className="h-3 w-3" />
              {subiendo ? 'Subiendo…' : 'Cambiar logo'}
            </button>
          </div>
        </div>

        {/* ── Formulario datos ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={label}>Razón Social *</label>
              <input name="razon_social" value={form.razon_social ?? ''} onChange={handleChange} required className={campo} placeholder="Razón social de la empresa" />
            </div>
            <div>
              <label className={label}>Nombre Comercial</label>
              <input name="nombre_comercial" value={form.nombre_comercial ?? ''} onChange={handleChange} className={campo} placeholder="Nombre comercial" />
            </div>
            <div>
              <label className={label}>NIT / RUC</label>
              <input name="nit" value={form.nit ?? ''} onChange={handleChange} className={campo} placeholder="Número de NIT" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Dirección</label>
              <input name="direccion" value={form.direccion ?? ''} onChange={handleChange} className={campo} placeholder="Dirección principal" />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input name="telefono" value={form.telefono ?? ''} onChange={handleChange} className={campo} placeholder="+591 ..." />
            </div>
            <div>
              <label className={label}>Correo Electrónico</label>
              <input name="email" type="email" value={form.email ?? ''} onChange={handleChange} className={campo} placeholder="contacto@empresa.com" />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all bg-amber-500 hover:bg-amber-400 text-white dark:text-zinc-900 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? <FaSpinner className="animate-spin h-4 w-4" /> : <FaSave className="h-4 w-4" />}
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
