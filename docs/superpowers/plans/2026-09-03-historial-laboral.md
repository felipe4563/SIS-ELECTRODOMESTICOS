# Historial Laboral Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar automáticamente, dentro de la ficha de cada usuario, cada cambio de cargo, sucursal o porcentaje de comisión (quién lo hizo y cuándo).

**Architecture:** Nueva tabla `usuario_historial`. `updateUsuario` ya trae los valores "antes" del usuario (`oldRows`) — se amplía esa consulta para incluir `cargo`, `id_sucursal_default` (con nombre de sucursal) y `porcentaje_comision`, se compara contra los valores nuevos después del UPDATE, y por cada campo que cambió se inserta una fila en `usuario_historial`. En el frontend, un botón "Historial" en la tarjeta de usuario abre un modal con el listado, más reciente primero.

**Tech Stack:** Node/Express + `mysql2` (callback pool con `.promise()`), React (Vite), Tailwind. Sin frameworks de test en el repo — verificación por `node --check`, `vite build` y prueba manual en navegador, siguiendo el patrón ya usado en el proyecto.

**Spec:** `docs/superpowers/specs/2026-09-03-control-de-personal-design.md` (sección "Historial laboral")

## Global Constraints

- No se usa framework de testing automatizado (no existe en el repo) — cada tarea se verifica con `node --check` (backend) y/o `npx vite build --logLevel warn` (frontend), más una prueba manual descrita en el paso de verificación.
- Los archivos `.sql` bajo `bd/` están en `.gitignore` — usar `mv`/creación normal de archivo, nunca `git add` fallará silenciosamente para ellos si intentás agregarlos: confirmá con `git status` antes de asumir que quedaron en el commit (probablemente no deban commitearse, igual que las migraciones anteriores).
- `bd_megaelectraprod.sql` debe reflejar cada cambio de esquema de esta feature (tabla nueva en su sección de Estructura + Indices + AUTO_INCREMENT), igual que las migraciones 18-21 ya aplicadas.
- Seguir el estilo de queries ya usado en `usuarios.Controller.js` (mysql2 con `?` placeholders, `db.promise().query(...)`).

---

### Task 1: Migración de base de datos — tabla `usuario_historial`

**Files:**
- Create: `bd/migracion_22_historial_laboral_usuario.sql`
- Modify: `bd/bd_megaelectraprod.sql` (agregar tabla en su sección correspondiente, después de `usuarios` en orden de dependencia)

**Interfaces:**
- Produces: tabla `usuario_historial(id_historial PK AI, id_usuario FK usuarios, campo ENUM('CARGO','SUCURSAL','COMISION'), valor_anterior VARCHAR(255) NULL, valor_nuevo VARCHAR(255) NULL, id_usuario_edito FK usuarios, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Migración: historial laboral — registra cambios de cargo, sucursal y
-- porcentaje de comisión de cada usuario, generado automáticamente desde
-- updateUsuario. Ejecutar una sola vez en producción.

CREATE TABLE `usuario_historial` (
  `id_historial` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `campo` enum('CARGO','SUCURSAL','COMISION') NOT NULL,
  `valor_anterior` varchar(255) DEFAULT NULL,
  `valor_nuevo` varchar(255) DEFAULT NULL,
  `id_usuario_edito` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_historial`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_usuario_edito` (`id_usuario_edito`),
  CONSTRAINT `usuario_historial_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `usuario_historial_ibfk_2` FOREIGN KEY (`id_usuario_edito`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Guardar tal cual en `bd/migracion_22_historial_laboral_usuario.sql`.

- [ ] **Step 2: Sincronizar `bd_megaelectraprod.sql`**

Ubicar la sección `-- Estructura de tabla para la tabla \`usuarios\`` (o la tabla que aparezca justo después en el dump) y agregar, respetando el orden de dependencias FK (después de `usuarios`), el `CREATE TABLE` de arriba **sin** el `AUTO_INCREMENT=1` inline (el dump separa eso en su propia sección):

```sql
CREATE TABLE `usuario_historial` (
  `id_historial` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `campo` enum('CARGO','SUCURSAL','COMISION') NOT NULL,
  `valor_anterior` varchar(255) DEFAULT NULL,
  `valor_nuevo` varchar(255) DEFAULT NULL,
  `id_usuario_edito` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

En la sección `--\n-- Indices para tablas volcadas\n--` agregar:

```sql
--
-- Indices de la tabla `usuario_historial`
--
ALTER TABLE `usuario_historial`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_usuario_edito` (`id_usuario_edito`);
```

En la sección `--\n-- AUTO_INCREMENT de las tablas volcadas\n--` agregar:

```sql
--
-- AUTO_INCREMENT de la tabla `usuario_historial`
--
ALTER TABLE `usuario_historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT;
```

En la sección `--\n-- Filtros para tablas volcadas\n--` (los `ADD CONSTRAINT`, al final del archivo, después de que existan `usuarios`) agregar:

```sql
--
-- Filtros para la tabla `usuario_historial`
--
ALTER TABLE `usuario_historial`
  ADD CONSTRAINT `usuario_historial_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `usuario_historial_ibfk_2` FOREIGN KEY (`id_usuario_edito`) REFERENCES `usuarios` (`id_usuario`);
```

- [ ] **Step 3: Verificar**

Run: `grep -c "usuario_historial" "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/bd/bd_megaelectraprod.sql"`
Expected: `4` (una aparición por cada una de las 4 secciones tocadas).

- [ ] **Step 4: Commit**

No se commitea (los `.sql` de `bd/` están en `.gitignore`). Continuar a la Tarea 2.

---

### Task 2: Backend — detectar y registrar cambios en `updateUsuario`

**Files:**
- Modify: `backend/controllers/usuarios.Controller.js:119-186` (función `updateUsuario`)

**Interfaces:**
- Consumes: tabla `usuario_historial` (Task 1); `req.user.id_usuario` (ya disponible vía `authMiddleware`, usado en la línea 177 existente).
- Produces: nueva función exportada `getHistorialUsuario(req, res)` — `GET` que responde `{ historial: [...] }` con filas `{ id_historial, campo, valor_anterior, valor_nuevo, fecha, editor_nombre }` ordenadas por `fecha DESC`.

- [ ] **Step 1: Ampliar el SELECT "antes" de `updateUsuario`**

En `backend/controllers/usuarios.Controller.js:135-139`, reemplazar:

```js
const [oldRows] = await db.promise().query(
  `SELECT id_usuario, username, nombres, apellidos, documento, email, telefono, id_rol, id_sucursal_default, debe_cambiar_pass, activo
   FROM usuarios WHERE id_usuario = ?`,
  [id]
);
```

por:

```js
const [oldRows] = await db.promise().query(
  `SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.documento, u.email, u.telefono,
          u.id_rol, u.id_sucursal_default, u.debe_cambiar_pass, u.activo,
          u.cargo, u.porcentaje_comision, s.nombre AS sucursal_nombre
   FROM usuarios u LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
   WHERE u.id_usuario = ?`,
  [id]
);
```

- [ ] **Step 2: Ampliar el SELECT "después" igual que el de "antes"**

En `backend/controllers/usuarios.Controller.js:167-171`, reemplazar:

```js
const [newRows] = await db.promise().query(
  `SELECT id_usuario, username, nombres, apellidos, documento, email, telefono, id_rol, id_sucursal_default, debe_cambiar_pass, activo
   FROM usuarios WHERE id_usuario = ?`,
  [id]
);
```

por:

```js
const [newRows] = await db.promise().query(
  `SELECT u.id_usuario, u.username, u.nombres, u.apellidos, u.documento, u.email, u.telefono,
          u.id_rol, u.id_sucursal_default, u.debe_cambiar_pass, u.activo,
          u.cargo, u.porcentaje_comision, s.nombre AS sucursal_nombre
   FROM usuarios u LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
   WHERE u.id_usuario = ?`,
  [id]
);
```

- [ ] **Step 3: Insertar filas de historial por cada campo cambiado**

Inmediatamente después del bloque de la Tarea existente que inserta en `auditoria` (`backend/controllers/usuarios.Controller.js:174-178`, el que usa `userAntes`/`userDespues`), agregar:

```js
const cambiosHistorial = [
  { campo: 'CARGO',    antes: userAntes.cargo,             despues: userDespues.cargo },
  { campo: 'SUCURSAL', antes: userAntes.sucursal_nombre,   despues: userDespues.sucursal_nombre },
  { campo: 'COMISION', antes: String(userAntes.porcentaje_comision ?? '0'), despues: String(userDespues.porcentaje_comision ?? '0') },
].filter(c => (c.antes || '') !== (c.despues || ''));

for (const c of cambiosHistorial) {
  await db.promise().query(
    `INSERT INTO usuario_historial (id_usuario, campo, valor_anterior, valor_nuevo, id_usuario_edito) VALUES (?, ?, ?, ?, ?)`,
    [id, c.campo, c.antes || null, c.despues || null, req.user.id_usuario]
  );
}
```

- [ ] **Step 4: Agregar el endpoint de lectura del historial**

Al final del archivo, antes de `module.exports`, agregar:

```js
// GET /api/usuarios/:id/historial
const getHistorialUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.promise().query(
      `SELECT h.id_historial, h.campo, h.valor_anterior, h.valor_nuevo, h.fecha,
              CONCAT(e.nombres, ' ', e.apellidos) AS editor_nombre
       FROM usuario_historial h
       JOIN usuarios e ON e.id_usuario = h.id_usuario_edito
       WHERE h.id_usuario = ?
       ORDER BY h.fecha DESC`,
      [id]
    );
    res.json({ historial: rows });
  } catch (err) {
    console.error('[getHistorialUsuario]', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};
```

Y agregar `getHistorialUsuario,` al objeto `module.exports` del archivo (buscar el `module.exports = {` existente y sumar la clave, siguiendo el estilo del resto de exports ya listados ahí).

- [ ] **Step 5: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check controllers/usuarios.Controller.js`
Expected: sin salida (exit code 0).

- [ ] **Step 6: Registrar la ruta**

En `backend/routes/usuarios.Routes.js`, agregar junto a las demás "Acciones adicionales" (después de la línea `router.post('/:id/cerrar-sesiones', ...)`):

```js
router.get('/:id/historial', authMiddleware, checkPermission('ver', 'usuarios'), ctrl.getHistorialUsuario);
```

- [ ] **Step 7: Verificar sintaxis de la ruta**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check routes/usuarios.Routes.js`
Expected: sin salida (exit code 0).

- [ ] **Step 8: Prueba manual**

Con el backend corriendo (`npm run dev` o el comando habitual del proyecto) y sesión de un usuario con permiso `usuarios.ver`/`usuarios.editar`: editar un usuario de prueba cambiando su `cargo`, guardar, y hacer `GET /api/usuarios/:id/historial` (por Postman/curl con el token de sesión) — confirmar que aparece una fila `campo: "CARGO"` con `valor_anterior`/`valor_nuevo` correctos y `editor_nombre` con el nombre de quien hizo el cambio.

- [ ] **Step 9: Commit**

```bash
git add backend/controllers/usuarios.Controller.js backend/routes/usuarios.Routes.js
git commit -m "$(cat <<'EOF'
feat: registrar historial automático de cambios de cargo/sucursal/comisión

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Frontend — servicio y modal de Historial en Usuarios

**Files:**
- Modify: `frontend/src/services/usuarios.service.js` (agregar función de servicio)
- Modify: `frontend/src/pages/usuarios/Usuarios.jsx` (nuevo modal `HistorialModal`, botón en `UserCard`, estado en el componente principal)

**Interfaces:**
- Consumes: `GET /api/usuarios/:id/historial` → `{ historial: [{ id_historial, campo, valor_anterior, valor_nuevo, fecha, editor_nombre }] }` (Task 2).
- Produces: `usuariosService.getHistorial(id)` — usable por cualquier otra pantalla que en el futuro quiera mostrar historial de un usuario.

- [ ] **Step 1: Agregar la función de servicio**

En `frontend/src/services/usuarios.service.js`, agregar junto a las demás funciones exportadas del objeto de servicio:

```js
getHistorial: (id) => api.get(`/usuarios/${id}/historial`),
```

(seguir exactamente el mismo patrón de las funciones vecinas ya existentes en ese archivo — mismo objeto `api`, mismo estilo de arrow function).

- [ ] **Step 2: Crear el componente `HistorialModal`**

En `frontend/src/pages/usuarios/Usuarios.jsx`, agregar (cerca de `ResetPassModal`, antes de `UserCard`):

```jsx
const CAMPO_LABEL = { CARGO: 'Cargo', SUCURSAL: 'Sucursal', COMISION: 'Comisión (%)' };

function HistorialModal({ usuario, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    usuariosService.getHistorial(usuario.id_usuario)
      .then(r => setHistorial(r.data.historial))
      .finally(() => setCargando(false));
  }, [usuario]);

  if (!usuario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
            Historial laboral — {usuario.nombres} {usuario.apellidos}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="p-6">
          {cargando ? (
            <p className="text-sm text-zinc-400 text-center py-8">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">Sin cambios registrados todavía.</p>
          ) : (
            <ul className="space-y-3">
              {historial.map(h => (
                <li key={h.id_historial} className="text-sm border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{CAMPO_LABEL[h.campo] || h.campo}</span>
                    <span className="text-xs text-zinc-400 font-mono">{new Date(h.fecha).toLocaleString('es-BO')}</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    {h.valor_anterior || <em className="text-zinc-300">vacío</em>} → <span className="font-medium text-zinc-700 dark:text-zinc-300">{h.valor_nuevo || <em className="text-zinc-300">vacío</em>}</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">por {h.editor_nombre}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Agregar el botón "Historial" en `UserCard`**

En `frontend/src/pages/usuarios/Usuarios.jsx:246`, agregar `onHistorial` a la firma de props:

```jsx
function UserCard({ u, yo, puede, onEdit, onDelete, onReset, onSucursales, onCerrarSesiones, onHistorial }) {
```

Y en el bloque de acciones (`frontend/src/pages/usuarios/Usuarios.jsx:329-345`), agregar antes del botón "Editar":

```jsx
{puede('ver', 'usuarios') && (
  <AccionBtn title="Historial laboral" color="zinc" icon={FaHistory} onClick={() => onHistorial(u)} />
)}
```

(usar el mismo componente `AccionBtn` ya definido en el archivo; si `color="zinc"` no es una variante existente de `AccionBtn`, usar `color="blue"` como las demás).

Agregar `FaHistory` al import de `react-icons/fa` al inicio del archivo (junto a `FaEye, FaEyeSlash`, etc.).

- [ ] **Step 4: Conectar el estado y renderizar el modal en el componente principal**

En `export default function Usuarios()` (línea 351 en adelante), agregar junto a los demás `useState` de modales (cerca de `resetModal`):

```jsx
const [historialUsuario, setHistorialUsuario] = useState(null);
```

Pasar `onHistorial={setHistorialUsuario}` en cada lugar donde se renderiza `<UserCard ... />`.

Junto al render de `<ResetPassModal .../>` (línea 633), agregar:

```jsx
<HistorialModal usuario={historialUsuario} onClose={() => setHistorialUsuario(null)} />
```

- [ ] **Step 5: Build de verificación**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/frontend" && npx vite build --logLevel warn 2>&1 | tail -25`
Expected: solo el warning preexistente de "chunks larger than 500 kB" — ningún error.

- [ ] **Step 6: Prueba manual en navegador**

Levantar el frontend (`npm run dev`), ir a Usuarios, tocar "Historial laboral" en la tarjeta de un usuario que ya se haya editado en la prueba manual de la Tarea 2 — confirmar que se ve el cambio de cargo listado con fecha y quién lo hizo. Probar también con un usuario sin cambios (debe mostrar "Sin cambios registrados todavía.").

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/usuarios.service.js frontend/src/pages/usuarios/Usuarios.jsx
git commit -m "$(cat <<'EOF'
feat: mostrar historial laboral de cada usuario en un modal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
