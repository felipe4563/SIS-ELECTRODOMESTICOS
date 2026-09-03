# Asistencia con Geolocalización Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada empleado marque su entrada/salida desde el sistema validando por GPS que está en su sucursal, con tardanzas y faltas calculadas automáticamente, más un reporte de asistencia para el administrador.

**Architecture:** `sucursales` gana coordenadas + radio de geocerca; `usuarios` gana horario esperado. Un módulo backend nuevo (`asistencia.Controller.js` + `asistencia.Routes.js`) expone marcar entrada/salida (valida distancia con fórmula haversine contra la sucursal del usuario), listar/filtrar asistencias, y justificar faltas. Un cron diario (mismo mecanismo que `backupScheduler.js`, con `node-cron` ya instalado) genera las faltas del día anterior. En el frontend: dos pantallas nuevas — "Mi Asistencia" (cualquier usuario marca la suya) y "Asistencia" (reporte, solo administrador) — más los campos de ubicación en el formulario de Sucursales y de horario en el de Usuarios.

**Tech Stack:** Node/Express + `mysql2`, `node-cron` (ya usado en `backend/cron/backupScheduler.js`), CASL (permisos vía tabla `permisos`/`rol_permiso`, codificados `modulo.accion`), React (Vite) + Tailwind, `navigator.geolocation` del navegador. Sin framework de testing automatizado en el repo — verificación por `node --check`, `npx vite build` y prueba manual, siguiendo el patrón ya establecido.

**Spec:** `docs/superpowers/specs/2026-09-03-control-de-personal-design.md` (secciones "Asistencia", modelo de datos, permisos y flujos)

## Global Constraints

- Sin test automatizado: cada tarea se verifica con `node --check` / `npx vite build --logLevel warn` + prueba manual descrita en el paso de verificación.
- Los códigos de permiso siguen el formato `modulo.accion` (confirmado en `backend/casl/ability.factory.js:11-14` y en `bd/bd_megaelectraprod.sql:727-729`, ej. `usuarios.ver`). `checkPermission(accion, modulo)` internamente comprueba `can(accion, modulo)`.
- `bd_megaelectraprod.sql` debe reflejar cada cambio de esquema de esta feature (tablas/columnas nuevas + sus Indices/AUTO_INCREMENT/Filtros + los nuevos `modulos`/`permisos`/`rol_permiso`), igual que las migraciones 18-22 ya aplicadas. Las migraciones `.sql` en `bd/` no se commitean (están en `.gitignore`).
- Fuera de alcance (explícito en el spec): kiosko/PIN compartido, geocerca "flexible" (siempre bloquea si está fuera de rango), vacaciones/documentos/sanciones.
- El radio de geocerca es por sucursal (`radio_metros`), no un valor global.

---

### Task 1: Migración de base de datos completa

**Files:**
- Create: `bd/migracion_23_asistencia_geolocalizacion.sql`
- Modify: `bd/bd_megaelectraprod.sql`

**Interfaces:**
- Produces: columnas `sucursales.latitud/longitud/radio_metros`, `usuarios.hora_entrada_esperada/hora_salida_esperada`, tabla `asistencias`, módulo `ASISTENCIA` (id_modulo=22), permisos `asistencia.marcar` (id=227), `asistencia.ver` (id=228), `asistencia.editar` (id=229), y sus filas en `rol_permiso`.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Migración: asistencia con geolocalización.
-- Agrega coordenadas + radio de geocerca a sucursales, horario esperado a
-- usuarios, la tabla de marcaciones diarias, y los permisos del nuevo
-- módulo ASISTENCIA. Ejecutar una sola vez en producción.

ALTER TABLE `sucursales`
  ADD COLUMN `latitud` decimal(10,7) DEFAULT NULL AFTER `responsable`,
  ADD COLUMN `longitud` decimal(10,7) DEFAULT NULL AFTER `latitud`,
  ADD COLUMN `radio_metros` int(11) NOT NULL DEFAULT 100 COMMENT 'Radio en metros permitido para marcar asistencia' AFTER `longitud`;

ALTER TABLE `usuarios`
  ADD COLUMN `hora_entrada_esperada` time DEFAULT NULL AFTER `fecha_ingreso`,
  ADD COLUMN `hora_salida_esperada` time DEFAULT NULL AFTER `hora_entrada_esperada`;

CREATE TABLE `asistencias` (
  `id_asistencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `lat_entrada` decimal(10,7) DEFAULT NULL,
  `lng_entrada` decimal(10,7) DEFAULT NULL,
  `lat_salida` decimal(10,7) DEFAULT NULL,
  `lng_salida` decimal(10,7) DEFAULT NULL,
  `estado` enum('PRESENTE','TARDANZA','FALTA','JUSTIFICADA') NOT NULL,
  `motivo_falta` varchar(255) DEFAULT NULL,
  `id_usuario_edito` int(11) DEFAULT NULL,
  `fecha_edicion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uq_usuario_fecha` (`id_usuario`, `fecha`),
  KEY `id_usuario_edito` (`id_usuario_edito`),
  CONSTRAINT `asistencias_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `asistencias_ibfk_2` FOREIGN KEY (`id_usuario_edito`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `modulos` (`id_modulo`, `codigo`, `nombre`, `icono`, `orden`) VALUES
(22, 'ASISTENCIA', 'Asistencia', 'clock', 22);

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(227, 22, 'asistencia.marcar', 'Marcar Asistencia', 'Registrar la propia entrada/salida'),
(228, 22, 'asistencia.ver', 'Ver Asistencia', 'Ver el reporte de asistencia de todos los empleados'),
(229, 22, 'asistencia.editar', 'Editar Asistencia', 'Justificar faltas y corregir horas marcadas');

-- 'marcar' para todos los roles del sistema (todos marcan su propia asistencia)
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT r.id_rol, 227 FROM roles r;

-- 'ver' y 'editar' solo para ADMINISTRADOR (id_rol = 1)
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 228),
(1, 229);
```

- [ ] **Step 2: Sincronizar `bd_megaelectraprod.sql` — columnas de `sucursales`**

En la sección `CREATE TABLE \`sucursales\`` (línea ~1588 según la última lectura), agregar las 3 columnas nuevas después de `responsable`:

```sql
  `responsable` varchar(120) DEFAULT NULL,
  `latitud` decimal(10,7) DEFAULT NULL,
  `longitud` decimal(10,7) DEFAULT NULL,
  `radio_metros` int(11) NOT NULL DEFAULT 100 COMMENT 'Radio en metros permitido para marcar asistencia',
  `es_punto_venta` tinyint(1) NOT NULL DEFAULT 1,
```

- [ ] **Step 3: Sincronizar `bd_megaelectraprod.sql` — columnas de `usuarios`**

En el `CREATE TABLE \`usuarios\``, agregar después de `fecha_ingreso`:

```sql
  `fecha_ingreso` date DEFAULT NULL COMMENT 'Fecha de contratación / ingreso a la empresa',
  `hora_entrada_esperada` time DEFAULT NULL,
  `hora_salida_esperada` time DEFAULT NULL,
```

- [ ] **Step 4: Sincronizar `bd_megaelectraprod.sql` — tabla `asistencias`**

Agregar el `CREATE TABLE` (sin `AUTO_INCREMENT`) después de `usuarios` en la sección de Estructura:

```sql
CREATE TABLE `asistencias` (
  `id_asistencia` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `lat_entrada` decimal(10,7) DEFAULT NULL,
  `lng_entrada` decimal(10,7) DEFAULT NULL,
  `lat_salida` decimal(10,7) DEFAULT NULL,
  `lng_salida` decimal(10,7) DEFAULT NULL,
  `estado` enum('PRESENTE','TARDANZA','FALTA','JUSTIFICADA') NOT NULL,
  `motivo_falta` varchar(255) DEFAULT NULL,
  `id_usuario_edito` int(11) DEFAULT NULL,
  `fecha_edicion` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

En "Indices para tablas volcadas":

```sql
ALTER TABLE `asistencias`
  ADD PRIMARY KEY (`id_asistencia`),
  ADD UNIQUE KEY `uq_usuario_fecha` (`id_usuario`, `fecha`),
  ADD KEY `id_usuario_edito` (`id_usuario_edito`);
```

En "AUTO_INCREMENT de las tablas volcadas":

```sql
ALTER TABLE `asistencias`
  MODIFY `id_asistencia` int(11) NOT NULL AUTO_INCREMENT;
```

En "Filtros para tablas volcadas":

```sql
ALTER TABLE `asistencias`
  ADD CONSTRAINT `asistencias_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `asistencias_ibfk_2` FOREIGN KEY (`id_usuario_edito`) REFERENCES `usuarios` (`id_usuario`);
```

- [ ] **Step 5: Sincronizar `bd_megaelectraprod.sql` — módulo, permisos y rol_permiso**

En el `INSERT INTO \`modulos\`` (línea ~595-616), agregar antes del `;` final:

```sql
(21, 'SERVICIO_TECNICO', 'Servicio Técnico', 'wrench', 21),
(22, 'ASISTENCIA', 'Asistencia', 'clock', 22);
```

(reemplazando la línea `(21, 'SERVICIO_TECNICO', ...)` que hoy termina en `;` por la versión con `,` seguida de la fila 22).

En el `INSERT INTO \`permisos\`` (línea ~710 en adelante), agregar al final, antes del `;` de cierre de ese INSERT:

```sql
(227, 22, 'asistencia.marcar', 'Marcar Asistencia', 'Registrar la propia entrada/salida'),
(228, 22, 'asistencia.ver', 'Ver Asistencia', 'Ver el reporte de asistencia de todos los empleados'),
(229, 22, 'asistencia.editar', 'Editar Asistencia', 'Justificar faltas y corregir horas marcadas');
```

Después del `INSERT INTO \`rol_permiso\`` existente (línea ~1119 en adelante, que termina en `;`), agregar un segundo INSERT (no hace falta fusionarlo con el existente):

```sql
-- Permiso 'asistencia.marcar' para todos los roles
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT r.id_rol, 227 FROM `roles` r;

-- 'asistencia.ver' y 'asistencia.editar' solo ADMINISTRADOR
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 228),
(1, 229);
```

- [ ] **Step 6: Verificar**

Run: `grep -c "asistencia" "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/bd/bd_megaelectraprod.sql"`
Expected: al menos 10 (tabla `asistencias` en 4 secciones + módulo + 3 permisos + 2 inserts de rol_permiso, algunas líneas con más de una coincidencia).

- [ ] **Step 7: Commit**

No se commitea (los `.sql` de `bd/` están en `.gitignore`). Continuar a la Tarea 2.

---

### Task 2: Backend — geolocalización y horario en Sucursales/Usuarios

**Files:**
- Modify: `backend/controllers/sucursales.Controller.js:35-118` (`createSucursal`, `updateSucursal`)
- Modify: `backend/controllers/usuarios.Controller.js` (`getUsuarios`, `getUsuario`, `createUsuario`, `updateUsuario` — agregar `hora_entrada_esperada`/`hora_salida_esperada`, mismo patrón usado para `cargo` etc.)

**Interfaces:**
- Produces: `sucursales` API ahora acepta/devuelve `latitud, longitud, radio_metros`; `usuarios` API ahora acepta/devuelve `hora_entrada_esperada, hora_salida_esperada`.

- [ ] **Step 1: `createSucursal` — aceptar coordenadas y radio**

En `backend/controllers/sucursales.Controller.js:36`, reemplazar la desestructuración:

```js
const { id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta } = req.body;
```

por:

```js
const { id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta, latitud, longitud, radio_metros } = req.body;
```

Y en el `INSERT` (líneas 52-58), reemplazar:

```js
const [result] = await db.promise().query(
  `INSERT INTO sucursales (id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [empresaId, codigo.trim(), nombre.trim(), tipo,
   direccion ?? null, ciudad ?? null, telefono ?? null,
   responsable ?? null, es_punto_venta ? 1 : 1]
);
```

por:

```js
const [result] = await db.promise().query(
  `INSERT INTO sucursales (id_empresa, codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta, latitud, longitud, radio_metros)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [empresaId, codigo.trim(), nombre.trim(), tipo,
   direccion ?? null, ciudad ?? null, telefono ?? null,
   responsable ?? null, es_punto_venta ? 1 : 1,
   latitud ?? null, longitud ?? null, Number(radio_metros) > 0 ? Number(radio_metros) : 100]
);
```

- [ ] **Step 2: `updateSucursal` — aceptar coordenadas y radio**

En `backend/controllers/sucursales.Controller.js:82`, reemplazar:

```js
const { codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta, activo } = req.body;
```

por:

```js
const { codigo, nombre, tipo, direccion, ciudad, telefono, responsable, es_punto_venta, activo, latitud, longitud, radio_metros } = req.body;
```

Y en el `UPDATE` (líneas 88-96), reemplazar:

```js
const [result] = await db.promise().query(
  `UPDATE sucursales
   SET codigo = ?, nombre = ?, tipo = ?, direccion = ?,
       ciudad = ?, telefono = ?, responsable = ?, es_punto_venta = ?, activo = ?
   WHERE id_sucursal = ?`,
  [codigo.trim(), nombre.trim(), tipo, direccion ?? null,
   ciudad ?? null, telefono ?? null, responsable ?? null,
   es_punto_venta ? 1 : 0, activo !== undefined ? (activo ? 1 : 0) : 1, id]
);
```

por:

```js
const [result] = await db.promise().query(
  `UPDATE sucursales
   SET codigo = ?, nombre = ?, tipo = ?, direccion = ?,
       ciudad = ?, telefono = ?, responsable = ?, es_punto_venta = ?, activo = ?,
       latitud = ?, longitud = ?, radio_metros = ?
   WHERE id_sucursal = ?`,
  [codigo.trim(), nombre.trim(), tipo, direccion ?? null,
   ciudad ?? null, telefono ?? null, responsable ?? null,
   es_punto_venta ? 1 : 0, activo !== undefined ? (activo ? 1 : 0) : 1,
   latitud ?? null, longitud ?? null, Number(radio_metros) > 0 ? Number(radio_metros) : 100, id]
);
```

(`getSucursales`/`getSucursal` ya usan `SELECT s.*`/`SELECT *`, así que no necesitan cambios — las columnas nuevas ya vienen incluidas.)

- [ ] **Step 3: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check controllers/sucursales.Controller.js`
Expected: sin salida.

- [ ] **Step 4: `usuarios.Controller.js` — agregar horario esperado**

En `getUsuarios` y `getUsuario`, agregar `u.hora_entrada_esperada, u.hora_salida_esperada` al `SELECT`, junto a `u.fecha_nacimiento, u.fecha_ingreso` (mismo patrón usado para agregar esas columnas en la migración 21).

En `createUsuario`, agregar `hora_entrada_esperada, hora_salida_esperada` a la desestructuración de `req.body` y al `INSERT INTO usuarios (...)` con sus placeholders y valores `hora_entrada_esperada || null, hora_salida_esperada || null` (mismo patrón que `fecha_nacimiento`/`fecha_ingreso` en ese mismo INSERT).

En `updateUsuario`, agregar `hora_entrada_esperada, hora_salida_esperada` a la desestructuración de `req.body` (línea 121-125) y al `UPDATE` (línea 156-164) con el mismo patrón `hora_entrada_esperada || null, hora_salida_esperada || null`.

- [ ] **Step 5: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check controllers/usuarios.Controller.js`
Expected: sin salida.

- [ ] **Step 6: Prueba manual**

Con el backend corriendo: `PUT /api/sucursales/:id` con `{ ...datosExistentes, latitud: -17.783, longitud: -63.182, radio_metros: 150 }` y confirmar en `GET /api/sucursales/:id` que vuelven esos valores. Igual para un usuario con `hora_entrada_esperada: "08:00:00"`.

- [ ] **Step 7: Commit**

```bash
git add backend/controllers/sucursales.Controller.js backend/controllers/usuarios.Controller.js
git commit -m "$(cat <<'EOF'
feat: agregar geolocalización a sucursales y horario esperado a usuarios

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Backend — módulo de asistencia (marcar, listar, justificar)

**Files:**
- Create: `backend/controllers/asistencia.Controller.js`
- Create: `backend/routes/asistencia.Routes.js`
- Modify: `backend/app.js` (registrar la ruta, mismo patrón que las demás)

**Interfaces:**
- Consumes: `asistencias`, `usuarios` (con `hora_entrada_esperada`/`id_sucursal_default`), `sucursales` (con `latitud/longitud/radio_metros`) — de Tasks 1 y 2.
- Produces: `GET /api/asistencia/hoy`, `POST /api/asistencia/entrada`, `POST /api/asistencia/salida`, `GET /api/asistencia` (filtros), `PUT /api/asistencia/:id/justificar`.

- [ ] **Step 1: Crear el controlador con la función de distancia y "mi asistencia de hoy"**

Crear `backend/controllers/asistencia.Controller.js`:

```js
const db = require('../config/db');

// Distancia en metros entre dos coordenadas (fórmula haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/asistencia/hoy — estado del propio usuario logueado
const getMiAsistenciaHoy = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, hora_entrada, hora_salida, estado
       FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    res.json({ asistencia: rows[0] || null });
  } catch (err) {
    console.error('[getMiAsistenciaHoy]', err);
    res.status(500).json({ error: 'Error al obtener asistencia del día' });
  }
};

async function validarUbicacion(id_usuario, lat, lng) {
  const [rows] = await db.promise().query(
    `SELECT s.latitud, s.longitud, s.radio_metros, s.nombre AS sucursal_nombre
     FROM usuarios u JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
     WHERE u.id_usuario = ?`,
    [id_usuario]
  );
  if (rows.length === 0) return { ok: false, error: 'El usuario no tiene sucursal asignada' };
  const s = rows[0];
  if (s.latitud === null || s.longitud === null) {
    return { ok: false, error: `La sucursal "${s.sucursal_nombre}" no tiene ubicación configurada. Contactá al administrador.` };
  }
  const distancia = distanciaMetros(Number(s.latitud), Number(s.longitud), lat, lng);
  if (distancia > s.radio_metros) {
    return { ok: false, error: `Estás a ${Math.round(distancia)} m de tu sucursal (máximo permitido: ${s.radio_metros} m).` };
  }
  return { ok: true };
}

module.exports = { getMiAsistenciaHoy, validarUbicacion, distanciaMetros };
```

- [ ] **Step 2: Verificar sintaxis parcial**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check controllers/asistencia.Controller.js`
Expected: sin salida.

- [ ] **Step 3: Agregar `marcarEntrada` y `marcarSalida`**

Agregar al mismo archivo, antes de `module.exports`:

```js
// POST /api/asistencia/entrada  body: { lat, lng }
const marcarEntrada = async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Ubicación GPS requerida' });
  }
  try {
    const [existe] = await db.promise().query(
      `SELECT id_asistencia FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    if (existe.length > 0) {
      return res.status(400).json({ error: 'Ya marcaste entrada hoy' });
    }

    const val = await validarUbicacion(req.user.id_usuario, Number(lat), Number(lng));
    if (!val.ok) return res.status(400).json({ error: val.error });

    const [[u]] = await db.promise().query(
      `SELECT hora_entrada_esperada FROM usuarios WHERE id_usuario = ?`, [req.user.id_usuario]
    );

    let estado = 'PRESENTE';
    if (u.hora_entrada_esperada) {
      const [h, m] = u.hora_entrada_esperada.split(':').map(Number);
      const esperada = new Date();
      esperada.setHours(h, m + 10, 0, 0); // 10 min de tolerancia
      if (new Date() > esperada) estado = 'TARDANZA';
    }

    await db.promise().query(
      `INSERT INTO asistencias (id_usuario, fecha, hora_entrada, lat_entrada, lng_entrada, estado)
       VALUES (?, CURDATE(), CURTIME(), ?, ?, ?)`,
      [req.user.id_usuario, lat, lng, estado]
    );
    res.status(201).json({ mensaje: 'Entrada registrada', estado });
  } catch (err) {
    console.error('[marcarEntrada]', err);
    res.status(500).json({ error: 'Error al marcar entrada' });
  }
};

// POST /api/asistencia/salida  body: { lat, lng }
const marcarSalida = async (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Ubicación GPS requerida' });
  }
  try {
    const [rows] = await db.promise().query(
      `SELECT id_asistencia, hora_salida FROM asistencias WHERE id_usuario = ? AND fecha = CURDATE()`,
      [req.user.id_usuario]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Todavía no marcaste entrada hoy' });
    if (rows[0].hora_salida) return res.status(400).json({ error: 'Ya marcaste salida hoy' });

    const val = await validarUbicacion(req.user.id_usuario, Number(lat), Number(lng));
    if (!val.ok) return res.status(400).json({ error: val.error });

    await db.promise().query(
      `UPDATE asistencias SET hora_salida = CURTIME(), lat_salida = ?, lng_salida = ? WHERE id_asistencia = ?`,
      [lat, lng, rows[0].id_asistencia]
    );
    res.json({ mensaje: 'Salida registrada' });
  } catch (err) {
    console.error('[marcarSalida]', err);
    res.status(500).json({ error: 'Error al marcar salida' });
  }
};
```

Y actualizar el `module.exports` al final:

```js
module.exports = { getMiAsistenciaHoy, marcarEntrada, marcarSalida, validarUbicacion, distanciaMetros, getAsistencias, justificarFalta, generarFaltasDelDia };
```

(las últimas tres se agregan en los pasos siguientes de esta misma tarea)

- [ ] **Step 4: Agregar `getAsistencias` (listado con filtros) y `justificarFalta`**

Agregar al mismo archivo, antes de `module.exports`:

```js
// GET /api/asistencia?fecha_desde=&fecha_hasta=&id_usuario=&id_sucursal=&estado=
const getAsistencias = async (req, res) => {
  const { fecha_desde, fecha_hasta, id_usuario, id_sucursal, estado } = req.query;
  const cond = [];
  const params = [];
  if (fecha_desde) { cond.push('a.fecha >= ?'); params.push(fecha_desde); }
  if (fecha_hasta) { cond.push('a.fecha <= ?'); params.push(fecha_hasta); }
  if (id_usuario)  { cond.push('a.id_usuario = ?'); params.push(id_usuario); }
  if (id_sucursal) { cond.push('u.id_sucursal_default = ?'); params.push(id_sucursal); }
  if (estado)      { cond.push('a.estado = ?'); params.push(estado); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

  try {
    const [rows] = await db.promise().query(
      `SELECT a.id_asistencia, a.fecha, a.hora_entrada, a.hora_salida, a.estado, a.motivo_falta,
              CONCAT(u.nombres, ' ', u.apellidos) AS empleado, u.id_usuario,
              s.nombre AS sucursal_nombre
       FROM asistencias a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       LEFT JOIN sucursales s ON s.id_sucursal = u.id_sucursal_default
       ${where}
       ORDER BY a.fecha DESC, empleado ASC
       LIMIT 500`,
      params
    );
    res.json({ asistencias: rows });
  } catch (err) {
    console.error('[getAsistencias]', err);
    res.status(500).json({ error: 'Error al obtener asistencias' });
  }
};

// PUT /api/asistencia/:id/justificar  body: { motivo }
const justificarFalta = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  if (!motivo?.trim()) return res.status(400).json({ error: 'El motivo es requerido' });
  try {
    const [result] = await db.promise().query(
      `UPDATE asistencias SET estado = 'JUSTIFICADA', motivo_falta = ?, id_usuario_edito = ?, fecha_edicion = NOW()
       WHERE id_asistencia = ? AND estado = 'FALTA'`,
      [motivo.trim(), req.user.id_usuario, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado o no está en estado FALTA' });
    }
    res.json({ mensaje: 'Falta justificada' });
  } catch (err) {
    console.error('[justificarFalta]', err);
    res.status(500).json({ error: 'Error al justificar falta' });
  }
};

// Genera faltas del día anterior para usuarios activos con horario asignado
// que no tengan fila de asistencia ese día. Usado por el cron (Task 4).
const generarFaltasDelDia = async (fechaISO) => {
  const [pendientes] = await db.promise().query(
    `SELECT u.id_usuario FROM usuarios u
     WHERE u.activo = 1 AND u.hora_entrada_esperada IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM asistencias a WHERE a.id_usuario = u.id_usuario AND a.fecha = ?)`,
    [fechaISO]
  );
  for (const u of pendientes) {
    await db.promise().query(
      `INSERT INTO asistencias (id_usuario, fecha, estado) VALUES (?, ?, 'FALTA')`,
      [u.id_usuario, fechaISO]
    );
  }
  return pendientes.length;
};
```

- [ ] **Step 5: Verificar sintaxis completa**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check controllers/asistencia.Controller.js`
Expected: sin salida.

- [ ] **Step 6: Crear las rutas**

Crear `backend/routes/asistencia.Routes.js`:

```js
const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/asistencia.Controller');

router.get('/hoy',              authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.getMiAsistenciaHoy);
router.post('/entrada',         authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.marcarEntrada);
router.post('/salida',          authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.marcarSalida);
router.get('/',                 authMiddleware, checkPermission('ver',    'asistencia'), ctrl.getAsistencias);
router.put('/:id/justificar',   authMiddleware, checkPermission('editar', 'asistencia'), ctrl.justificarFalta);

module.exports = router;
```

- [ ] **Step 7: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check routes/asistencia.Routes.js`
Expected: sin salida.

- [ ] **Step 8: Registrar la ruta en `app.js`**

Buscar en `backend/app.js` el patrón de registro de otra ruta existente (ej. `app.use('/api/auditoria', require('./routes/auditoria.Routes'))`) y agregar junto a él:

```js
app.use('/api/asistencia', require('./routes/asistencia.Routes'));
```

- [ ] **Step 9: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check app.js`
Expected: sin salida.

- [ ] **Step 10: Prueba manual**

Con el backend corriendo y un usuario de prueba con `id_sucursal_default` apuntando a una sucursal con `latitud/longitud/radio_metros` ya configurados (Task 2): `POST /api/asistencia/entrada` con `{lat, lng}` dentro del radio → 201 y estado PRESENTE/TARDANZA según la hora; repetir el mismo día → 400 "Ya marcaste entrada hoy"; probar con coordenadas lejanas → 400 con la distancia detectada. Luego `POST /api/asistencia/salida` → 200. Verificar `GET /api/asistencia?fecha_desde=hoy&fecha_hasta=hoy` devuelve la fila.

- [ ] **Step 11: Commit**

```bash
git add backend/controllers/asistencia.Controller.js backend/routes/asistencia.Routes.js backend/app.js
git commit -m "$(cat <<'EOF'
feat: módulo de asistencia con validación GPS (marcar, listar, justificar)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Backend — cron de faltas automáticas

**Files:**
- Create: `backend/cron/asistenciaScheduler.js`
- Modify: `backend/app.js` (inicializar el scheduler, mismo patrón que `backupScheduler`)

**Interfaces:**
- Consumes: `generarFaltasDelDia(fechaISO)` de `backend/controllers/asistencia.Controller.js` (Task 3).

- [ ] **Step 1: Crear el scheduler**

Crear `backend/cron/asistenciaScheduler.js`, siguiendo el mismo patrón que `backend/cron/backupScheduler.js`:

```js
const cron = require('node-cron');

async function ejecutarGeneracionFaltas() {
  try {
    const { generarFaltasDelDia } = require('../controllers/asistencia.Controller');
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaISO = ayer.toISOString().slice(0, 10);

    const total = await generarFaltasDelDia(fechaISO);
    console.log(`✅ Faltas generadas para ${fechaISO}: ${total}`);
  } catch (e) {
    console.error('❌ Error al generar faltas automáticas:', e.message);
  }
}

function iniciar() {
  // Todos los días a las 00:30, genera las faltas del día anterior
  cron.schedule('30 0 * * *', ejecutarGeneracionFaltas, { timezone: 'America/La_Paz' });
  console.log('⏰ Generación de faltas automática programada: diario a las 00:30');
}

module.exports = { iniciar };
```

- [ ] **Step 2: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check cron/asistenciaScheduler.js`
Expected: sin salida.

- [ ] **Step 3: Registrar en `app.js`**

Junto a `const backupScheduler = require('./cron/backupScheduler');` (línea 41 de `backend/app.js`), agregar:

```js
const asistenciaScheduler = require('./cron/asistenciaScheduler');
```

Junto a `backupScheduler.iniciar();` (línea 123), agregar:

```js
asistenciaScheduler.iniciar();
```

- [ ] **Step 4: Verificar sintaxis**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node --check app.js`
Expected: sin salida.

- [ ] **Step 5: Prueba manual**

En una consola de Node dentro de `backend/` con la conexión a la BD disponible, ejecutar directamente la función para no esperar al cron:

```bash
cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/backend" && node -e "require('./controllers/asistencia.Controller').generarFaltasDelDia('2026-09-02').then(n => { console.log('faltas creadas:', n); process.exit(0); })"
```

Confirmar que crea filas `estado='FALTA'` para los usuarios activos con horario asignado que no tenían asistencia esa fecha, y que correrlo dos veces no duplica (la segunda vez debe dar `0` gracias al `NOT EXISTS`).

- [ ] **Step 6: Commit**

```bash
git add backend/cron/asistenciaScheduler.js backend/app.js
git commit -m "$(cat <<'EOF'
feat: generar faltas de asistencia automáticamente cada día

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Frontend — servicios y campos de ubicación/horario

**Files:**
- Create: `frontend/src/services/asistencia.service.js`
- Modify: `frontend/src/services/sucursales.service.js` (sin cambios de firma, ya pasa el `form` completo — verificar)
- Modify: `frontend/src/pages/configuracion/Sucursales.jsx` (campos latitud/longitud/radio + botón "Usar mi ubicación")
- Modify: `frontend/src/pages/usuarios/Usuarios.jsx` (campos de horario esperado)

**Interfaces:**
- Produces: `asistenciaService` con `getHoy()`, `marcarEntrada({lat,lng})`, `marcarSalida({lat,lng})`, `getAsistencias(params)`, `justificar(id, motivo)`.

- [ ] **Step 1: Crear el servicio de asistencia**

Crear `frontend/src/services/asistencia.service.js` (mismo patrón que `auditoria.service.js`):

```js
import api from './api';

export const asistenciaService = {
  getHoy:          ()          => api.get('/asistencia/hoy'),
  marcarEntrada:   (coords)    => api.post('/asistencia/entrada', coords),
  marcarSalida:    (coords)    => api.post('/asistencia/salida', coords),
  getAsistencias:  (params)    => api.get('/asistencia', { params }),
  justificar:      (id, motivo) => api.put(`/asistencia/${id}/justificar`, { motivo }),
};
```

(confirmar el import real de `api` mirando el encabezado de `frontend/src/services/auditoria.service.js` — usar exactamente ese mismo import, ya sea `import api from './api'` u otra ruta relativa equivalente).

- [ ] **Step 2: Agregar campos de ubicación al formulario de Sucursales**

En `frontend/src/pages/configuracion/Sucursales.jsx:8`, ampliar `EMPTY`:

```jsx
const EMPTY = { codigo: '', nombre: '', tipo: 'SUCURSAL', direccion: '', ciudad: '', telefono: '', responsable: '', es_punto_venta: true, activo: true, latitud: '', longitud: '', radio_metros: 100 };
```

Después del campo `responsable` (línea 276), agregar:

```jsx
<div className="sm:col-span-2">
  <label className={labelCls}>Ubicación (para marcar asistencia)</label>
  <div className="flex flex-wrap gap-2 items-center">
    <input name="latitud" value={form.latitud ?? ''} onChange={handleChange} className={`${inputCls} w-36`} placeholder="Latitud" />
    <input name="longitud" value={form.longitud ?? ''} onChange={handleChange} className={`${inputCls} w-36`} placeholder="Longitud" />
    <input name="radio_metros" type="number" min="10" value={form.radio_metros ?? 100} onChange={handleChange} className={`${inputCls} w-28`} placeholder="Radio (m)" />
    <button
      type="button"
      onClick={() => {
        if (!navigator.geolocation) return alert('Este navegador no soporta geolocalización');
        navigator.geolocation.getCurrentPosition(
          (pos) => setForm(f => ({ ...f, latitud: pos.coords.latitude.toFixed(7), longitud: pos.coords.longitude.toFixed(7) })),
          () => alert('No se pudo obtener la ubicación. Revisá los permisos del navegador.')
        );
      }}
      className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold rounded-xl transition-colors"
    >
      Usar mi ubicación actual
    </button>
  </div>
  <p className="text-xs text-zinc-400 mt-1">Parate en la sucursal y tocá el botón, o pegá las coordenadas de Google Maps.</p>
</div>
```

(usar los nombres reales de las variables `labelCls`/`inputCls`/`handleChange`/`setForm` ya definidas en ese archivo — confirmarlos leyendo el componente antes de pegar el bloque, por si el archivo usa otro nombre como `INPUT`/`LABEL`).

- [ ] **Step 3: Build de verificación (Sucursales)**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/frontend" && npx vite build --logLevel warn 2>&1 | tail -25`
Expected: solo el warning preexistente de chunks.

- [ ] **Step 4: Prueba manual (Sucursales)**

En el navegador, abrir Configuración → Sucursales, editar una sucursal, tocar "Usar mi ubicación actual" (aceptar el permiso del navegador) y confirmar que se llenan latitud/longitud; guardar y volver a abrir para confirmar que persistió.

- [ ] **Step 5: Agregar campos de horario esperado al formulario de Usuarios**

En `frontend/src/pages/usuarios/Usuarios.jsx`, en el objeto `EMPTY` (ya ampliado en la feature anterior con `cargo`, `fecha_nacimiento`, etc.), agregar:

```jsx
hora_entrada_esperada: '', hora_salida_esperada: '',
```

En el formulario JSX, junto a los campos de fecha de nacimiento/ingreso ya existentes, agregar dos inputs `type="time"`:

```jsx
<div>
  <label className={LABEL}>Hora de entrada esperada</label>
  <input type="time" name="hora_entrada_esperada" value={form.hora_entrada_esperada || ''} onChange={handleChange} className={INPUT} />
</div>
<div>
  <label className={LABEL}>Hora de salida esperada</label>
  <input type="time" name="hora_salida_esperada" value={form.hora_salida_esperada || ''} onChange={handleChange} className={INPUT} />
</div>
```

(usar los nombres reales `LABEL`/`INPUT`/`handleChange` ya presentes en el archivo, mismos que usan los campos de fecha vecinos).

- [ ] **Step 6: Build de verificación (Usuarios)**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/frontend" && npx vite build --logLevel warn 2>&1 | tail -25`
Expected: solo el warning preexistente de chunks.

- [ ] **Step 7: Prueba manual (Usuarios)**

Editar un usuario de prueba, poner hora de entrada 08:00 y salida 18:00, guardar, reabrir el formulario y confirmar que los valores persistieron.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/services/asistencia.service.js frontend/src/pages/configuracion/Sucursales.jsx frontend/src/pages/usuarios/Usuarios.jsx
git commit -m "$(cat <<'EOF'
feat: configurar ubicación de sucursales y horario esperado por usuario

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Frontend — pantalla "Mi Asistencia" (marcar entrada/salida)

**Files:**
- Create: `frontend/src/pages/asistencia/MiAsistencia.jsx`
- Modify: `frontend/src/App.jsx` (import + ruta `/mi-asistencia`)
- Modify: `frontend/src/components/sidebar.jsx` (entrada de menú)

**Interfaces:**
- Consumes: `asistenciaService.getHoy/marcarEntrada/marcarSalida` (Task 5).

- [ ] **Step 1: Crear la página**

Crear `frontend/src/pages/asistencia/MiAsistencia.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { asistenciaService } from '../../services/asistencia.service';

const ESTADO_LABEL = { PRESENTE: 'A tiempo', TARDANZA: 'Con tardanza' };

function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Este navegador no soporta geolocalización'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('No se pudo obtener tu ubicación. Revisá los permisos del navegador.'))
    );
  });
}

export default function MiAsistencia() {
  const [hoy, setHoy]         = useState(null);
  const [cargando, setCargando] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [error, setError]     = useState(null);

  const cargar = () => {
    setCargando(true);
    asistenciaService.getHoy()
      .then(r => setHoy(r.data.asistencia))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const marcar = async (tipo) => {
    setError(null);
    setMarcando(true);
    try {
      const coords = await obtenerUbicacion();
      if (tipo === 'entrada') await asistenciaService.marcarEntrada(coords);
      else await asistenciaService.marcarSalida(coords);
      cargar();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Error al marcar');
    } finally {
      setMarcando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Mi Asistencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-center space-y-4">
        {cargando ? (
          <p className="text-sm text-zinc-400">Cargando…</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Entrada</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{hoy?.hora_entrada || '—'}</p>
              {hoy?.estado && <p className="text-xs text-amber-500 font-medium">{ESTADO_LABEL[hoy.estado] || hoy.estado}</p>}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Salida</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{hoy?.hora_salida || '—'}</p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl p-3">{error}</p>}

            {!hoy?.hora_entrada ? (
              <button onClick={() => marcar('entrada')} disabled={marcando}
                className="w-full py-3 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {marcando ? 'Obteniendo ubicación…' : 'Marcar entrada'}
              </button>
            ) : !hoy?.hora_salida ? (
              <button onClick={() => marcar('salida')} disabled={marcando}
                className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {marcando ? 'Obteniendo ubicación…' : 'Marcar salida'}
              </button>
            ) : (
              <p className="text-sm text-zinc-400">Turno cerrado por hoy.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `App.jsx`**

Junto a `import Auditoria from './pages/auditoria/Auditoria';` (línea 74), agregar:

```jsx
import MiAsistencia from './pages/asistencia/MiAsistencia';
```

Junto al bloque de la ruta `/auditoria` (línea 468-470), agregar:

```jsx
<Route path="/mi-asistencia" element={
  <PageRoute action="marcar" subject="asistencia"><MiAsistencia /></PageRoute>
} />
```

- [ ] **Step 3: Agregar la entrada de menú**

En `frontend/src/components/sidebar.jsx`, agregar un nuevo grupo (junto al de "Auditoría", línea 162-167):

```jsx
{
  label: 'Asistencia',
  items: [
    { label: 'Mi Asistencia', path: '/mi-asistencia', icon: 'clock', action: 'marcar', subject: 'asistencia' },
  ],
},
```

- [ ] **Step 4: Build de verificación**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/frontend" && npx vite build --logLevel warn 2>&1 | tail -25`
Expected: solo el warning preexistente de chunks.

- [ ] **Step 5: Prueba manual en navegador**

Loguearse con un usuario de prueba (sucursal con ubicación configurada en Task 5), ir a "Mi Asistencia", tocar "Marcar entrada" (aceptar el permiso de ubicación del navegador) — confirmar que aparece la hora y el estado; recargar la página y confirmar que persiste; tocar "Marcar salida" y confirmar. Probar también estando fuera del radio (o con un `radio_metros` bajo temporalmente) para confirmar el mensaje de error.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/asistencia/MiAsistencia.jsx frontend/src/App.jsx frontend/src/components/sidebar.jsx
git commit -m "$(cat <<'EOF'
feat: pantalla Mi Asistencia para marcar entrada/salida con GPS

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Frontend — reporte de Asistencia (administrador)

**Files:**
- Create: `frontend/src/pages/asistencia/Asistencia.jsx`
- Modify: `frontend/src/App.jsx` (import + ruta `/asistencia`)
- Modify: `frontend/src/components/sidebar.jsx` (entrada de menú, mismo grupo "Asistencia" de Task 6)

**Interfaces:**
- Consumes: `asistenciaService.getAsistencias/justificar` (Task 5); reutiliza el patrón visual de filtros + tabla/cards ya usado en `frontend/src/pages/auditoria/Auditoria.jsx` (`TabAuditoria`).

- [ ] **Step 1: Crear la página**

Crear `frontend/src/pages/asistencia/Asistencia.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { asistenciaService } from '../../services/asistencia.service';

const hoy       = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const INPUT = 'w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-yellow-400';
const LABEL = 'text-xs text-zinc-500 dark:text-zinc-400 font-medium block mb-1';

const ESTADO_COLOR = {
  PRESENTE:   'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  TARDANZA:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  FALTA:      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  JUSTIFICADA:'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
};

function EstadoBadge({ estado }) {
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${ESTADO_COLOR[estado] || ''}`}>{estado}</span>;
}

function ModalJustificar({ row, onClose, onGuardado }) {
  const [motivo, setMotivo]     = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError]       = useState(null);

  if (!row) return null;

  const guardar = async () => {
    if (!motivo.trim()) return setError('El motivo es requerido');
    setGuardando(true);
    setError(null);
    try {
      await asistenciaService.justificar(row.id_asistencia, motivo.trim());
      onGuardado();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al justificar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Justificar falta — {row.empleado}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{row.fecha}</p>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
          placeholder="Motivo (permiso, enfermedad, etc.)" className={INPUT} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            className="px-4 py-2 text-sm rounded-xl bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Justificar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Asistencia() {
  const [filas, setFilas]       = useState([]);
  const [cargando, setCargando] = useState(false);
  const [justificarRow, setJustificarRow] = useState(null);
  const [filtros, setFiltros]   = useState({
    fecha_desde: inicioMes(), fecha_hasta: hoy(), estado: '',
  });

  const buscar = useCallback(() => {
    setCargando(true);
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== ''));
    asistenciaService.getAsistencias(params)
      .then(r => setFilas(r.data.asistencias))
      .finally(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);

  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const resumen = filas.reduce((acc, r) => { acc[r.estado] = (acc[r.estado] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {justificarRow && (
        <ModalJustificar row={justificarRow} onClose={() => setJustificarRow(null)}
          onGuardado={() => { setJustificarRow(null); buscar(); }} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Asistencia</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Reporte de entrada/salida de empleados</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-36">
          <label className={LABEL}>Desde</label>
          <input type="date" value={filtros.fecha_desde} onChange={e => f('fecha_desde', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-36">
          <label className={LABEL}>Hasta</label>
          <input type="date" value={filtros.fecha_hasta} onChange={e => f('fecha_hasta', e.target.value)} className={INPUT} />
        </div>
        <div className="w-full sm:w-40">
          <label className={LABEL}>Estado</label>
          <select value={filtros.estado} onChange={e => f('estado', e.target.value)} className={INPUT}>
            <option value="">Todos</option>
            <option value="PRESENTE">Presente</option>
            <option value="TARDANZA">Tardanza</option>
            <option value="FALTA">Falta</option>
            <option value="JUSTIFICADA">Justificada</option>
          </select>
        </div>
        <button onClick={buscar} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold text-sm rounded-xl transition-colors">
          Consultar
        </button>
      </div>

      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm">
        <span>Total: <strong>{filas.length}</strong></span>
        <span>Presentes: <strong>{resumen.PRESENTE || 0}</strong></span>
        <span>Tardanzas: <strong>{resumen.TARDANZA || 0}</strong></span>
        <span>Faltas: <strong>{resumen.FALTA || 0}</strong></span>
        <span>Justificadas: <strong>{resumen.JUSTIFICADA || 0}</strong></span>
      </div>

      {cargando ? (
        <p className="text-center py-16 text-zinc-400 text-sm">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-center py-16 text-zinc-400 text-sm">Sin registros en este período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {['Fecha', 'Empleado', 'Sucursal', 'Entrada', 'Salida', 'Estado', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filas.map(row => (
                <tr key={row.id_asistencia} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-3 py-2.5 text-xs font-mono text-zinc-500">{row.fecha}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-800 dark:text-zinc-200">{row.empleado}</td>
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{row.sucursal_nombre || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.hora_entrada || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.hora_salida || '—'}</td>
                  <td className="px-3 py-2.5"><EstadoBadge estado={row.estado} /></td>
                  <td className="px-3 py-2.5 text-right">
                    {row.estado === 'FALTA' && (
                      <button onClick={() => setJustificarRow(row)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                        Justificar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `App.jsx`**

Junto al import de `MiAsistencia` (Task 6, Step 2), agregar:

```jsx
import Asistencia from './pages/asistencia/Asistencia';
```

Junto a la ruta `/mi-asistencia`, agregar:

```jsx
<Route path="/asistencia" element={
  <PageRoute action="ver" subject="asistencia"><Asistencia /></PageRoute>
} />
```

- [ ] **Step 3: Agregar la entrada de menú**

En el mismo grupo `Asistencia` creado en Task 6, Step 3, agregar una segunda entrada:

```jsx
{
  label: 'Asistencia',
  items: [
    { label: 'Mi Asistencia', path: '/mi-asistencia', icon: 'clock', action: 'marcar', subject: 'asistencia' },
    { label: 'Reporte',       path: '/asistencia',     icon: 'list',  action: 'ver',    subject: 'asistencia' },
  ],
},
```

- [ ] **Step 4: Build de verificación**

Run: `cd "d:/TODO/SISTEMAS/SIS-ELECTRODOMESTICOS/frontend" && npx vite build --logLevel warn 2>&1 | tail -25`
Expected: solo el warning preexistente de chunks.

- [ ] **Step 5: Prueba manual en navegador**

Como ADMINISTRADOR: ir a Asistencia → Reporte, confirmar que aparecen las marcaciones de prueba de la Task 6, que los contadores del resumen coinciden, y que una fila con FALTA (generada manualmente en la prueba del cron, Task 4) se puede justificar y pasa a estado JUSTIFICADA. Confirmar también que un usuario sin permiso `asistencia.ver` no ve la opción "Reporte" en el menú ni puede entrar a `/asistencia` directamente por URL.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/asistencia/Asistencia.jsx frontend/src/App.jsx frontend/src/components/sidebar.jsx
git commit -m "$(cat <<'EOF'
feat: pantalla de reporte de asistencia con justificación de faltas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
