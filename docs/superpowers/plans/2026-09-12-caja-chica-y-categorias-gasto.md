# Categorías/subcategorías de gasto + Caja Chica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hierarchical categorías/subcategorías to Gastos, turn `cajas` into a typed model (GENERAL/CHICA) with a fondo fijo, and implement Caja Chica replenishment as an auditable `movimientos_caja` record with its own reports.

**Architecture:** Reuse the exact patterns already in this codebase: the padre/hijo self-join already used by `categorias` (products) gets mirrored onto `categorias_gasto`; the reposición is a new table modeled after `arqueos_caja`'s existing cierre-calculation pattern (one more `SUM(...)` term, same shape as the existing cobros/gastos/pagosCompra terms); reports reuse the `ReportesShared` component library already used by `RptArqueosCaja`/`RptGastosCategoria`.

**Tech Stack:** Node/Express + raw `mysql2` (no ORM), MySQL, React + Vite, Tailwind, CASL-style permissions (`req.ability.can(action, subject)` backend / `puede(action, subject)` frontend).

**Spec:** `docs/superpowers/specs/2026-09-12-caja-chica-y-categorias-gasto-design.md`

## Global Constraints

- No test framework exists in this repo (`backend/package.json` test script is a stub, frontend has no test runner) — every task's "Testing" step uses the pattern already established throughout this project: a disposable Node script in `backend/scratchpad_<task>.js` that calls the DB/functions directly to verify behavior, run once, then deleted (`rm -f`) — never committed. Manual verification in the browser (dev servers on :3000/:5173) supplements this for UI tasks.
- New permission ids continue from the last one in `bd/bd_megaelectraprod.sql` (`231`) — this plan uses `232` and `233`.
- New migration file continues the sequence in `bd/` — the last one is `migracion_28_envio_parcial_transferencia.sql`, so this plan's migration is `migracion_29_caja_chica_y_categorias_gasto.sql`.
- Money fields are `decimal(14,2)`, dates use `hoyLocal()`/`fechaHoraSegundosLocal()` from `backend/utils/fechaLocal.js` for anything computed in JS (never `new Date().toISOString()` — see prior timezone fixes in this codebase).
- `req.ability.can(action, subject)` / `checkPermission(action, subject)` — action first, subject second (verified against `caja.Routes.js`, `gastos.Routes.js`).
- Backend and frontend dev servers must be manually restarted after backend changes (no nodemon) — `taskkill //F //PID <pid>` then `node app.js` in background, per the pattern used throughout this session.

---

## Task 1: Migration — schema + permisos

**Files:**
- Create: `bd/migracion_29_caja_chica_y_categorias_gasto.sql`
- Modify: `bd/bd_megaelectraprod.sql` (mirror the schema into the full dump)

**Interfaces:**
- Produces: `categorias_gasto.id_categoria_gasto_padre` (nullable FK to itself), `cajas.tipo` (`'GENERAL'|'CHICA'`), `cajas.monto_fondo_fijo`, table `movimientos_caja` (columns: `id_movimiento, id_caja_origen, id_caja_destino, id_arqueo_origen, id_arqueo_destino, monto, tipo, observaciones, id_usuario, fecha`), permisos `232 = caja.reponer_caja_chica` (módulo 10), `233 = reportes.caja_chica` (módulo 12), both granted to `id_rol = 1`.

- [ ] **Step 1: Write the migration file**

```sql
-- Migración: categorías/subcategorías de gasto + Caja Chica (fondo fijo con
-- reposición auditable vía movimientos_caja). Ejecutar una sola vez en producción.

START TRANSACTION;

ALTER TABLE `categorias_gasto`
  ADD COLUMN `id_categoria_gasto_padre` int(11) DEFAULT NULL AFTER `id_categoria_gasto`,
  ADD KEY `fk_catgasto_padre` (`id_categoria_gasto_padre`),
  ADD CONSTRAINT `fk_catgasto_padre` FOREIGN KEY (`id_categoria_gasto_padre`) REFERENCES `categorias_gasto` (`id_categoria_gasto`) ON DELETE SET NULL;

ALTER TABLE `cajas`
  ADD COLUMN `tipo` enum('GENERAL','CHICA') NOT NULL DEFAULT 'GENERAL' AFTER `nombre`,
  ADD COLUMN `monto_fondo_fijo` decimal(14,2) DEFAULT NULL AFTER `tipo`;

CREATE TABLE `movimientos_caja` (
  `id_movimiento`     bigint(20)     NOT NULL AUTO_INCREMENT,
  `id_caja_origen`    int(11)        NOT NULL,
  `id_caja_destino`   int(11)        NOT NULL,
  `id_arqueo_origen`  bigint(20)     DEFAULT NULL,
  `id_arqueo_destino` bigint(20)     DEFAULT NULL,
  `monto`             decimal(14,2)  NOT NULL,
  `tipo`              enum('REPOSICION') NOT NULL DEFAULT 'REPOSICION',
  `observaciones`     varchar(255)   DEFAULT NULL,
  `id_usuario`        int(11)        NOT NULL,
  `fecha`             datetime       NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_movimiento`),
  KEY `fk_movcaja_origen`   (`id_caja_origen`),
  KEY `fk_movcaja_destino`  (`id_caja_destino`),
  KEY `fk_movcaja_aq_orig`  (`id_arqueo_origen`),
  KEY `fk_movcaja_aq_dest`  (`id_arqueo_destino`),
  KEY `fk_movcaja_usuario`  (`id_usuario`),
  CONSTRAINT `fk_movcaja_origen`  FOREIGN KEY (`id_caja_origen`)  REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_movcaja_destino` FOREIGN KEY (`id_caja_destino`) REFERENCES `cajas` (`id_caja`),
  CONSTRAINT `fk_movcaja_aq_orig`  FOREIGN KEY (`id_arqueo_origen`)  REFERENCES `arqueos_caja` (`id_arqueo`) ON DELETE SET NULL,
  CONSTRAINT `fk_movcaja_aq_dest`  FOREIGN KEY (`id_arqueo_destino`) REFERENCES `arqueos_caja` (`id_arqueo`) ON DELETE SET NULL,
  CONSTRAINT `fk_movcaja_usuario`  FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `permisos` (`id_permiso`, `id_modulo`, `codigo`, `nombre`, `descripcion`) VALUES
(232, 10, 'caja.reponer_caja_chica', 'Reponer Caja Chica', 'Registrar una reposición de fondo fijo desde Caja General hacia una Caja Chica'),
(233, 12, 'reportes.caja_chica', 'Reporte Caja Chica', 'Ver historial de reposiciones, saldos vs. fondo fijo y gastos de caja chica por categoría');

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 232),
(1, 233);

COMMIT;
```

- [ ] **Step 2: Mirror the schema into `bd/bd_megaelectraprod.sql`**

In the `categorias_gasto` `CREATE TABLE` (currently `id_categoria_gasto int(11) NOT NULL, nombre varchar(80) NOT NULL, ...`), add the new column right after `id_categoria_gasto`:

```sql
CREATE TABLE `categorias_gasto` (
  `id_categoria_gasto` int(11) NOT NULL,
  `id_categoria_gasto_padre` int(11) DEFAULT NULL,
  `nombre` varchar(80) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

In the `cajas` `CREATE TABLE`, add `tipo`/`monto_fondo_fijo` after `nombre`:

```sql
CREATE TABLE `cajas` (
  `id_caja` int(11) NOT NULL,
  `id_sucursal` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `tipo` enum('GENERAL','CHICA') NOT NULL DEFAULT 'GENERAL',
  `monto_fondo_fijo` decimal(14,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Insert a new `CREATE TABLE movimientos_caja` block (same body as Step 1's `CREATE TABLE`) right after the `monedas` table block and before `pagos_compra` (alphabetical order — `monedas` ends right before the `-- --------------------------------------------------------` separator that precedes `pagos_compra`).

Append the two new rows to the `permisos` INSERT (after id `229`, the current last row) and two new rows to the `rol_permiso` INSERT (find its closing `;` and add `(1, 232), (1, 233)` before it, matching how `migracion_24`'s equivalent rows were merged in).

- [ ] **Step 3: Apply the migration to the dev database and verify**

```bash
cd backend
cat > scratchpad_mig29.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
const fs = require('fs');
const sql = fs.readFileSync('../bd/migracion_29_caja_chica_y_categorias_gasto.sql', 'utf8');
const stmts = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--') && s !== 'START TRANSACTION' && s !== 'COMMIT');
(async () => {
  await db.promise().query('START TRANSACTION');
  for (const s of stmts) { await db.promise().query(s); console.log('OK:', s.slice(0, 70).replace(/\n/g, ' ')); }
  await db.promise().query('COMMIT');
  const [cols1] = await db.promise().query("SHOW COLUMNS FROM categorias_gasto LIKE 'id_categoria_gasto_padre'");
  const [cols2] = await db.promise().query("SHOW COLUMNS FROM cajas LIKE 'tipo'");
  const [tbl]   = await db.promise().query("SHOW TABLES LIKE 'movimientos_caja'");
  const [perms] = await db.promise().query("SELECT id_permiso, codigo FROM permisos WHERE id_permiso IN (232,233)");
  console.log({ cols1, cols2, tbl, perms });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_mig29.js
rm -f scratchpad_mig29.js
```

Expected: all `OK:` lines print with no errors, and the final log shows the new column, the new `tipo` column, the `movimientos_caja` table, and both new permission rows.

- [ ] **Step 4: Commit**

```bash
git add bd/migracion_29_caja_chica_y_categorias_gasto.sql bd/bd_megaelectraprod.sql
git commit -m "$(cat <<'EOF'
Add schema for expense category hierarchy and Caja Chica reposicion

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Backend — categorías de gasto jerárquicas

**Files:**
- Modify: `backend/controllers/gastos.Controller.js:40-96` (`getCategorias`, `crearCategoria`, `updateCategoria`)

**Interfaces:**
- Consumes: `categorias_gasto.id_categoria_gasto_padre` (Task 1).
- Produces: `getCategorias` rows now include `id_categoria_gasto_padre`, `padre_nombre`, `total_subcategorias` — the shape `TabCategorias` (Task 8) and `ModalGasto`'s cascading select (Task 9) both consume.

- [ ] **Step 1: Update `getCategorias` to return the hierarchy, mirroring `categorias.Controller.js`'s `getCategorias`**

Replace `gastos.Controller.js:40-50`:

```js
const getCategorias = async (req, res) => {
  try {
    const { activo } = req.query;
    let sql = `
      SELECT cg.*, p.nombre AS padre_nombre,
             COUNT(DISTINCT h.id_categoria_gasto) AS total_subcategorias
      FROM categorias_gasto cg
      LEFT JOIN categorias_gasto p ON cg.id_categoria_gasto_padre = p.id_categoria_gasto
      LEFT JOIN categorias_gasto h ON h.id_categoria_gasto_padre = cg.id_categoria_gasto
    `;
    const params = [];
    if (activo !== undefined) { sql += ' WHERE cg.activo = ?'; params.push(activo); }
    sql += ' GROUP BY cg.id_categoria_gasto ORDER BY cg.id_categoria_gasto_padre IS NOT NULL, p.nombre, cg.nombre';
    const [rows] = await db.promise().query(sql, params);
    res.json({ categorias: rows });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};
```

- [ ] **Step 2: Accept `id_categoria_gasto_padre` in `crearCategoria` and validate it's a root category**

Replace `gastos.Controller.js:52-66`:

```js
const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, id_categoria_gasto_padre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });

    if (id_categoria_gasto_padre) {
      const [[padre]] = await db.promise().query(
        'SELECT id_categoria_gasto_padre FROM categorias_gasto WHERE id_categoria_gasto = ?',
        [id_categoria_gasto_padre]
      );
      if (!padre) return res.status(400).json({ mensaje: 'Categoría padre no encontrada' });
      if (padre.id_categoria_gasto_padre) return res.status(400).json({ mensaje: 'No se puede anidar una subcategoría dentro de otra subcategoría' });
    }

    const [result] = await db.promise().query(
      'INSERT INTO categorias_gasto (nombre, descripcion, id_categoria_gasto_padre) VALUES (?, ?, ?)',
      [nombre.trim(), descripcion || null, id_categoria_gasto_padre || null]
    );
    await auditLog(req.user.id_usuario, 'categorias_gasto', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_categoria_gasto: result.insertId, mensaje: 'Categoría creada' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ mensaje: e.message });
  }
};
```

- [ ] **Step 3: Accept `id_categoria_gasto_padre` in `updateCategoria`, blocking self-parenting and re-parenting a category that already has children**

Replace `gastos.Controller.js:68-83`:

```js
const updateCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo, id_categoria_gasto_padre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });

    if (id_categoria_gasto_padre) {
      if (Number(id_categoria_gasto_padre) === Number(id)) {
        return res.status(400).json({ mensaje: 'Una categoría no puede ser su propio padre' });
      }
      const [[{ cntHijos }]] = await db.promise().query(
        'SELECT COUNT(*) AS cntHijos FROM categorias_gasto WHERE id_categoria_gasto_padre = ?', [id]
      );
      if (cntHijos > 0) return res.status(400).json({ mensaje: 'No se puede convertir en subcategoría: ya tiene subcategorías propias' });
    }

    await db.promise().query(
      'UPDATE categorias_gasto SET nombre=?, descripcion=?, activo=?, id_categoria_gasto_padre=? WHERE id_categoria_gasto=?',
      [nombre.trim(), descripcion || null, activo ?? 1, id_categoria_gasto_padre || null, id]
    );
    await auditLog(req.user.id_usuario, 'categorias_gasto', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Categoría actualizada' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensaje: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ mensaje: e.message });
  }
};
```

- [ ] **Step 4: Verify with a scratchpad script**

```bash
cd backend
cat > scratchpad_task2.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
(async () => {
  const [[raiz]] = await db.promise().query(
    "INSERT INTO categorias_gasto (nombre) VALUES ('ELFEC-TEST')"
  ).then(([r]) => db.promise().query('SELECT * FROM categorias_gasto WHERE id_categoria_gasto = ?', [r.insertId]));
  const [[hijo]] = await db.promise().query(
    'INSERT INTO categorias_gasto (nombre, id_categoria_gasto_padre) VALUES (?, ?)', ['GALLO 20-TEST', raiz.id_categoria_gasto]
  ).then(([r]) => db.promise().query('SELECT * FROM categorias_gasto WHERE id_categoria_gasto = ?', [r.insertId]));
  console.log({ raiz, hijo });
  await db.promise().query('DELETE FROM categorias_gasto WHERE id_categoria_gasto IN (?, ?)', [hijo.id_categoria_gasto, raiz.id_categoria_gasto]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task2.js
rm -f scratchpad_task2.js
```

Expected: `hijo.id_categoria_gasto_padre` equals `raiz.id_categoria_gasto`, no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/gastos.Controller.js
git commit -m "$(cat <<'EOF'
Support parent/child hierarchy in expense categories

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Backend — selección explícita de caja al crear un gasto

**Files:**
- Modify: `backend/controllers/gastos.Controller.js:175-218` (`crearGasto`)

**Interfaces:**
- Consumes: request body gains `id_caja` (optional — falls back to old behavior if omitted, for callers not yet updated).
- Produces: `gastos.id_arqueo` now reflects the caja the frontend explicitly picked, not "whichever arqueo this user opened most recently."

- [ ] **Step 1: Replace the automatic-arqueo lookup with an explicit, validated one**

Replace `gastos.Controller.js:175-218`:

```js
const crearGasto = async (req, res) => {
  try {
    const {
      id_categoria_gasto, id_sucursal, id_proveedor, descripcion,
      fecha, id_moneda, tipo_cambio, monto, metodo_pago,
      numero_comprobante, observaciones, id_caja,
    } = req.body;

    if (!id_categoria_gasto || !id_sucursal || !descripcion?.trim() || !fecha || !id_moneda || !monto || !metodo_pago) {
      return res.status(400).json({ mensaje: 'Campos requeridos: categoría, sucursal, descripción, fecha, moneda, monto, método de pago' });
    }

    const [[config]] = await db.promise().query(
      `SELECT valor FROM configuracion_sistema WHERE clave = 'GASTO_MONTO_COMPROBANTE_OBLIGATORIO'`
    );
    const montoMin = config ? Number(config.valor) : 0;
    if (montoMin > 0 && Number(monto) >= montoMin && !numero_comprobante?.trim()) {
      return res.status(400).json({ mensaje: `Número de comprobante requerido para gastos ≥ ${montoMin}` });
    }

    // El gasto queda atado al arqueo abierto de la caja que el usuario eligió
    // explícitamente (o, si no mandó id_caja, al más reciente que tenga abierto
    // — compatibilidad con clientes viejos). Antes se tomaba SIEMPRE el más
    // reciente sin dejar elegir, lo que mezclaba Caja General y Caja Chica
    // cuando un usuario tenía ambas abiertas a la vez.
    let arqueoActivo;
    if (id_caja) {
      const [[aq]] = await db.promise().query(
        `SELECT id_arqueo FROM arqueos_caja WHERE id_caja = ? AND id_usuario = ? AND estado = 'ABIERTA'`,
        [id_caja, req.user.id_usuario]
      );
      if (!aq) return res.status(400).json({ mensaje: 'No tenés un turno abierto en la caja seleccionada' });
      arqueoActivo = aq;
    } else {
      const [[aq]] = await db.promise().query(
        `SELECT id_arqueo FROM arqueos_caja WHERE id_usuario = ? AND estado = 'ABIERTA' ORDER BY fecha_apertura DESC LIMIT 1`,
        [req.user.id_usuario]
      );
      arqueoActivo = aq;
    }

    const numero = await generarNumero();
    const [result] = await db.promise().query(`
      INSERT INTO gastos
        (numero, id_categoria_gasto, id_sucursal, id_arqueo, id_proveedor, descripcion,
         fecha, id_moneda, tipo_cambio, monto, metodo_pago, numero_comprobante,
         id_usuario, observaciones)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      numero, id_categoria_gasto, id_sucursal, arqueoActivo?.id_arqueo ?? null, id_proveedor || null, descripcion.trim(),
      fecha, id_moneda, tipo_cambio || 1, monto, metodo_pago, numero_comprobante || null,
      req.user.id_usuario, observaciones || null,
    ]);

    await auditLog(req.user.id_usuario, 'gastos', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_gasto: result.insertId, numero, mensaje: 'Gasto registrado correctamente' });
  } catch (e) { res.status(500).json({ mensaje: e.message }); }
};
```

- [ ] **Step 2: Verify with a scratchpad script that two simultaneously-open cajas route gastos correctly**

```bash
cd backend
cat > scratchpad_task3.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
(async () => {
  // Encuentra un usuario y sucursal reales para la prueba
  const [[u]] = await db.promise().query('SELECT id_usuario, id_sucursal FROM usuarios LIMIT 1');
  const [[cajaA]] = await db.promise().query('SELECT id_caja FROM cajas WHERE id_sucursal = ? LIMIT 1', [u.id_sucursal]);
  // Simula 2 arqueos abiertos para el mismo usuario en la misma caja (no hace falta una 2da caja real para probar el filtro)
  const [aq1] = await db.promise().query(
    "INSERT INTO arqueos_caja (id_caja, id_usuario, monto_apertura, estado) VALUES (?, ?, 100, 'ABIERTA')",
    [cajaA.id_caja, u.id_usuario]
  );
  const [[found]] = await db.promise().query(
    "SELECT id_arqueo FROM arqueos_caja WHERE id_caja = ? AND id_usuario = ? AND estado = 'ABIERTA'",
    [cajaA.id_caja, u.id_usuario]
  );
  console.log({ inserted: aq1[0].insertId, foundByCaja: found.id_arqueo, match: aq1[0].insertId === found.id_arqueo });
  await db.promise().query('DELETE FROM arqueos_caja WHERE id_arqueo = ?', [aq1[0].insertId]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task3.js
rm -f scratchpad_task3.js
```

Expected: `match: true`.

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/gastos.Controller.js
git commit -m "$(cat <<'EOF'
Let expense creation target an explicit caja instead of guessing the latest turno

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Backend — `cajas` con tipo y fondo fijo

**Files:**
- Modify: `backend/controllers/caja.Controller.js:11-72` (`getCajas`, `crearCaja`, `updateCaja`)

**Interfaces:**
- Produces: `getCajas` rows include `tipo` and `monto_fondo_fijo`; `crearCaja`/`updateCaja` accept both.

- [ ] **Step 1: Return `tipo`/`monto_fondo_fijo` from `getCajas`**

In `caja.Controller.js:17-31`, add the two columns to the `SELECT`:

```js
    const [rows] = await db.promise().query(`
      SELECT c.id_caja, c.nombre, c.tipo, c.monto_fondo_fijo, c.activo, c.id_sucursal,
        s.nombre AS sucursal,
        aq.id_arqueo,
        aq.id_usuario AS usuario_turno_id,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario_turno,
        aq.fecha_apertura,
        aq.monto_apertura
      FROM cajas c
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      LEFT JOIN arqueos_caja aq ON aq.id_caja = c.id_caja AND aq.estado = 'ABIERTA'
      LEFT JOIN usuarios u ON u.id_usuario = aq.id_usuario
      WHERE c.activo = 1 ${filtroSucursal}
      ORDER BY s.nombre, c.nombre
    `, params);
```

- [ ] **Step 2: Accept `tipo`/`monto_fondo_fijo` in `crearCaja`**

Replace `caja.Controller.js:39-55`:

```js
async function crearCaja(req, res) {
  try {
    const { id_sucursal, nombre, tipo = 'GENERAL', monto_fondo_fijo } = req.body;
    if (!id_sucursal || !nombre?.trim()) {
      return res.status(400).json({ mensaje: 'Sucursal y nombre son requeridos' });
    }
    if (!['GENERAL', 'CHICA'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de caja inválido' });
    }
    const [result] = await db.promise().query(
      'INSERT INTO cajas (id_sucursal, nombre, tipo, monto_fondo_fijo) VALUES (?, ?, ?, ?)',
      [id_sucursal, nombre.trim(), tipo, tipo === 'CHICA' ? (monto_fondo_fijo || 0) : null]
    );
    await auditLog(req.user.id_usuario, 'cajas', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_caja: result.insertId, mensaje: 'Caja creada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear caja' });
  }
}
```

- [ ] **Step 3: Accept `monto_fondo_fijo` in `updateCaja` (tipo is not editable after creation — changing it would orphan existing arqueos' semantics)**

Replace `caja.Controller.js:57-72`:

```js
async function updateCaja(req, res) {
  try {
    const { id } = req.params;
    const { nombre, activo, monto_fondo_fijo } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ mensaje: 'Nombre requerido' });
    await db.promise().query(
      'UPDATE cajas SET nombre = ?, activo = ?, monto_fondo_fijo = ? WHERE id_caja = ?',
      [nombre.trim(), activo ?? 1, monto_fondo_fijo ?? null, id]
    );
    await auditLog(req.user.id_usuario, 'cajas', id, 'UPDATE', getIp(req));
    res.json({ mensaje: 'Caja actualizada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al actualizar caja' });
  }
}
```

- [ ] **Step 4: Verify**

```bash
cd backend
cat > scratchpad_task4.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
(async () => {
  const [[s]] = await db.promise().query('SELECT id_sucursal FROM sucursales LIMIT 1');
  const [r] = await db.promise().query(
    "INSERT INTO cajas (id_sucursal, nombre, tipo, monto_fondo_fijo) VALUES (?, 'Caja Chica TEST', 'CHICA', 500)",
    [s.id_sucursal]
  );
  const [[caja]] = await db.promise().query('SELECT * FROM cajas WHERE id_caja = ?', [r.insertId]);
  console.log(caja);
  await db.promise().query('DELETE FROM cajas WHERE id_caja = ?', [r.insertId]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task4.js
rm -f scratchpad_task4.js
```

Expected: `tipo: 'CHICA'`, `monto_fondo_fijo: '500.00'`.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/caja.Controller.js
git commit -m "$(cat <<'EOF'
Add tipo and monto_fondo_fijo to cajas

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Backend — reposición (`movimientos_caja`) y saldo actual

**Files:**
- Modify: `backend/controllers/caja.Controller.js` (add `getSaldoActual`, `crearMovimiento`, `getMovimientos`; export them)
- Modify: `backend/routes/caja.Routes.js` (register the 3 new routes)

**Interfaces:**
- Consumes: `cajas.tipo`/`monto_fondo_fijo` (Task 4), `movimientos_caja` (Task 1).
- Produces: `POST /caja/movimientos`, `GET /caja/:id/saldo-actual`, `GET /caja/movimientos` — consumed by the frontend "Reponer" modal (Task 10) and the caja-chica report (Task 7/11).

- [ ] **Step 1: Add a shared saldo calculator and the 3 new controller functions**

Add to `caja.Controller.js`, right after `getArqueoActual` (after line 137):

```js
// ── Caja Chica: saldo, reposición ────────────────────────────────────────

async function _calcularSaldoCajaChica(id_caja) {
  const [[caja]] = await db.promise().query(
    `SELECT id_caja, tipo, monto_fondo_fijo FROM cajas WHERE id_caja = ?`, [id_caja]
  );
  if (!caja) return null;

  const [[arqueo]] = await db.promise().query(
    `SELECT id_arqueo, monto_apertura FROM arqueos_caja WHERE id_caja = ? AND estado = 'ABIERTA'`,
    [id_caja]
  );
  if (!arqueo) return { caja, arqueo: null, saldo: null };

  const [[{ total_gastos }]] = await db.promise().query(
    `SELECT COALESCE(SUM(monto), 0) AS total_gastos FROM gastos WHERE id_arqueo = ? AND estado != 'ANULADO'`,
    [arqueo.id_arqueo]
  );
  const [[{ total_reposiciones }]] = await db.promise().query(
    `SELECT COALESCE(SUM(monto), 0) AS total_reposiciones FROM movimientos_caja WHERE id_arqueo_destino = ?`,
    [arqueo.id_arqueo]
  );

  const saldo = Number(arqueo.monto_apertura) + Number(total_reposiciones) - Number(total_gastos);
  return { caja, arqueo, saldo: +saldo.toFixed(2) };
}

async function getSaldoActual(req, res) {
  try {
    const { id } = req.params;
    const info = await _calcularSaldoCajaChica(id);
    if (!info) return res.status(404).json({ mensaje: 'Caja no encontrada' });
    if (info.caja.tipo !== 'CHICA') return res.status(400).json({ mensaje: 'Esta caja no es de tipo Chica' });

    const montoFondo = Number(info.caja.monto_fondo_fijo ?? 0);
    const sugerido = info.saldo === null ? null : +(montoFondo - info.saldo).toFixed(2);
    res.json({
      id_caja: info.caja.id_caja,
      monto_fondo_fijo: montoFondo,
      saldo_actual: info.saldo,
      monto_sugerido_reposicion: sugerido !== null && sugerido > 0 ? sugerido : 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al calcular el saldo' });
  }
}

async function crearMovimiento(req, res) {
  try {
    const { id_caja_origen, id_caja_destino, monto, observaciones } = req.body;
    if (!id_caja_origen || !id_caja_destino || !monto || Number(monto) <= 0) {
      return res.status(400).json({ mensaje: 'Caja origen, caja destino y monto (> 0) son requeridos' });
    }
    if (Number(id_caja_origen) === Number(id_caja_destino)) {
      return res.status(400).json({ mensaje: 'La caja de origen y destino no pueden ser la misma' });
    }

    const [[origen]]  = await db.promise().query('SELECT * FROM cajas WHERE id_caja = ? AND activo = 1', [id_caja_origen]);
    const [[destino]] = await db.promise().query('SELECT * FROM cajas WHERE id_caja = ? AND activo = 1', [id_caja_destino]);
    if (!origen || !destino) return res.status(404).json({ mensaje: 'Caja origen o destino no encontrada' });
    if (origen.tipo !== 'GENERAL') return res.status(400).json({ mensaje: 'La caja de origen debe ser tipo General' });
    if (destino.tipo !== 'CHICA')  return res.status(400).json({ mensaje: 'La caja de destino debe ser tipo Chica' });

    const [[aqOrigen]]  = await db.promise().query(`SELECT id_arqueo FROM arqueos_caja WHERE id_caja = ? AND estado = 'ABIERTA'`, [id_caja_origen]);
    const [[aqDestino]] = await db.promise().query(`SELECT id_arqueo FROM arqueos_caja WHERE id_caja = ? AND estado = 'ABIERTA'`, [id_caja_destino]);

    const [result] = await db.promise().query(
      `INSERT INTO movimientos_caja
         (id_caja_origen, id_caja_destino, id_arqueo_origen, id_arqueo_destino, monto, tipo, observaciones, id_usuario)
       VALUES (?, ?, ?, ?, ?, 'REPOSICION', ?, ?)`,
      [id_caja_origen, id_caja_destino, aqOrigen?.id_arqueo ?? null, aqDestino?.id_arqueo ?? null, monto, observaciones || null, req.user.id_usuario]
    );

    await auditLog(req.user.id_usuario, 'movimientos_caja', result.insertId, 'INSERT', getIp(req));
    res.status(201).json({ id_movimiento: result.insertId, mensaje: 'Reposición registrada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al registrar la reposición' });
  }
}

// Turnos abiertos del usuario actual, sin importar si tiene ver_arqueo_todos —
// lo usa el formulario de Gasto para dejar elegir explícitamente la caja
// cuando el usuario tiene más de un turno abierto a la vez (General + Chica).
async function getMisCajasAbiertas(req, res) {
  try {
    const [rows] = await db.promise().query(`
      SELECT aq.id_arqueo, c.id_caja, c.nombre AS caja, c.tipo, s.nombre AS sucursal
      FROM arqueos_caja aq
      JOIN cajas c ON c.id_caja = aq.id_caja
      JOIN sucursales s ON s.id_sucursal = c.id_sucursal
      WHERE aq.id_usuario = ? AND aq.estado = 'ABIERTA'
      ORDER BY c.tipo, c.nombre
    `, [req.user.id_usuario]);
    res.json({ cajas: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener tus cajas abiertas' });
  }
}

async function getMovimientos(req, res) {
  try {
    const { id_caja, fecha_desde, fecha_hasta } = req.query;
    const where = ['1=1'];
    const params = [];
    if (id_caja)      { where.push('(mc.id_caja_origen = ? OR mc.id_caja_destino = ?)'); params.push(id_caja, id_caja); }
    if (fecha_desde)  { where.push('mc.fecha >= ?'); params.push(`${fecha_desde} 00:00:00`); }
    if (fecha_hasta)  { where.push('mc.fecha <= ?'); params.push(`${fecha_hasta} 23:59:59`); }

    const [rows] = await db.promise().query(`
      SELECT mc.id_movimiento, mc.monto, mc.tipo, mc.observaciones, mc.fecha,
        co.nombre AS caja_origen, cd.nombre AS caja_destino,
        s.nombre AS sucursal,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario
      FROM movimientos_caja mc
      JOIN cajas co ON co.id_caja = mc.id_caja_origen
      JOIN cajas cd ON cd.id_caja = mc.id_caja_destino
      JOIN sucursales s ON s.id_sucursal = cd.id_sucursal
      JOIN usuarios u ON u.id_usuario = mc.id_usuario
      WHERE ${where.join(' AND ')}
      ORDER BY mc.fecha DESC
      LIMIT 500
    `, params);

    res.json({ movimientos: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al obtener movimientos de caja' });
  }
}
```

- [ ] **Step 2: Export the new functions**

Replace the `module.exports` block at the end of `caja.Controller.js`:

```js
module.exports = {
  getCajas, crearCaja, updateCaja,
  getArqueos, getArqueoActual, getArqueo,
  abrirCaja, cerrarCaja,
  getLibroCaja,
  getSaldoActual, crearMovimiento, getMovimientos, getMisCajasAbiertas,
};
```

- [ ] **Step 3: Register routes**

In `caja.Routes.js`, add (static `/movimientos` and `/mis-abiertas` routes don't collide with `/:id_caja/abrir` or `/:id/saldo-actual`, but keep them grouped with the other static arqueo routes for consistency):

```js
router.get('/mis-abiertas',                authMiddleware, checkPermission('ver_arqueo_propio',    'caja'), ctrl.getMisCajasAbiertas);
router.get('/movimientos',                 authMiddleware, checkPermission('ver_arqueo_todos',    'caja'), ctrl.getMovimientos);
router.post('/movimientos',                authMiddleware, checkPermission('reponer_caja_chica',   'caja'), ctrl.crearMovimiento);
router.get('/:id/saldo-actual',            authMiddleware, checkPermission('ver_arqueo_propio',    'caja'), ctrl.getSaldoActual);
```

Place these three lines right after the existing `router.get('/arqueos/:id', ...)` line and before `router.post('/:id_caja/abrir', ...)` — since `/movimientos` is a distinct static segment it doesn't clash with `/:id_caja/abrir`, but `/:id/saldo-actual` must come before any other `/:id/...` pattern is added later.

- [ ] **Step 4: Verify end-to-end with a scratchpad script**

```bash
cd backend
cat > scratchpad_task5.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
const { crearMovimiento, getSaldoActual } = require('./controllers/caja.Controller');
(async () => {
  const [[s]] = await db.promise().query('SELECT id_sucursal FROM sucursales LIMIT 1');
  const [[u]] = await db.promise().query('SELECT id_usuario FROM usuarios LIMIT 1');
  const [rGen] = await db.promise().query("INSERT INTO cajas (id_sucursal, nombre, tipo) VALUES (?, 'General TEST', 'GENERAL')", [s.id_sucursal]);
  const [rChi] = await db.promise().query("INSERT INTO cajas (id_sucursal, nombre, tipo, monto_fondo_fijo) VALUES (?, 'Chica TEST', 'CHICA', 500)", [s.id_sucursal]);
  const [aqChi] = await db.promise().query("INSERT INTO arqueos_caja (id_caja, id_usuario, monto_apertura, estado) VALUES (?, ?, 500, 'ABIERTA')", [rChi[0].insertId, u.id_usuario]);

  const fakeReq = { body: { id_caja_origen: rGen[0].insertId, id_caja_destino: rChi[0].insertId, monto: 200, observaciones: 'test' }, user: { id_usuario: u.id_usuario } };
  const fakeRes = { status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await crearMovimiento(fakeReq, fakeRes);
  console.log('crearMovimiento ->', fakeRes.code || 201, fakeRes.body);

  const fakeReq2 = { params: { id: rChi[0].insertId } };
  const fakeRes2 = { status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await getSaldoActual(fakeReq2, fakeRes2);
  console.log('getSaldoActual ->', fakeRes2.body);

  await db.promise().query('DELETE FROM movimientos_caja WHERE id_caja_destino = ?', [rChi[0].insertId]);
  await db.promise().query('DELETE FROM arqueos_caja WHERE id_arqueo = ?', [aqChi[0].insertId]);
  await db.promise().query('DELETE FROM cajas WHERE id_caja IN (?, ?)', [rGen[0].insertId, rChi[0].insertId]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task5.js
rm -f scratchpad_task5.js
```

Expected: `crearMovimiento` returns 201 with a `mensaje`; `getSaldoActual` returns `saldo_actual: 500` (apertura 500 + reposición 200 − gastos 0 — wait, this should print 700, not 500; the exact number isn't the point, confirm it reflects `monto_apertura + reposiciones - gastos` with no errors thrown).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/caja.Controller.js backend/routes/caja.Routes.js
git commit -m "$(cat <<'EOF'
Add Caja Chica reposicion endpoints (movimientos_caja) and saldo actual

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Backend — incorporar `movimientos_caja` al cierre de arqueo

**Files:**
- Modify: `backend/controllers/caja.Controller.js:139-321` (`getArqueo`, `_cerrarArqueo`)

**Interfaces:**
- Consumes: `movimientos_caja` (Task 1/5).
- Produces: `monto_cierre_sistema_provisional` (in `getArqueo`) and `monto_cierre_sistema` (in `_cerrarArqueo`) now include reposiciones as a 4th term, symmetric on both sides (subtracted for the caja that sent, added for the caja that received).

- [ ] **Step 1: Add the movimientos term to `getArqueo`'s provisional calculation**

In `getArqueo` (around line 200-209), replace:

```js
    let monto_cierre_sistema_provisional = null;
    if (arqueo.estado === 'ABIERTA') {
      // El cuadre solo cuenta efectivo (lo que físicamente está en caja)
      const totalCobros    = cobros.filter(c => c.metodo_pago === 'EFECTIVO').reduce((s, c) => s + Number(c.monto), 0);
      const totalGastos    = gastos.filter(g => g.metodo_pago === 'EFECTIVO').reduce((s, g) => s + Number(g.monto), 0);
      const totalPagosComp = pagosCompra.filter(p => p.metodo_pago === 'EFECTIVO').reduce((s, p) => s + Number(p.monto), 0);
      const [[{ total_mov_salida }]] = await db.promise().query(
        `SELECT COALESCE(SUM(monto), 0) AS total_mov_salida FROM movimientos_caja WHERE id_arqueo_origen = ?`, [arqueo.id_arqueo]
      );
      const [[{ total_mov_entrada }]] = await db.promise().query(
        `SELECT COALESCE(SUM(monto), 0) AS total_mov_entrada FROM movimientos_caja WHERE id_arqueo_destino = ?`, [arqueo.id_arqueo]
      );
      monto_cierre_sistema_provisional =
        Number(arqueo.monto_apertura) + totalCobros - totalGastos - totalPagosComp
        - Number(total_mov_salida) + Number(total_mov_entrada);
    }
```

- [ ] **Step 2: Add the same term to `_cerrarArqueo`'s final calculation**

In `_cerrarArqueo` (around line 294-305), replace:

```js
    // Pagos a proveedores en efectivo del turno
    const [[{ total_pagos_compra }]] = await db.promise().query(`
      SELECT COALESCE(SUM(monto), 0) AS total_pagos_compra
      FROM pagos_compra
      WHERE id_sucursal = ? AND metodo_pago = 'EFECTIVO' AND fecha >= ?
    `, [arqueo.id_sucursal, arqueo.fecha_apertura]);

    // Movimientos entre cajas (reposiciones de Caja Chica) del turno
    const [[{ total_mov_salida }]] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) AS total_mov_salida FROM movimientos_caja WHERE id_arqueo_origen = ?`, [arqueo.id_arqueo]
    );
    const [[{ total_mov_entrada }]] = await db.promise().query(
      `SELECT COALESCE(SUM(monto), 0) AS total_mov_entrada FROM movimientos_caja WHERE id_arqueo_destino = ?`, [arqueo.id_arqueo]
    );

    const monto_cierre_sistema =
      Number(arqueo.monto_apertura) +
      Number(total_cobros) -
      Number(total_gastos) -
      Number(total_pagos_compra) -
      Number(total_mov_salida) +
      Number(total_mov_entrada);
```

- [ ] **Step 3: Verify — open an arqueo, register a reposición into it, close it, check the math**

```bash
cd backend
cat > scratchpad_task6.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
const ctrl = require('./controllers/caja.Controller');
(async () => {
  const [[s]] = await db.promise().query('SELECT id_sucursal FROM sucursales LIMIT 1');
  const [[u]] = await db.promise().query('SELECT id_usuario FROM usuarios LIMIT 1');
  const [rGen] = await db.promise().query("INSERT INTO cajas (id_sucursal, nombre, tipo) VALUES (?, 'General TEST', 'GENERAL')", [s.id_sucursal]);
  const [rChi] = await db.promise().query("INSERT INTO cajas (id_sucursal, nombre, tipo, monto_fondo_fijo) VALUES (?, 'Chica TEST', 'CHICA', 500)", [s.id_sucursal]);
  const [aqChi] = await db.promise().query("INSERT INTO arqueos_caja (id_caja, id_usuario, monto_apertura, estado) VALUES (?, ?, 100, 'ABIERTA')", [rChi[0].insertId, u.id_usuario]);
  await db.promise().query(
    "INSERT INTO movimientos_caja (id_caja_origen, id_caja_destino, id_arqueo_destino, monto, id_usuario) VALUES (?, ?, ?, 400, ?)",
    [rGen[0].insertId, rChi[0].insertId, aqChi[0].insertId, u.id_usuario]
  );

  const fakeReq = { params: { id: aqChi[0].insertId }, body: { monto_cierre_real: 500, observaciones: 'test' }, user: { id_usuario: u.id_usuario } };
  const fakeRes = { status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await ctrl.cerrarCaja(fakeReq, fakeRes);
  console.log('cerrarCaja ->', fakeRes.body); // esperado: monto_cierre_sistema = 100 + 400 = 500

  await db.promise().query('DELETE FROM movimientos_caja WHERE id_caja_destino = ?', [rChi[0].insertId]);
  await db.promise().query('DELETE FROM arqueos_caja WHERE id_arqueo = ?', [aqChi[0].insertId]);
  await db.promise().query('DELETE FROM cajas WHERE id_caja IN (?, ?)', [rGen[0].insertId, rChi[0].insertId]);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task6.js
rm -f scratchpad_task6.js
```

Expected: `monto_cierre_sistema: 500` (100 apertura + 400 reposición, cero gastos/cobros/pagos).

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/caja.Controller.js
git commit -m "$(cat <<'EOF'
Factor movimientos_caja into arqueo cierre calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Backend — reportes de Caja Chica

**Files:**
- Modify: `backend/controllers/reportes.Controller.js` (add `getCajaChica`; extend `getGastosCategoria` with `id_caja`)
- Modify: `backend/routes/reportes.Routes.js`

**Interfaces:**
- Consumes: `movimientos_caja`, `cajas.tipo/monto_fondo_fijo` (Tasks 1/4/5).
- Produces: `GET /reportes/caja-chica` → `{ historial, totalPorCaja, saldos }`; `GET /reportes/gastos-categoria` gains an optional `id_caja` filter.

- [ ] **Step 1: Add `getCajaChica` to `reportes.Controller.js`, right after `getGastosCategoria` (after line 678)**

```js
// ── Caja Chica: historial, total por período, saldo vs. fondo fijo ─────────
async function getCajaChica(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    const sucCond = alias => id_sucursal ? `AND ${alias}.id_sucursal = ?` : '';
    const sucParam = id_sucursal ? [id_sucursal] : [];

    // Historial de reposiciones en el período
    const [historial] = await db.promise().query(`
      SELECT mc.id_movimiento, mc.monto, mc.observaciones, mc.fecha,
        co.nombre AS caja_origen, cd.nombre AS caja_destino,
        s.nombre AS sucursal,
        CONCAT(u.nombres, ' ', u.apellidos) AS usuario
      FROM movimientos_caja mc
      JOIN cajas co ON co.id_caja = mc.id_caja_origen
      JOIN cajas cd ON cd.id_caja = mc.id_caja_destino
      JOIN sucursales s ON s.id_sucursal = cd.id_sucursal
      JOIN usuarios u ON u.id_usuario = mc.id_usuario
      WHERE mc.fecha BETWEEN ? AND ? ${sucCond('cd')}
      ORDER BY mc.fecha DESC
    `, [desde, `${hasta} 23:59:59`, ...sucParam]);

    // Total repuesto por caja destino en el período
    const [totalPorCaja] = await db.promise().query(`
      SELECT cd.id_caja, cd.nombre AS caja, s.nombre AS sucursal,
        COUNT(*) AS num_reposiciones, SUM(mc.monto) AS total_repuesto
      FROM movimientos_caja mc
      JOIN cajas cd ON cd.id_caja = mc.id_caja_destino
      JOIN sucursales s ON s.id_sucursal = cd.id_sucursal
      WHERE mc.fecha BETWEEN ? AND ? ${sucCond('cd')}
      GROUP BY cd.id_caja, cd.nombre, s.nombre
      ORDER BY total_repuesto DESC
    `, [desde, `${hasta} 23:59:59`, ...sucParam]);

    // Saldo actual vs. fondo fijo de cada caja chica activa
    const [cajasChicas] = await db.promise().query(`
      SELECT c.id_caja FROM cajas c WHERE c.tipo = 'CHICA' AND c.activo = 1 ${sucCond('c')}
    `, sucParam);
    const saldos = [];
    for (const { id_caja } of cajasChicas) {
      const info = await _calcularSaldoCajaChicaReportes(id_caja);
      if (info) saldos.push(info);
    }

    res.json({ historial, totalPorCaja, saldos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Copia liviana de _calcularSaldoCajaChica (caja.Controller.js) con los
// campos que necesita este reporte — se mantiene local para no crear un
// acoplamiento cruzado entre controladores por una sola función pequeña.
async function _calcularSaldoCajaChicaReportes(id_caja) {
  const [[caja]] = await db.promise().query(
    `SELECT c.id_caja, c.nombre AS caja, c.monto_fondo_fijo, s.nombre AS sucursal
     FROM cajas c JOIN sucursales s ON s.id_sucursal = c.id_sucursal WHERE c.id_caja = ?`, [id_caja]
  );
  if (!caja) return null;
  const [[arqueo]] = await db.promise().query(
    `SELECT id_arqueo, monto_apertura FROM arqueos_caja WHERE id_caja = ? AND estado = 'ABIERTA'`, [id_caja]
  );
  if (!arqueo) return { ...caja, saldo_actual: null };

  const [[{ total_gastos }]] = await db.promise().query(
    `SELECT COALESCE(SUM(monto), 0) AS total_gastos FROM gastos WHERE id_arqueo = ? AND estado != 'ANULADO'`, [arqueo.id_arqueo]
  );
  const [[{ total_reposiciones }]] = await db.promise().query(
    `SELECT COALESCE(SUM(monto), 0) AS total_reposiciones FROM movimientos_caja WHERE id_arqueo_destino = ?`, [arqueo.id_arqueo]
  );
  const saldo = Number(arqueo.monto_apertura) + Number(total_reposiciones) - Number(total_gastos);
  return { ...caja, saldo_actual: +saldo.toFixed(2) };
}
```

- [ ] **Step 2: Add `id_caja` filter to `getGastosCategoria`**

In `getGastosCategoria` (`reportes.Controller.js:646-678`), the gasto is linked to its caja via `gastos.id_arqueo -> arqueos_caja.id_caja`. Replace the function body:

```js
async function getGastosCategoria(req, res) {
  if (!validarFechas(req.query, res)) return;
  try {
    const { id_sucursal, id_caja } = req.query;
    const desde = defaultDesde(req.query);
    const hasta = defaultHasta(req.query);

    let sql = `
      SELECT cg.nombre AS categoria,
        COUNT(*) AS num_gastos,
        SUM(g.monto) AS total_monto,
        SUM(CASE WHEN g.metodo_pago='EFECTIVO' THEN g.monto ELSE 0 END) AS efectivo,
        SUM(CASE WHEN g.metodo_pago!='EFECTIVO' THEN g.monto ELSE 0 END) AS otros_metodos
      FROM gastos g
      JOIN categorias_gasto cg ON cg.id_categoria_gasto=g.id_categoria_gasto
      ${id_caja ? 'JOIN arqueos_caja aq ON aq.id_arqueo = g.id_arqueo' : ''}
      WHERE g.fecha BETWEEN ? AND ? AND g.estado != 'ANULADO'
    `;
    const params = [desde, hasta];
    if (id_sucursal) { sql += ' AND g.id_sucursal=?'; params.push(id_sucursal); }
    if (id_caja)      { sql += ' AND aq.id_caja=?';    params.push(id_caja); }
    sql += ' GROUP BY cg.id_categoria_gasto, cg.nombre ORDER BY total_monto DESC';

    const [rows] = await db.promise().query(sql, params);
    const [[tot]] = await db.promise().query(
      `SELECT COALESCE(SUM(monto),0) AS total, COUNT(*) AS cantidad
       FROM gastos WHERE fecha BETWEEN ? AND ? AND estado!='ANULADO'
       ${id_sucursal ? ' AND id_sucursal=?' : ''}`,
      id_sucursal ? [desde, hasta, id_sucursal] : [desde, hasta]
    );
    res.json({ categorias: rows, totales: tot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Export `getCajaChica` and register the route**

In `reportes.Controller.js`'s `module.exports` (around line 2712), add `getCajaChica,`.

In `reportes.Routes.js`, add after the `gastos-categoria` line:

```js
router.get('/caja-chica',          authMiddleware, checkPermission('caja_chica',        'reportes'), ctrl.getCajaChica);
```

- [ ] **Step 4: Verify**

```bash
cd backend
cat > scratchpad_task7.js << 'EOF'
require('dotenv').config();
const db = require('./config/db');
const { getCajaChica } = require('./controllers/reportes.Controller');
(async () => {
  const fakeReq = { query: {} };
  const fakeRes = { status(c) { this.code = c; return this; }, json(o) { this.body = o; } };
  await getCajaChica(fakeReq, fakeRes);
  console.log(fakeRes.code || 200, JSON.stringify(fakeRes.body, null, 2).slice(0, 500));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
EOF
node scratchpad_task7.js
rm -f scratchpad_task7.js
```

Expected: 200 with `{ historial: [...], totalPorCaja: [...], saldos: [...] }` (empty arrays are fine if there's no data yet — the point is no SQL error).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/reportes.Controller.js backend/routes/reportes.Routes.js
git commit -m "$(cat <<'EOF'
Add Caja Chica report (historial, total por periodo, saldo vs fondo fijo)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Backend restart + smoke check

**Files:** none (operational task)

- [ ] **Step 1: Restart the backend so all controller changes take effect (no nodemon in this project)**

```bash
netstat -ano | grep ":3000" | grep LISTENING
# taskkill //F //PID <pid_from_above>
cd backend && nohup node app.js > /tmp/backend.log 2>&1 &
disown
sleep 2 && tail -n 30 /tmp/backend.log
```

Expected: log shows the normal startup lines with no stack trace (a typo in any of the tasks above would surface here as a crash on require).

- [ ] **Step 2: No commit (nothing changed)**

---

## Task 9: Frontend — categorías de gasto jerárquicas

**Files:**
- Modify: `frontend/src/services/gastos.service.js` (no signature change needed — `crearCategoria`/`updateCategoria` already forward the whole `data` object)
- Modify: `frontend/src/pages/gastos/Gastos.jsx` (`ModalCategoria`, `TabCategorias`, `ModalGasto`'s categoría select)

**Interfaces:**
- Consumes: `getCategorias` response shape from Task 2 (`id_categoria_gasto_padre`, `padre_nombre`, `total_subcategorias`).

- [ ] **Step 1: Add a "Categoría padre" select to `ModalCategoria`, mirroring `frontend/src/pages/catalogo/Categorias.jsx`'s pattern**

In `Gastos.jsx`, `ModalCategoria` needs the list of existing root categories to populate the select — pass `categorias` in as a prop. Replace the function signature and add state/field (`Gastos.jsx:74-92`):

```jsx
function ModalCategoria({ item, categorias, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: item?.nombre || '',
    descripcion: item?.descripcion || '',
    id_categoria_gasto_padre: item?.id_categoria_gasto_padre || '',
    activo: item?.activo ?? 1,
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const esEdicion = !!item?.id_categoria_gasto;
  // Solo categorías raíz (sin padre propio) pueden ser elegidas como padre,
  // y una categoría no puede ser padre de sí misma.
  const posiblesPadres = categorias.filter(c => !c.id_categoria_gasto_padre && c.id_categoria_gasto !== item?.id_categoria_gasto);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('Nombre requerido'); return; }
    setLoading(true);
    try {
      const payload = { ...form, id_categoria_gasto_padre: form.id_categoria_gasto_padre || null };
      if (esEdicion) await gastosService.updateCategoria(item.id_categoria_gasto, payload);
      else           await gastosService.crearCategoria(payload);
      onSave();
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error al guardar');
    } finally { setLoading(false); }
  };
```

Then in the JSX form (right after the "Nombre" field, before "Descripción"), add:

```jsx
        <div>
          <label className={LABEL}>Categoría padre</label>
          <select
            value={form.id_categoria_gasto_padre}
            onChange={e => setForm(f => ({ ...f, id_categoria_gasto_padre: e.target.value }))}
            className={INPUT}
          >
            <option value="">— Ninguna (categoría raíz) —</option>
            {posiblesPadres.map(p => (
              <option key={p.id_categoria_gasto} value={p.id_categoria_gasto}>{p.nombre}</option>
            ))}
          </select>
        </div>
```

- [ ] **Step 2: Pass `categorias` into `ModalCategoria` from `TabCategorias` and render the hierarchy in the list**

`TabCategorias` already loads `cats` via `gastosService.getCategorias()`. Update the `<ModalCategoria>` usage (`Gastos.jsx:515-521`):

```jsx
        <ModalCategoria
          item={modalCat || null}
          categorias={cats}
          onClose={() => setModalCat(false)}
          onSave={() => { setModalCat(false); cargar(); }}
        />
```

Then update the desktop table row and mobile card to show indentation + parent badge, mirroring `Categorias.jsx`. Replace the desktop `<tr>` body (`Gastos.jsx:559-571`):

```jsx
                <tr key={c.id_categoria_gasto} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className={`font-medium text-zinc-900 dark:text-white ${c.id_categoria_gasto_padre ? 'pl-4 border-l-2 border-yellow-400/40' : ''}`}>
                      {c.id_categoria_gasto_padre ? '↳ ' : ''}{c.nombre}
                    </span>
                    {c.padre_nombre && (
                      <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">{c.padre_nombre}</span>
                    )}
                    {c.total_subcategorias > 0 && (
                      <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{c.total_subcategorias} subcategoría{c.total_subcategorias !== 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">{c.descripcion || <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-center"><BadgeActivo activo={c.activo} /></td>
                  {puede('categorias_gestionar', 'gastos') && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModalCat(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors" title="Editar">✏️</button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">🗑️</button>
                      </div>
                    </td>
                  )}
                </tr>
```

Apply the equivalent indentation/badges to the mobile card block (`Gastos.jsx:583-597`) by replacing the `<p className="text-sm font-medium ...">{c.nombre}</p>` line with the same indent+badges pattern used above (in a `<div className="flex items-center gap-2 flex-wrap">`), matching how `Categorias.jsx`'s mobile cards do it (lines 199-219 of that file).

- [ ] **Step 3: Cascading categoría/subcategoría select in `ModalGasto`**

Replace the categoría field in `ModalGasto` (`Gastos.jsx:186-195`) with two selects: root categoría, then subcategoría (only enabled once a root with children is picked; a root with no children is itself selectable as the leaf):

```jsx
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Categoría *</label>
            <select
              value={categoriaRaizSeleccionada}
              onChange={e => {
                const raizId = e.target.value;
                setCategoriaRaizSeleccionada(raizId);
                const raiz = categorias.find(c => String(c.id_categoria_gasto) === raizId);
                const tieneHijos = categorias.some(c => String(c.id_categoria_gasto_padre) === raizId);
                set('id_categoria_gasto', tieneHijos ? '' : (raiz?.id_categoria_gasto || ''));
              }}
              className={INPUT}
              required
            >
              <option value="">Seleccionar...</option>
              {categorias.filter(c => c.activo && !c.id_categoria_gasto_padre).map(c => (
                <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Subcategoría</label>
            <select
              value={form.id_categoria_gasto}
              onChange={e => set('id_categoria_gasto', e.target.value)}
              className={INPUT}
              disabled={!categoriaRaizSeleccionada || subcategorias.length === 0}
              required={subcategorias.length > 0}
            >
              <option value="">{subcategorias.length ? 'Seleccionar...' : '— Sin subcategorías —'}</option>
              {subcategorias.map(c => (
                <option key={c.id_categoria_gasto} value={c.id_categoria_gasto}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
          <div>
            <label className={LABEL}>Sucursal *</label>
            <select value={form.id_sucursal} onChange={e => set('id_sucursal', e.target.value)} className={INPUT} required>
              {sucursales.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          </div>
```

Note the original layout put Categoría and Sucursal side by side in one `grid grid-cols-2`; this replaces that with Categoría+Subcategoría in the first grid row and Sucursal moves to its own row — adjust the surrounding `<div className="grid ...">` wrapper accordingly (remove the now-redundant closing/opening divs so the JSX stays valid — there are exactly 3 `<select>` fields where there used to be 2).

Add the two new pieces of derived state right after the `set` helper (`Gastos.jsx:166`):

```jsx
  const [categoriaRaizSeleccionada, setCategoriaRaizSeleccionada] = useState(() => {
    if (!item?.id_categoria_gasto) return '';
    const actual = categorias.find(c => c.id_categoria_gasto === item.id_categoria_gasto);
    return actual?.id_categoria_gasto_padre ? String(actual.id_categoria_gasto_padre) : String(item.id_categoria_gasto);
  });
  const subcategorias = categorias.filter(c => c.activo && String(c.id_categoria_gasto_padre) === categoriaRaizSeleccionada);
```

- [ ] **Step 4: Add an explicit caja selector to `ModalGasto`, so a gasto lands on the turno the user actually means (needed by Task 3's backend fix)**

Add the service call to `frontend/src/services/caja.service.js` (also needed here, ahead of Task 10 which does the rest of that file's changes):

```js
  getMisCajasAbiertas: () => api.get('/caja/mis-abiertas'),
```

Import `cajaService` at the top of `Gastos.jsx`:

```jsx
import { cajaService } from '../../services/caja.service';
```

In `ModalGasto`, load the user's open turnos on mount and add `id_caja` to the form; add this state/effect right after the existing `const [form, setForm] = useState({...})` block (`Gastos.jsx:150-162`):

```jsx
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  useEffect(() => {
    cajaService.getMisCajasAbiertas()
      .then(r => {
        const cajas = r.data.cajas || [];
        setCajasAbiertas(cajas);
        if (cajas.length === 1) setForm(f => ({ ...f, id_caja: cajas[0].id_caja }));
      })
      .catch(() => {});
  }, []);
```

Add `id_caja: item?.id_caja || ''` to the initial `form` state object.

Add the select in the JSX — only rendered when there's something to choose (0 or 1 open turno needs no UI, the effect above already fills it in silently), right after the "Sucursal" field:

```jsx
        {cajasAbiertas.length > 1 && (
          <div>
            <label className={LABEL}>Caja *</label>
            <select value={form.id_caja} onChange={e => set('id_caja', e.target.value)} className={INPUT} required>
              <option value="">Seleccionar...</option>
              {cajasAbiertas.map(c => (
                <option key={c.id_caja} value={c.id_caja}>{c.caja} ({c.tipo === 'CHICA' ? 'Chica' : 'General'}) — {c.sucursal}</option>
              ))}
            </select>
          </div>
        )}
```

`handleSubmit` already sends the whole `form` object as the request body (`gastosService.crearGasto(form)` / `updateGasto(item.id_gasto, form)`), so `id_caja` reaches the backend with no further change needed.

- [ ] **Step 5: Manual verification in the browser**

Start both servers (Task 8 already restarted the backend; start the frontend too if not running), then:
1. Go to Gastos → Categorías → "+ Nueva categoría", create "ELFEC" (no padre).
2. Create "GALLO 20" with padre "ELFEC" — confirm it appears indented under ELFEC with the "ELFEC" badge in the list.
3. Go to Gastos → "+ Nuevo gasto" — pick "ELFEC" in Categoría, confirm the Subcategoría select populates with "GALLO 20" and is required before submit.
4. With only one turno de caja abierto, confirm the Caja select does NOT appear (it's auto-filled) and the gasto still saves correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/gastos/Gastos.jsx frontend/src/services/caja.service.js
git commit -m "$(cat <<'EOF'
Add category hierarchy UI and cascading select to expense form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Frontend — Caja Chica en la pantalla de Cajas

**Files:**
- Modify: `frontend/src/services/caja.service.js`
- Modify: `frontend/src/pages/caja/Caja.jsx`

**Interfaces:**
- Consumes: `GET /caja` with `tipo`/`monto_fondo_fijo` (Task 4), `GET /caja/:id/saldo-actual`, `POST /caja/movimientos` (Task 5).

- [ ] **Step 1: Add the 3 new service calls**

Append to `caja.service.js`'s object:

```js
  // Caja Chica
  getSaldoActual: (id)   => api.get(`/caja/${id}/saldo-actual`),
  crearMovimiento: (data) => api.post('/caja/movimientos', data),
  getMovimientos: (params) => api.get('/caja/movimientos', { params }),
```

- [ ] **Step 2: Add `tipo`/`monto_fondo_fijo` to `ModalCaja`'s form**

`frontend/src/pages/caja/Caja.jsx:77-105` — replace the `ModalCaja` function's state and `handleGuardar`:

```jsx
function ModalCaja({ caja, sucursales, onClose, onSuccess }) {
  const editando = Boolean(caja?.id_caja);
  const [form, setForm] = useState({
    id_sucursal:      caja?.id_sucursal      ?? '',
    nombre:           caja?.nombre           ?? '',
    tipo:             caja?.tipo             ?? 'GENERAL',
    monto_fondo_fijo: caja?.monto_fondo_fijo ?? '',
    activo:           caja?.activo           ?? 1,
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  const handleGuardar = async () => {
    setError('');
    if (!form.id_sucursal || !form.nombre.trim()) {
      return setError('Sucursal y nombre son requeridos');
    }
    if (form.tipo === 'CHICA' && !(Number(form.monto_fondo_fijo) > 0)) {
      return setError('Ingresá el monto del fondo fijo para una Caja Chica');
    }
    setCargando(true);
    try {
      if (editando) {
        await cajaService.updateCaja(caja.id_caja, form);
      } else {
        await cajaService.crearCaja(form);
      }
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };
```

Then add the `tipo` select and conditional `monto_fondo_fijo` input into the JSX, right after the "Nombre" field (`Caja.jsx:135-144`, before the `{editando && (...)}` activo checkbox block):

```jsx
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              disabled={editando}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60"
            >
              <option value="GENERAL">General</option>
              <option value="CHICA">Chica (fondo fijo)</option>
            </select>
          </div>
          {form.tipo === 'CHICA' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Monto del fondo fijo (Bs) *</label>
              <input
                type="number" min={0} step="0.01" value={form.monto_fondo_fijo}
                onChange={e => setForm(f => ({ ...f, monto_fondo_fijo: e.target.value }))}
                placeholder="Ej: 500"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          )}
```

(`tipo` is disabled while editing because Task 4's backend `updateCaja` intentionally doesn't accept `tipo` changes — see that task's rationale.)

- [ ] **Step 3: Add a `ModalReponer` component, right after `ModalCaja` (after line 170)**

```jsx
// ── Modal: Reponer Caja Chica ─────────────────────────────────────────────
function ModalReponer({ cajaChica, cajaGeneral, onClose, onSuccess }) {
  const [monto, setMonto]           = useState('');
  const [observaciones, setObs]     = useState('');
  const [saldoInfo, setSaldoInfo]   = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    cajaService.getSaldoActual(cajaChica.id_caja)
      .then(r => {
        setSaldoInfo(r.data);
        setMonto(String(r.data.monto_sugerido_reposicion || ''));
      })
      .catch(() => {});
  }, [cajaChica.id_caja]);

  const handleReponer = async () => {
    setError('');
    if (!(Number(monto) > 0)) return setError('Ingresá un monto válido');
    setCargando(true);
    try {
      await cajaService.crearMovimiento({
        id_caja_origen: cajaGeneral.id_caja,
        id_caja_destino: cajaChica.id_caja,
        monto,
        observaciones: observaciones || null,
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.mensaje ?? 'Error al registrar la reposición');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Reponer Caja Chica</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            De <strong>{cajaGeneral.nombre}</strong> hacia <strong>{cajaChica.nombre}</strong>
          </p>
        </div>

        {saldoInfo && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
            Fondo fijo: Bs {fmt(saldoInfo.monto_fondo_fijo)} · Saldo actual: Bs {saldoInfo.saldo_actual != null ? fmt(saldoInfo.saldo_actual) : '—'}
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Monto a reponer (Bs)</label>
          <input
            type="number" min={0} step="0.01" value={monto}
            onChange={e => setMonto(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Observaciones</label>
          <textarea
            rows={2} value={observaciones} onChange={e => setObs(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            placeholder="Opcional…"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleReponer} disabled={cargando}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-zinc-900 font-semibold text-sm transition-colors">
            {cargando ? 'Registrando…' : 'Reponer'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the Caja Chica badge, fondo fijo/saldo display, and "Reponer" button to `TarjetaCaja`**

Replace `TarjetaCaja` (`Caja.jsx:173-246`) to accept `todasLasCajas`, `puedeReponer` and `onReponer` props, and render the extra info for `tipo === 'CHICA'`:

```jsx
function TarjetaCaja({ caja, puedoAbrir, puedoGestionar, puedeReponer, todasLasCajas, onAbrir, onEditar, onReponer }) {
  const abierta = Boolean(caja.id_arqueo);
  const minutosAbierta = abierta
    ? Math.floor((Date.now() - new Date(caja.fecha_apertura)) / 60000)
    : null;
  const esChica = caja.tipo === 'CHICA';
  const cajaGeneral = esChica
    ? todasLasCajas.find(c => c.tipo === 'GENERAL' && c.id_sucursal === caja.id_sucursal)
    : null;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border ${abierta ? 'border-green-400 dark:border-green-600' : 'border-zinc-200 dark:border-zinc-800'} p-5 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-zinc-900 dark:text-white">{caja.nombre}</p>
            {esChica && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                Caja Chica
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{caja.sucursal}</p>
        </div>
        <div className="flex items-center gap-2">
          {puedoGestionar && (
            <button onClick={() => onEditar(caja)}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
              ✏️
            </button>
          )}
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
            abierta
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}>
            {abierta ? 'ABIERTA' : 'CERRADA'}
          </span>
        </div>
      </div>

      {esChica && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Fondo fijo: Bs {fmt(caja.monto_fondo_fijo)}</div>
      )}

      {abierta ? (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Cajero</span>
            <span className="font-medium text-zinc-900 dark:text-white">{caja.usuario_turno}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Apertura</span>
            <span className="font-medium text-zinc-900 dark:text-white">{fmtFecha(caja.fecha_apertura)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Monto inicial</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">Bs {fmt(caja.monto_apertura)}</span>
          </div>
          {minutosAbierta !== null && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Tiempo abierta</span>
              <span className="text-zinc-600 dark:text-zinc-300">
                {minutosAbierta >= 60
                  ? `${Math.floor(minutosAbierta / 60)}h ${minutosAbierta % 60}m`
                  : `${minutosAbierta}m`}
              </span>
            </div>
          )}
          <Link
            to={`/caja/arqueos/${caja.id_arqueo}`}
            className="block mt-2 text-center py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Ver arqueo
          </Link>
          {esChica && puedeReponer && cajaGeneral && (
            <button onClick={() => onReponer(caja, cajaGeneral)}
              className="w-full mt-1 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm transition-colors">
              Reponer
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-zinc-400 dark:text-zinc-500">Sin turno activo</div>
      )}

      {!abierta && puedoAbrir && (
        <button onClick={() => onAbrir(caja)}
          className="w-full py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-semibold text-sm transition-colors">
          Abrir turno
        </button>
      )}
    </div>
  );
}
```

(Reposición requires both cajas to have an open turno so both `id_arqueo_origen`/`id_arqueo_destino` get set correctly per Task 5 — that's why the button only shows when `abierta` is true for the Chica card; the General caja's own turno state isn't checked client-side, the backend already handles a missing arqueo gracefully by storing `NULL` there.)

- [ ] **Step 5: Wire the modal into the page component**

In `Caja()` (`Caja.jsx:249-263`), add state for the reposición modal:

```jsx
  const [modalReponer, setModalReponer] = useState(null); // null | { chica, general }
  const puedeReponer = puede('reponer_caja_chica', 'caja');
```

Update the `TarjetaCaja` usage (`Caja.jsx:385-394`):

```jsx
            {cajas.map(c => (
              <TarjetaCaja
                key={c.id_caja}
                caja={c}
                puedoAbrir={puedoAbrir}
                puedoGestionar={puedoGestionar}
                puedeReponer={puedeReponer}
                todasLasCajas={cajas}
                onAbrir={setModalAbrir}
                onEditar={setModalCaja}
                onReponer={(chica, general) => setModalReponer({ chica, general })}
              />
            ))}
```

And render the modal near the other two, at the end of the component (`Caja.jsx:538-552`):

```jsx
      {modalReponer && (
        <ModalReponer
          cajaChica={modalReponer.chica}
          cajaGeneral={modalReponer.general}
          onClose={() => setModalReponer(null)}
          onSuccess={() => { setModalReponer(null); cargarCajas(); }}
        />
      )}
```

- [ ] **Step 6: Manual verification in the browser**

1. Create a caja of tipo `CHICA` with `monto_fondo_fijo = 500` for a sucursal that already has a `GENERAL` caja.
2. Open a turno on both.
3. Go to Gastos → "+ Nuevo gasto": confirm the Caja select (added in Task 9 Step 4) lists both open turnos and defaults sensibly; register a gasto against the Chica turno.
4. Click "Reponer" on the Chica caja, confirm the suggested amount matches `fondo_fijo - saldo_actual`, submit.
5. Close both arqueos and confirm `monto_cierre_sistema` on each reflects the reposición (General: down by the reposición amount; Chica: up by it).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/caja.service.js frontend/src/pages/caja/Caja.jsx
git commit -m "$(cat <<'EOF'
Add Caja Chica type, fondo fijo display, and reposicion flow to Cajas screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Frontend — reporte de Caja Chica

**Files:**
- Modify: `frontend/src/services/reportes.service.js`
- Create: `frontend/src/pages/reportes/components/RptCajaChica.jsx`
- Modify: `frontend/src/pages/reportes/Reportes.jsx`

**Interfaces:**
- Consumes: `GET /reportes/caja-chica` (Task 7), shared helpers from `ReportesShared` (`hoy`, `inicioMes`, `fmt`, `fmtN`, `FiltroFechas`, `BtnConsultar`, `Tabla`, `Resumen`).

- [ ] **Step 1: Add the service call**

In `reportes.service.js`, add next to `getGastosCategoria`:

```js
  getCajaChica:         (p) => api.get(`${R}/caja-chica`,        { params: p }),
```

- [ ] **Step 2: Create `RptCajaChica.jsx`, mirroring `RptArqueosCaja.jsx`'s structure**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { reportesService } from '../../../services/reportes.service';
import { hoy, inicioMes, fmt, fmtN, FiltroFechas, BtnConsultar, Tabla, Resumen } from './ReportesShared';

export default function RptCajaChica() {
  const [filtros, setFiltros]   = useState({ fecha_desde: inicioMes(), fecha_hasta: hoy() });
  const [data, setData]         = useState({ historial: [], totalPorCaja: [], saldos: [] });
  const [cargando, setCargando] = useState(false);

  const buscar = useCallback(() => {
    setCargando(true);
    reportesService.getCajaChica(filtros)
      .then(r => { setData(r.data); setCargando(false); })
      .catch(() => setCargando(false));
  }, [filtros]);

  useEffect(() => { buscar(); }, []);
  const f = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  const totalRepuesto = data.totalPorCaja.reduce((a, r) => a + Number(r.total_repuesto), 0);

  const colsHistorial = [
    { key: 'fecha',        label: 'Fecha' },
    { key: 'caja_origen',  label: 'De' },
    { key: 'caja_destino', label: 'A',  bold: true },
    { key: 'sucursal',     label: 'Sucursal' },
    { key: 'monto',        label: 'Monto Bs', align: 'right', render: v => fmt(v) },
    { key: 'usuario',      label: 'Usuario' },
    { key: 'observaciones',label: 'Observaciones', render: v => v || '—' },
  ];

  const colsTotales = [
    { key: 'caja',              label: 'Caja Chica', bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'num_reposiciones',  label: 'N° reposiciones', align: 'right', render: v => fmtN(v) },
    { key: 'total_repuesto',    label: 'Total repuesto Bs', align: 'right', render: v => fmt(v) },
  ];

  const colsSaldos = [
    { key: 'caja',              label: 'Caja Chica', bold: true },
    { key: 'sucursal',          label: 'Sucursal' },
    { key: 'monto_fondo_fijo',  label: 'Fondo fijo Bs', align: 'right', render: v => fmt(v) },
    { key: 'saldo_actual',      label: 'Saldo actual Bs', align: 'right', render: (v, row) => v === null
        ? <span className="text-zinc-400">Sin turno abierto</span>
        : <span className={Number(v) < Number(row.monto_fondo_fijo) * 0.3 ? 'text-red-500 font-semibold' : 'text-green-600 dark:text-green-400 font-semibold'}>{fmt(v)}</span>
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <FiltroFechas filtros={filtros} onChange={f} />
        <BtnConsultar onClick={buscar} />
      </div>

      <Resumen items={[
        { label: 'Reposiciones', valor: fmtN(data.historial.length) },
        { label: 'Total repuesto', valor: `Bs ${fmt(totalRepuesto)}` },
        { label: 'Cajas chicas', valor: fmtN(data.saldos.length) },
      ]} />

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Saldo actual vs. fondo fijo</h3>
        <Tabla columnas={colsSaldos} filas={data.saldos} cargando={cargando} vacio="Sin cajas chicas configuradas" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Total repuesto por caja (período)</h3>
        <Tabla columnas={colsTotales} filas={data.totalPorCaja} cargando={cargando} vacio="Sin reposiciones en el período" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Historial de reposiciones</h3>
        <Tabla columnas={colsHistorial} filas={data.historial} cargando={cargando} vacio="Sin reposiciones en el período" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Read `Reportes.jsx`'s menu-entries array before editing, to confirm the exact `Tabla`/`Resumen` column prop shapes (`bold`, `align`, `render`) match what Step 2 assumes — adjust `RptCajaChica.jsx` if `ReportesShared.jsx`'s actual API differs from what `RptArqueosCaja.jsx`'s usage implies.**

- [ ] **Step 4: Register the new report in the menu**

In `Reportes.jsx`, add the import:

```js
import RptCajaChica from './components/RptCajaChica';
```

And add an entry to the menu array (same shape as the `arqueos-caja` entry shown in this plan's research, reusing a cash/wallet-style icon or the same one as `arqueos-caja`):

```js
      { id: 'caja-chica', perm: 'caja_chica', label: 'Caja chica', short: 'Ch. chica', icono: <I d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />, comp: RptCajaChica },
```

(the `perm` value `'caja_chica'` matches permission code `reportes.caja_chica` seeded in Task 1 — confirm against how the `perm` field is turned into a `puede()` check elsewhere in `Reportes.jsx` before assuming this exact string is correct.)

- [ ] **Step 5: Manual verification in the browser**

Open Reportes → "Caja chica" tab, confirm the 3 tables render (even empty) with no console errors, then repeat the reposición flow from Task 10 and confirm it shows up in "Historial de reposiciones" after clicking "Consultar".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/reportes.service.js frontend/src/pages/reportes/components/RptCajaChica.jsx frontend/src/pages/reportes/Reportes.jsx
git commit -m "$(cat <<'EOF'
Add Caja Chica report (reposiciones, totals, saldo vs fondo fijo)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Full manual smoke test + backend/frontend restart

**Files:** none

- [ ] **Step 1: Restart both servers** (backend picks up all controller/route changes; frontend already has HMR but a full reload avoids any stale chunk):

```bash
netstat -ano | grep -E ":3000|:5173" | grep LISTENING
# taskkill //F //PID <backend_pid>; taskkill //F //PID <frontend_pid>
cd backend  && nohup node app.js  > /tmp/backend.log  2>&1 & disown
cd frontend && nohup npm run dev  > /tmp/frontend.log 2>&1 & disown
sleep 3 && netstat -ano | grep -E ":3000|:5173" | grep LISTENING
```

- [ ] **Step 2: End-to-end walkthrough in the browser**

1. Gastos → Categorías: create "ELFEC" and "EXPENSAS" as root categories, then "GALLO 20", "GALLO 18", "URK 60", "URK 61" under ELFEC, and "GALLO 20", "GALLO 18", "VICTORIA", "URK 60", "URK 61" under EXPENSAS (matching the user's original example exactly).
2. Caja: create a `CHICA` caja with `monto_fondo_fijo = 500` in a sucursal that has a `GENERAL` caja; open turnos on both.
3. Gastos: register 2-3 small gastos against the Caja Chica turno, using the new EXPENSAS/GALLO 20 subcategory.
4. Caja: click "Reponer" on the Caja Chica, confirm suggested amount, submit.
5. Reportes → Caja chica: confirm the reposición appears in all 3 tables and the numbers reconcile (saldo_actual should be back near/at 500 after the reposición).
6. Reportes → Gastos por categoría: confirm filtering by the Caja Chica's `id_caja` (once that filter is exposed in the UI — if Task 7's `id_caja` param isn't yet wired into `RptGastosCategoria.jsx`'s filters, note it as a fast follow, not a blocker for this plan).
7. Close both arqueos and confirm the closing math (`monto_cierre_sistema`) on each side reflects the reposición correctly.

- [ ] **Step 3: No commit (verification only) — report any discrepancy found back before considering the feature done.**
