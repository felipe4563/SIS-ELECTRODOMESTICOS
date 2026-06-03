# Diseño: Módulo Configuración del Sistema

**Fecha:** 2026-05-31  
**Fase:** FASE 2 — Configuración  
**Estado:** Aprobado

---

## Resumen

Implementar el flujo completo de configuración inicial del sistema MEGAELECTRA. Después del primer login (con o sin cambio de contraseña obligatorio), los usuarios con permiso `configuracion.ver` son redirigidos a un wizard guiado de 7 pasos para configurar el sistema desde cero. En visitas posteriores, aterrizan en un índice de configuración con tarjetas de estado. Se elimina por completo el módulo de Parámetros (`configuracion_sistema`).

---

## Sección 1 — Flujo de navegación post-login

### Helper compartido

**Archivo:** `frontend/src/utils/authRedirect.js`

Función `redirigirPostAuth(usuario, ability, navigate, destino)` usada tanto en `Login.jsx` como en `CambiarContrasena.jsx`:

```
redirigirPostAuth:
  ├─ ¿usuario NO puede('ver', 'configuracion')?
  │    └─ navigate(destino)  →  dashboard / ruta de origen
  └─ ¿SÍ puede?
       └─ GET /api/empresa/publico
            ├─ razon_social o nit vacíos  →  navigate('/configuracion/wizard')
            └─ empresa ya tiene datos     →  navigate('/configuracion')
```

### Cambios en Login.jsx

El bloque actual:
```js
} else {
  navigate(destino, { replace: true });
}
```
Se reemplaza por llamada a `redirigirPostAuth(...)`. El caso `debe_cambiar_pass` no cambia (sigue yendo a `/cambiar-contrasena`).

### Cambios en CambiarContrasena.jsx

En el handler de éxito, en lugar de `navigate('/dashboard')`, se llama `redirigirPostAuth(...)`.

---

## Sección 2 — Wizard de primera configuración

**Ruta:** `/configuracion/wizard`  
**Componente:** `frontend/src/pages/configuracion/WizardConfiguracion.jsx`  
**Protección:** `action="ver" subject="configuracion"`

### Pasos

| # | Nombre | Operación | Completo cuando |
|---|--------|-----------|-----------------|
| 0 | Empresa | UPDATE (registro ya existe) | `razon_social` y `nit` guardados |
| 1 | Sucursales | CREATE + lista | ≥ 1 sucursal activa |
| 2 | Depósitos | CREATE + lista | ≥ 1 depósito activo |
| 3 | Monedas | CREATE + lista | ≥ 1 moneda activa |
| 4 | Tipos de cambio | CREATE + lista | ≥ 1 tipo de cambio registrado |
| 5 | Bancos | CREATE + lista | ≥ 1 banco activo |
| 6 | Impuestos | CREATE + lista | ≥ 1 impuesto activo |

### Comportamiento del stepper

- **Stepper horizontal** en la parte superior con íconos y nombre de cada paso
- Pasos anteriores completados: habilitados (el usuario puede volver a revisar)
- Pasos futuros: bloqueados visualmente hasta completar el actual
- Botón **"Siguiente"** se habilita solo tras guardar exitosamente el paso actual
- Paso 6 (Impuestos): botón dice **"Finalizar"** → navega a `/dashboard`

### Formularios por paso

- Cada paso es un formulario mínimo de creación/edición inline
- Sin headers, sidebars ni navegación de página completa
- Paso 0 (Empresa): campos `razon_social`, `nombre_comercial`, `nit`, `direccion`, `telefono`, `email` → `empresaService.update(id, data)`
- Pasos 1–6: formulario de creación con campos esenciales + lista de registros existentes debajo → service correspondiente `.create(data)`

---

## Sección 3 — Índice de configuración

**Ruta:** `/configuracion`  
**Componente:** `frontend/src/pages/configuracion/ConfiguracionIndex.jsx`  
**Protección:** `action="ver" subject="configuracion"`

### Diseño

Grid de **6 tarjetas** (Empresa, Sucursales, Depósitos, Monedas, Tipos de cambio, Bancos, Impuestos — sin Parámetros). Cada tarjeta muestra:

- Ícono representativo + nombre de la sección
- Badge de estado: ✅ **Configurado** / ⚠️ **Pendiente**
- Botón **"Gestionar"** → navega a la ruta CRUD existente de esa sección

### Detección de estado (llamadas paralelas al montar)

| Tarjeta | ✅ Configurado si... |
|---------|---------------------|
| Empresa | `razon_social` y `nit` no vacíos |
| Sucursales | count ≥ 1 activa |
| Depósitos | count ≥ 1 activo |
| Monedas | count ≥ 1 activa |
| Tipos de cambio | existe al menos 1 registro |
| Bancos | count ≥ 1 activo |
| Impuestos | count ≥ 1 activo |

Si falla alguna llamada, la tarjeta muestra ⚠️ por defecto.

---

## Sección 4 — Eliminaciones (Parámetros)

### Frontend — eliminar

| Archivo | Acción |
|---------|--------|
| `frontend/src/pages/configuracion/Parametros.jsx` | Eliminar archivo |
| `frontend/src/services/configuracion.service.js` | Eliminar export `parametrosService` |
| `frontend/src/components/sidebar.jsx` | Eliminar ítem "Parámetros" del menú |
| `frontend/src/App.jsx` | Eliminar ruta `/configuracion/parametros` |

### Backend — eliminar (si existen)

| Archivo | Acción |
|---------|--------|
| `backend/routes/configuracion.Routes.js` | Eliminar archivo |
| `backend/controllers/configuracion.Controller.js` | Eliminar archivo |
| `backend/app.js` | Eliminar `require` y `app.use` de esa ruta |

### Base de datos

La tabla `configuracion_sistema` **no se toca**. Queda sin uso en el backend, sin migración destructiva.

---

## Rutas a agregar en App.jsx

```jsx
<Route path="/configuracion" element={
  <ProtectedRoute action="ver" subject="configuracion">
    <ConfiguracionIndex />
  </ProtectedRoute>
} />
<Route path="/configuracion/wizard" element={
  <ProtectedRoute action="ver" subject="configuracion">
    <WizardConfiguracion />
  </ProtectedRoute>
} />
```

---

## Servicios existentes reutilizados

El wizard y el índice usan los services ya existentes en `configuracion.service.js`:
- `empresaService.getPublico()`, `empresaService.update()`
- `sucursalesService.getAll()`, `sucursalesService.create()`
- `depositosService.getAll()`, `depositosService.create()`
- `monedasService.getAll()`, `monedasService.create()`
- `tiposCambioService.getAll()`, `tiposCambioService.create()`
- `bancosService.getAll()`, `bancosService.create()`
- `impuestosService.getAll()`, `impuestosService.create()`

No se crean nuevos endpoints en el backend para el wizard.

---

## Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/utils/authRedirect.js` | Helper de redirección post-login |
| `frontend/src/pages/configuracion/WizardConfiguracion.jsx` | Wizard de 7 pasos |
| `frontend/src/pages/configuracion/ConfiguracionIndex.jsx` | Índice con tarjetas de estado |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/Login.jsx` | Usar `redirigirPostAuth` en lugar de `navigate(destino)` |
| `frontend/src/pages/CambiarContrasena.jsx` | Usar `redirigirPostAuth` en lugar de `navigate('/dashboard')` |
| `frontend/src/App.jsx` | Agregar rutas wizard e índice, eliminar `/configuracion/parametros` |
| `frontend/src/components/sidebar.jsx` | Eliminar ítem Parámetros |
| `frontend/src/services/configuracion.service.js` | Eliminar `parametrosService` |
| `backend/app.js` | Eliminar ruta de configuracion si existe |
