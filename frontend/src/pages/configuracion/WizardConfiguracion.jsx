import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import {
  empresaService,
  sucursalesService,
  depositosService,
  monedasService,
  tiposCambioService,
  bancosService,
  impuestosService,
} from '../../services/configuracion.service';

// ── Estilos compartidos ───────────────────────────────────────────────────
const inputCls = 'block w-full px-3 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-400 dark:focus:border-amber-500/50 transition-colors';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-zinc-400 mb-1';
const btnPrimary = 'px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white dark:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const PASOS = [
  { titulo: 'Empresa',         icono: '🏢' },
  { titulo: 'Sucursales',      icono: '🏪' },
  { titulo: 'Depósitos',       icono: '🏭' },
  { titulo: 'Monedas',         icono: '💱' },
  { titulo: 'Tipos de cambio', icono: '📈' },
  { titulo: 'Bancos',          icono: '🏦' },
  { titulo: 'Impuestos',       icono: '💲' },
];

// ── PasoEmpresa ───────────────────────────────────────────────────────────
function PasoEmpresa({ onGuardado }) {
  const [empresa,   setEmpresa]   = useState(null);
  const [form,      setForm]      = useState({ razon_social: '', nombre_comercial: '', nit: '', direccion: '', telefono: '', email: '' });
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  useEffect(() => {
    empresaService.get()
      .then(({ data }) => {
        const emp = data.empresa;
        setEmpresa(emp ?? null);
        if (emp) {
          setForm({
            razon_social:     emp.razon_social     ?? '',
            nombre_comercial: emp.nombre_comercial ?? '',
            nit:              emp.nit              ?? '',
            direccion:        emp.direccion         ?? '',
            telefono:         emp.telefono          ?? '',
            email:            emp.email             ?? '',
          });
        }
      })
      .catch(() => setError('Error al cargar datos de la empresa'));
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.razon_social.trim() || !form.nit.trim()) return setError('Razón social y NIT son obligatorios.');
    setError(null);
    setGuardando(true);
    try {
      if (empresa) {
        const { data } = await empresaService.update(empresa.id_empresa, form);
        setEmpresa(data.empresa);
      } else {
        const { data } = await empresaService.create(form);
        setEmpresa(data.empresa);
      }
      setExito(true);
      onGuardado();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Datos de la empresa</h2>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Ingresa la información legal de tu empresa.</p>

      {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
      {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Empresa guardada correctamente</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Razón social *</label>
            <input name="razon_social" value={form.razon_social} onChange={handleChange} required className={inputCls} placeholder="Nombre legal de la empresa" />
          </div>
          <div>
            <label className={labelCls}>Nombre comercial</label>
            <input name="nombre_comercial" value={form.nombre_comercial} onChange={handleChange} className={inputCls} placeholder="Nombre visible al público" />
          </div>
          <div>
            <label className={labelCls}>NIT *</label>
            <input name="nit" value={form.nit} onChange={handleChange} required className={inputCls} placeholder="Número de identificación tributaria" />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} className={inputCls} placeholder="Teléfono de contacto" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} className={inputCls} placeholder="Dirección física de la empresa" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Correo electrónico</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className={inputCls} placeholder="correo@empresa.com" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={guardando || exito} className={btnPrimary}>
            {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : exito ? '✅ Guardado' : 'Guardar empresa'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── PasoSucursales ────────────────────────────────────────────────────────
function PasoSucursales({ onGuardado }) {
  const EMPTY = { codigo: '', nombre: '', tipo: 'SUCURSAL', direccion: '', ciudad: '', telefono: '', responsable: '', es_punto_venta: true, activo: true };
  const [lista,     setLista]     = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  const cargar = () => {
    sucursalesService.getAll()
      .then(({ data }) => {
        const arr = data.sucursales ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(cargar, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    setError(null);
    setGuardando(true);
    try {
      await sucursalesService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Sucursales registradas ({lista.length})</p>
          <div className="space-y-2">
            {lista.map(s => (
              <div key={s.id_sucursal} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{s.nombre}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{s.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar sucursal</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra al menos una sucursal o punto de venta.</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Sucursal agregada</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className={inputCls} placeholder="Ej: SUC-01" />
            </div>
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Nombre de la sucursal" />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                <option value="SUCURSAL">SUCURSAL</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input name="ciudad" value={form.ciudad} onChange={handleChange} className={inputCls} placeholder="Ciudad" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input name="direccion" value={form.direccion} onChange={handleChange} className={inputCls} placeholder="Dirección" />
            </div>
            <div>
              <label className={labelCls}>Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange} className={inputCls} placeholder="Teléfono" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Agregar sucursal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PasoDepositos ─────────────────────────────────────────────────────────
function PasoDepositos({ onGuardado }) {
  const EMPTY = { id_sucursal: '', codigo: '', nombre: '', tipo: 'ALMACEN', direccion: '', encargado: '', permite_venta: true, activo: true };
  const [lista,      setLista]      = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [form,       setForm]       = useState(EMPTY);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState(null);
  const [exito,      setExito]      = useState(false);

  const cargar = () => {
    depositosService.getAll()
      .then(({ data }) => {
        const arr = data.depositos ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
    sucursalesService.getAll()
      .then(({ data }) => setSucursales(data.sucursales ?? []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    setError(null);
    setGuardando(true);
    try {
      await depositosService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Depósitos registrados ({lista.length})</p>
          <div className="space-y-2">
            {lista.map(d => (
              <div key={d.id_deposito} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{d.nombre}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{d.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar depósito</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra al menos un depósito o almacén.</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Depósito agregado</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sucursal</label>
              <select name="id_sucursal" value={form.id_sucursal} onChange={handleChange} className={inputCls}>
                <option value="">Sin sucursal asignada</option>
                {sucursales.map(s => <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className={inputCls} placeholder="Ej: DEP-01" />
            </div>
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Nombre del depósito" />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                <option value="ALMACEN">ALMACEN</option>
                <option value="DEPOSITO_PEQUENO">DEPOSITO_PEQUENO</option>
                <option value="PUNTO_VENTA">PUNTO_VENTA</option>
                <option value="TRANSITO">TRANSITO</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Encargado</label>
              <input name="encargado" value={form.encargado} onChange={handleChange} className={inputCls} placeholder="Nombre del encargado" />
            </div>
            <div>
              <label className={labelCls}>Dirección</label>
              <input name="direccion" value={form.direccion} onChange={handleChange} className={inputCls} placeholder="Dirección" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Agregar depósito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PasoMonedas ───────────────────────────────────────────────────────────
function PasoMonedas({ onGuardado }) {
  const EMPTY = { codigo: '', nombre: '', simbolo: '', decimales: 2, es_moneda_base: false, activo: true };
  const [lista,     setLista]     = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  const cargar = () => {
    monedasService.getAll()
      .then(({ data }) => {
        const arr = data.monedas ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(cargar, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.simbolo.trim()) return setError('Nombre y símbolo son obligatorios.');
    setError(null);
    setGuardando(true);
    try {
      await monedasService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Monedas registradas ({lista.length})</p>
          <div className="space-y-2">
            {lista.map(m => (
              <div key={m.id_moneda} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{m.nombre}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{m.simbolo} · {m.codigo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar moneda</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra las monedas que usará el sistema (ej: Boliviano, Dólar).</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Moneda agregada</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Ej: Boliviano" />
            </div>
            <div>
              <label className={labelCls}>Símbolo *</label>
              <input name="simbolo" value={form.simbolo} onChange={handleChange} required className={inputCls} placeholder="Ej: Bs" />
            </div>
            <div>
              <label className={labelCls}>Código ISO</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className={inputCls} placeholder="Ej: BOB" />
            </div>
            <div>
              <label className={labelCls}>Decimales</label>
              <input name="decimales" type="number" min="0" max="4" value={form.decimales} onChange={handleChange} className={inputCls} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input name="es_moneda_base" type="checkbox" checked={form.es_moneda_base} onChange={handleChange} className="rounded accent-amber-500" id="es_base" />
              <label htmlFor="es_base" className="text-sm text-gray-700 dark:text-zinc-300">Moneda base del sistema</label>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Agregar moneda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PasoTiposCambio ───────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().split('T')[0];

function PasoTiposCambio({ onGuardado }) {
  const EMPTY = { id_moneda_origen: '', id_moneda_destino: '', fecha: hoy(), tasa_compra: '', tasa_venta: '' };
  const [lista,     setLista]     = useState([]);
  const [monedas,   setMonedas]   = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  const cargar = () => {
    tiposCambioService.getAll()
      .then(({ data }) => {
        const arr = data.tipos_cambio ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
    monedasService.getAll()
      .then(({ data }) => setMonedas(data.monedas ?? []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.id_moneda_origen || !form.id_moneda_destino || !form.tasa_compra || !form.tasa_venta)
      return setError('Todos los campos son obligatorios.');
    setError(null);
    setGuardando(true);
    try {
      await tiposCambioService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Tipos de cambio registrados ({lista.length})</p>
          <div className="space-y-2">
            {lista.slice(0, 5).map((tc, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{tc.fecha}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">Compra: {tc.tasa_compra} · Venta: {tc.tasa_venta}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar tipo de cambio</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra la tasa de cambio entre monedas para hoy.</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Tipo de cambio registrado</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Moneda origen *</label>
              <select name="id_moneda_origen" value={form.id_moneda_origen} onChange={handleChange} required className={inputCls}>
                <option value="">Seleccionar...</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Moneda destino *</label>
              <select name="id_moneda_destino" value={form.id_moneda_destino} onChange={handleChange} required className={inputCls}>
                <option value="">Seleccionar...</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha *</label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tasa compra *</label>
              <input name="tasa_compra" type="number" step="0.0001" value={form.tasa_compra} onChange={handleChange} required className={inputCls} placeholder="Ej: 6.96" />
            </div>
            <div>
              <label className={labelCls}>Tasa venta *</label>
              <input name="tasa_venta" type="number" step="0.0001" value={form.tasa_venta} onChange={handleChange} required className={inputCls} placeholder="Ej: 6.98" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Registrar tipo de cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PasoBancos ────────────────────────────────────────────────────────────
function PasoBancos({ onGuardado }) {
  const EMPTY = { codigo: '', nombre: '', sigla: '', pais: 'Bolivia', activo: true };
  const [lista,     setLista]     = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  const cargar = () => {
    bancosService.getAll()
      .then(({ data }) => {
        const arr = data.bancos ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(cargar, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    setError(null);
    setGuardando(true);
    try {
      await bancosService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Bancos registrados ({lista.length})</p>
          <div className="space-y-2">
            {lista.map(b => (
              <div key={b.id_banco} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{b.nombre}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{b.sigla}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar banco</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra los bancos con los que opera la empresa.</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Banco agregado</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Ej: Banco Unión" />
            </div>
            <div>
              <label className={labelCls}>Sigla</label>
              <input name="sigla" value={form.sigla} onChange={handleChange} className={inputCls} placeholder="Ej: BUN" />
            </div>
            <div>
              <label className={labelCls}>Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className={inputCls} placeholder="Código interno" />
            </div>
            <div>
              <label className={labelCls}>País</label>
              <input name="pais" value={form.pais} onChange={handleChange} className={inputCls} placeholder="País" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Agregar banco'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PasoImpuestos ─────────────────────────────────────────────────────────
function PasoImpuestos({ onGuardado }) {
  const EMPTY = { codigo: '', nombre: '', porcentaje: '', tipo: 'AMBOS', es_default: false, activo: true };
  const [lista,     setLista]     = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState(null);
  const [exito,     setExito]     = useState(false);

  const cargar = () => {
    impuestosService.getAll()
      .then(({ data }) => {
        const arr = data.impuestos ?? [];
        setLista(arr);
        if (arr.length > 0) onGuardado();
      })
      .catch(() => {});
  };

  useEffect(cargar, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.porcentaje) return setError('Nombre y porcentaje son obligatorios.');
    setError(null);
    setGuardando(true);
    try {
      await impuestosService.create(form);
      setExito(true);
      setForm(EMPTY);
      cargar();
      onGuardado();
      setTimeout(() => setExito(false), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Impuestos registrados ({lista.length})</p>
          <div className="space-y-2">
            {lista.map(imp => (
              <div key={imp.id_impuesto} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm">
                <span className="font-medium text-gray-800 dark:text-zinc-200">{imp.nombre}</span>
                <span className="text-gray-500 dark:text-zinc-400 text-xs">{imp.porcentaje}% · {imp.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Agregar impuesto</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-5">Registra los impuestos aplicables (ej: IVA 13%).</p>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{error}</div>}
        {exito && <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300">✅ Impuesto agregado</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required className={inputCls} placeholder="Ej: IVA" />
            </div>
            <div>
              <label className={labelCls}>Porcentaje *</label>
              <input name="porcentaje" type="number" step="0.01" value={form.porcentaje} onChange={handleChange} required className={inputCls} placeholder="Ej: 13" />
            </div>
            <div>
              <label className={labelCls}>Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className={inputCls} placeholder="Código interno" />
            </div>
            <div>
              <label className={labelCls}>Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className={inputCls}>
                <option value="AMBOS">AMBOS</option>
                <option value="VENTA">VENTA</option>
                <option value="COMPRA">COMPRA</option>
                <option value="RETENCION">RETENCION</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input name="es_default" type="checkbox" checked={form.es_default} onChange={handleChange} className="rounded accent-amber-500" id="es_default" />
              <label htmlFor="es_default" className="text-sm text-gray-700 dark:text-zinc-300">Impuesto por defecto</label>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? <><FaSpinner className="inline animate-spin mr-2" />Guardando...</> : 'Agregar impuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── WizardConfiguracion (componente principal) ────────────────────────────
export default function WizardConfiguracion() {
  const navigate   = useNavigate();
  const [pasoActual,  setPasoActual]  = useState(0);
  const [guardado,    setGuardado]    = useState(false);
  const [completados, setCompletados] = useState(new Array(7).fill(false));

  useEffect(() => {
    async function cargarEstados() {
      const [suc, dep, mon, tc, ban, imp] = await Promise.allSettled([
        sucursalesService.getAll(),
        depositosService.getAll(),
        monedasService.getAll(),
        tiposCambioService.getAll(),
        bancosService.getAll(),
        impuestosService.getAll(),
      ]);
      setCompletados([
        false,
        suc.status === 'fulfilled' && (suc.value.data?.sucursales?.length  ?? 0) > 0,
        dep.status === 'fulfilled' && (dep.value.data?.depositos?.length   ?? 0) > 0,
        mon.status === 'fulfilled' && (mon.value.data?.monedas?.length     ?? 0) > 0,
        tc.status  === 'fulfilled' && (tc.value.data?.tipos_cambio?.length ?? 0) > 0,
        ban.status === 'fulfilled' && (ban.value.data?.bancos?.length      ?? 0) > 0,
        imp.status === 'fulfilled' && (imp.value.data?.impuestos?.length   ?? 0) > 0,
      ]);
    }
    cargarEstados();
  }, []);

  const marcarGuardado = () => {
    setGuardado(true);
    setCompletados(prev => {
      const nuevo = [...prev];
      nuevo[pasoActual] = true;
      return nuevo;
    });
  };

  const siguiente = () => {
    if (pasoActual === 6) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const sig = pasoActual + 1;
    setPasoActual(sig);
    setGuardado(completados[sig] || false);
  };

  const irA = (idx) => {
    if (idx <= pasoActual || completados[idx]) {
      setPasoActual(idx);
      setGuardado(completados[idx] || false);
    }
  };

  const pasoProps = { onGuardado: marcarGuardado };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950">

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuración inicial del sistema</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Completa los datos para comenzar a usar MEGAELECTRA</p>
      </div>

      {/* Stepper */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {PASOS.map((paso, idx) => (
            <div key={idx} className="flex items-center">
              <button
                onClick={() => irA(idx)}
                disabled={idx > pasoActual && !completados[idx]}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  idx === pasoActual
                    ? 'bg-amber-500 text-white dark:text-slate-900'
                    : completados[idx]
                    ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/20'
                    : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                }`}
              >
                <span>{completados[idx] && idx !== pasoActual ? '✅' : paso.icono}</span>
                <span className="hidden sm:block">{paso.titulo}</span>
              </button>
              {idx < PASOS.length - 1 && (
                <div className={`w-4 sm:w-6 h-0.5 mx-0.5 ${completados[idx] ? 'bg-green-400 dark:bg-green-500' : 'bg-gray-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido del paso */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {pasoActual === 0 && <PasoEmpresa      {...pasoProps} />}
        {pasoActual === 1 && <PasoSucursales   {...pasoProps} />}
        {pasoActual === 2 && <PasoDepositos    {...pasoProps} />}
        {pasoActual === 3 && <PasoMonedas      {...pasoProps} />}
        {pasoActual === 4 && <PasoTiposCambio  {...pasoProps} />}
        {pasoActual === 5 && <PasoBancos       {...pasoProps} />}
        {pasoActual === 6 && <PasoImpuestos    {...pasoProps} />}

        {/* Navegación */}
        <div className="flex justify-between items-center mt-6">
          <span className="text-xs text-gray-400 dark:text-zinc-600">
            Paso {pasoActual + 1} de {PASOS.length}
          </span>
          <button
            disabled={!guardado}
            onClick={siguiente}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all
                       bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                       text-white dark:text-slate-900
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
          >
            {pasoActual === 6 ? 'Finalizar →' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );
}
