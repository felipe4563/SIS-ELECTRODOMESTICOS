# Configuración del Sistema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo completo post-login hacia configuración inicial: wizard guiado de 7 pasos + índice de configuración con estado, eliminando el módulo Parámetros.

**Architecture:** Helper `authRedirect.js` compartido detecta permisos y estado de empresa para redirigir al wizard (primera vez) o al índice. El wizard es un componente full-screen sin sidebar con 7 pasos obligatorios en orden. El índice muestra 7 tarjetas con estado ✅/⚠️ detectado en tiempo real.

**Tech Stack:** React 18, React Router v6, CASL (`@casl/ability`), Tailwind CSS, Axios, Express.js (backend para eliminación de ruta)

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Eliminar | `backend/routes/configuracion.Routes.js` |
| Eliminar | `backend/controllers/configuracion.Controller.js` |
| Eliminar | `frontend/src/pages/configuracion/Parametros.jsx` |
| Crear | `frontend/src/utils/authRedirect.js` |
| Crear | `frontend/src/pages/configuracion/ConfiguracionIndex.jsx` |
| Crear | `frontend/src/pages/configuracion/WizardConfiguracion.jsx` |
| Modificar | `backend/app.js` |
| Modificar | `frontend/src/App.jsx` |
| Modificar | `frontend/src/components/sidebar.jsx` |
| Modificar | `frontend/src/services/configuracion.service.js` |
| Modificar | `frontend/src/pages/Login.jsx` |
| Modificar | `frontend/src/pages/CambiarContrasena.jsx` |

---

## Task 1: Eliminar módulo Parámetros del backend

**Files:**
- Modify: `backend/app.js` (líneas 13 y 61)
- Delete: `backend/routes/configuracion.Routes.js`
- Delete: `backend/controllers/configuracion.Controller.js`

- [ ] **Step 1: Quitar require y app.use de configuracion en app.js**

En `backend/app.js` eliminar la línea 13:
```js
// ELIMINAR esta línea:
const configuracionRoutes = require('./routes/configuracion.Routes');
```
Y la línea 61:
```js
// ELIMINAR esta línea:
app.use('/api/configuracion', configuracionRoutes);
```

- [ ] **Step 2: Eliminar los archivos de backend**

```bash
del "backend\routes\configuracion.Routes.js"
del "backend\controllers\configuracion.Controller.js"
```

- [ ] **Step 3: Verificar que el backend arranca sin error**

```bash
node backend/app.js
```
Resultado esperado: servidor inicia en puerto 3000 sin `Cannot find module` ni errores de require.

- [ ] **Step 4: Commit**

```bash
git add backend/app.js
git commit -m "feat: eliminar módulo parámetros del backend"
```

---

## Task 2: Eliminar Parámetros del frontend

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/sidebar.jsx`
- Modify: `frontend/src/services/configuracion.service.js`
- Delete: `frontend/src/pages/configuracion/Parametros.jsx`

- [ ] **Step 1: Quitar import y ruta de Parametros en App.jsx**

Eliminar la línea de import (línea 100):
```js
// ELIMINAR:
import Parametros   from './pages/configuracion/Parametros';
```

Eliminar el bloque de ruta (líneas 183-188):
```jsx
// ELIMINAR:
<Route path="/configuracion/parametros" element={
  <PageRoute action="ver" subject="parametros">
    <Parametros />
  </PageRoute>
} />
```

- [ ] **Step 2: Quitar ítem Parámetros del sidebar y agregar enlace al índice**

En `frontend/src/components/sidebar.jsx`, en el array `MENU`, grupo `Configuración`:

Eliminar este ítem:
```js
{ label: 'Parámetros', path: '/configuracion/parametros', icono: '⚙️', action: 'ver', subject: 'parametros' },
```

Agregar como PRIMER ítem del grupo Configuración:
```js
{ label: 'Panel de config.', path: '/configuracion', icono: '🛠️', action: 'ver', subject: 'configuracion' },
```

El grupo Configuración debe quedar así:
```js
{
  label: 'Configuración',
  action: 'ver', subject: 'configuracion',
  items: [
    { label: 'Panel de config.',  path: '/configuracion',              icono: '🛠️', action: 'ver', subject: 'configuracion' },
    { label: 'Empresa',           path: '/configuracion/empresa',      icono: '🏢', action: 'ver', subject: 'configuracion' },
    { label: 'Sucursales',        path: '/configuracion/sucursales',   icono: '🏪', action: 'ver', subject: 'sucursales' },
    { label: 'Depósitos',         path: '/configuracion/depositos',    icono: '🏭', action: 'ver', subject: 'depositos' },
    { label: 'Monedas',           path: '/configuracion/monedas',      icono: '💱', action: 'ver', subject: 'monedas' },
    { label: 'Tipos de cambio',   path: '/configuracion/tipos-cambio', icono: '📈', action: 'ver', subject: 'tipos_cambio' },
    { label: 'Bancos',            path: '/configuracion/bancos',       icono: '🏦', action: 'ver', subject: 'bancos' },
    { label: 'Impuestos',         path: '/configuracion/impuestos',    icono: '💲', action: 'ver', subject: 'impuestos' },
  ],
},
```

- [ ] **Step 3: Eliminar parametrosService de configuracion.service.js**

En `frontend/src/services/configuracion.service.js` eliminar el bloque completo (líneas 45-48):
```js
// ELIMINAR:
export const parametrosService = {
  getAll:  ()           => api.get('/configuracion'),
  update:  (clave, valor) => api.put(`/configuracion/${clave}`, { valor }),
};
```

- [ ] **Step 4: Eliminar Parametros.jsx**

```bash
del "frontend\src\pages\configuracion\Parametros.jsx"
```

- [ ] **Step 5: Verificar que el frontend compila sin error**

```bash
cd frontend && npm run build 2>&1 | head -20
```
Resultado esperado: compilación exitosa sin `Cannot find module` relacionados a Parametros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/sidebar.jsx frontend/src/services/configuracion.service.js
git commit -m "feat: eliminar módulo parámetros del frontend"
```

---

## Task 3: Crear helper de redirección post-login

**Files:**
- Create: `frontend/src/utils/authRedirect.js`

- [ ] **Step 1: Crear el archivo authRedirect.js**

Crear `frontend/src/utils/authRedirect.js` con el siguiente contenido exacto:

```js
import { empresaService } from '../services/configuracion.service';

/**
 * Redirige al usuario al destino correcto después del login o cambio de contraseña.
 * - Sin permiso configuracion.ver → destino (dashboard por defecto)
 * - Con permiso, empresa sin razon_social/nit → /configuracion/wizard
 * - Con permiso, empresa completa → /configuracion
 *
 * @param {import('@casl/ability').Ability} ability - instancia CASL del usuario
 * @param {Function} navigate - función navigate de react-router-dom
 * @param {string} destino - ruta de fallback (por defecto '/dashboard')
 */
export async function redirigirPostAuth(ability, navigate, destino = '/dashboard') {
  if (!ability.can('ver', 'configuracion')) {
    navigate(destino, { replace: true });
    return;
  }
  try {
    const { data } = await empresaService.get();
    if (!data?.razon_social || !data?.nit) {
      navigate('/configuracion/wizard', { replace: true });
    } else {
      navigate('/configuracion', { replace: true });
    }
  } catch {
    navigate(destino, { replace: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/authRedirect.js
git commit -m "feat: agregar helper redirigirPostAuth"
```

---

## Task 4: Actualizar Login.jsx para usar redirigirPostAuth

**Files:**
- Modify: `frontend/src/pages/Login.jsx`

- [ ] **Step 1: Agregar imports en Login.jsx**

Al inicio del archivo, después de los imports existentes, agregar:
```js
import { redirigirPostAuth } from '../utils/authRedirect';
import { buildAbility }      from '../casl/ability';
```

- [ ] **Step 2: Reemplazar el bloque else final en handleSubmit**

Localizar en `handleSubmit` (líneas 40-45 del archivo actual):
```js
// ANTES:
      } else {
        navigate(destino, { replace: true });
      }
```

Reemplazar por:
```js
      } else {
        await redirigirPostAuth(buildAbility(usuario.permisos ?? []), navigate, destino);
      }
```

La función `handleSubmit` completa queda así:
```js
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
        await redirigirPostAuth(buildAbility(usuario.permisos ?? []), navigate, destino);
      }
    } catch { /* error manejado en AuthContext */ }
  };
```

- [ ] **Step 3: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -10
```
Resultado esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: redirigir a configuración tras login si tiene permiso"
```

---

## Task 5: Actualizar CambiarContrasena.jsx para usar redirigirPostAuth

**Files:**
- Modify: `frontend/src/pages/CambiarContrasena.jsx`

- [ ] **Step 1: Agregar imports en CambiarContrasena.jsx**

Al inicio del archivo, modificar los imports de React para incluir `useContext`:
```js
import { useState, useContext } from 'react';
```

Agregar estos dos imports después de los imports existentes:
```js
import { AbilityContext }    from '../contexts/AbilityContext';
import { redirigirPostAuth } from '../utils/authRedirect';
```

- [ ] **Step 2: Leer ability del contexto dentro del componente**

Dentro de `CambiarContrasena()`, inmediatamente después de las otras llamadas a hooks:
```js
  const ability = useContext(AbilityContext);
```

La sección de hooks queda así:
```js
  const { usuario, logout, marcarContrasenaActualizada } = useAuth();
  const { limpiar }  = useAbilityUpdater();
  const navigate     = useNavigate();
  const ability      = useContext(AbilityContext);
```

- [ ] **Step 3: Reemplazar el setTimeout en handleSubmit**

Localizar en `handleSubmit` (líneas 86-89):
```js
// ANTES:
      marcarContrasenaActualizada();
      setExito(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
```

Reemplazar por:
```js
      marcarContrasenaActualizada();
      setExito(true);
      setTimeout(() => redirigirPostAuth(ability, navigate, '/dashboard'), 1500);
```

- [ ] **Step 4: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -10
```
Resultado esperado: sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CambiarContrasena.jsx
git commit -m "feat: redirigir a configuración tras cambio de contraseña"
```

---

## Task 6: Agregar rutas /configuracion y /configuracion/wizard en App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Agregar imports de los nuevos componentes**

Después del bloque `// ── Configuración base` en App.jsx (después del import de `Impuestos`), agregar:
```js
import ConfiguracionIndex  from './pages/configuracion/ConfiguracionIndex';
import WizardConfiguracion from './pages/configuracion/WizardConfiguracion';
```

- [ ] **Step 2: Agregar las rutas en el bloque de Configuración**

Justo ANTES de la ruta `/configuracion/empresa` (línea 158 actual), insertar:
```jsx
              {/* Índice y wizard de configuración */}
              <Route path="/configuracion" element={
                <PageRoute action="ver" subject="configuracion">
                  <ConfiguracionIndex />
                </PageRoute>
              } />
              <Route path="/configuracion/wizard" element={
                <ProtectedRoute action="ver" subject="configuracion">
                  <WizardConfiguracion />
                </ProtectedRoute>
              } />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: agregar rutas /configuracion e /configuracion/wizard"
```

---

## Task 7: Crear ConfiguracionIndex.jsx

**Files:**
- Create: `frontend/src/pages/configuracion/ConfiguracionIndex.jsx`

- [ ] **Step 1: Crear el archivo**

Crear `frontend/src/pages/configuracion/ConfiguracionIndex.jsx`:

```jsx
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
        empresa:      emp.status === 'fulfilled' && !!(emp.value.data?.razon_social && emp.value.data?.nit),
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
```

- [ ] **Step 2: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -10
```
Resultado esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/configuracion/ConfiguracionIndex.jsx
git commit -m "feat: agregar índice de configuración con tarjetas de estado"
```

---

## Task 8: Crear WizardConfiguracion.jsx

**Files:**
- Create: `frontend/src/pages/configuracion/WizardConfiguracion.jsx`

Este archivo contiene el wizard completo: el componente principal `WizardConfiguracion` y los 7 componentes de pasos (`PasoEmpresa`, `PasoSucursales`, `PasoDepositos`, `PasoMonedas`, `PasoTiposCambio`, `PasoBancos`, `PasoImpuestos`).

- [ ] **Step 1: Crear el archivo WizardConfiguracion.jsx**

Crear `frontend/src/pages/configuracion/WizardConfiguracion.jsx` con el siguiente contenido:

```jsx
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
        setEmpresa(data);
        setForm({
          razon_social:     data.razon_social     ?? '',
          nombre_comercial: data.nombre_comercial ?? '',
          nit:              data.nit              ?? '',
          direccion:        data.direccion         ?? '',
          telefono:         data.telefono          ?? '',
          email:            data.email             ?? '',
        });
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
      await empresaService.update(empresa.id_empresa, form);
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
```

- [ ] **Step 2: Verificar compilación**

```bash
cd frontend && npm run build 2>&1 | grep -E "error|Error" | head -20
```
Resultado esperado: sin errores de compilación.

- [ ] **Step 3: Probar flujo completo en el navegador**

1. Iniciar backend: `node backend/app.js`
2. Iniciar frontend: `cd frontend && npm run dev`
3. Ir a `http://localhost:5173/login`
4. Iniciar sesión con usuario Administrador
5. Si la empresa no tiene `razon_social`/`nit` → debe redirigir a `/configuracion/wizard`
6. Completar paso 0 (Empresa) → botón "Siguiente" se habilita al guardar
7. Completar pasos 1-6 → al finalizar va a `/dashboard`
8. Volver a iniciar sesión → ahora debe ir a `/configuracion` (índice con tarjetas ✅)

- [ ] **Step 4: Commit final**

```bash
git add frontend/src/pages/configuracion/WizardConfiguracion.jsx
git commit -m "feat: agregar wizard de configuración inicial de 7 pasos"
```

---

## Verificación final

Una vez completados todos los tasks:

- [ ] `GET /api/configuracion` devuelve 404 (ruta eliminada)
- [ ] `/configuracion/parametros` en el frontend redirige a dashboard (ruta eliminada)
- [ ] Ítem "Parámetros" ya no aparece en el sidebar
- [ ] Login con empresa vacía → redirige a `/configuracion/wizard`
- [ ] Login con empresa completa → redirige a `/configuracion` (índice con tarjetas)
- [ ] Cambio de contraseña obligatorio → al cambiarla → redirige al wizard o índice según estado de empresa
- [ ] Usuario sin permiso `configuracion.ver` → va al dashboard como antes
- [ ] Wizard: botón "Siguiente" bloqueado hasta guardar cada paso
- [ ] Wizard: pasos ya completados muestran ✅ y son navegables hacia atrás
- [ ] Wizard: paso 6 → "Finalizar" → dashboard
- [ ] Índice: todas las tarjetas muestran estado correcto (✅/⚠️)
- [ ] Ítem "Panel de config." en sidebar lleva a `/configuracion`
