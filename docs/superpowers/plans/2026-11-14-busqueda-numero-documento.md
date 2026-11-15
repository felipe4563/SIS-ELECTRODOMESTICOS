# Búsqueda por Número de Documento (Transferencias y Ajustes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user find a Transferencia or Ajuste by typing its system-generated document number (e.g. `TRF-202609-0038`, `AJU-202611-0008`) into a search box on each module's list page, matching the search behavior already present in Ventas, Cotizaciones, Cobros, Servicio Técnico and Compras.

**Architecture:** Mirror the existing `q`-param pattern already used across the codebase: a text input in the list page's filters bar, debounced/wired into the existing `filtros` state, sent as a `q` query param, and matched server-side with `numero LIKE '%<q>%'`. Transferencias' backend (`getTransferencias`) already implements this — only its frontend is missing the input. Ajustes is missing it on both ends.

**Tech Stack:** Node.js/Express + mysql2 (backend), React + Vite (frontend). No automated test suite in this project (`backend/package.json` test script is a stub) — verification is via `curl` against the running dev backend and manual code/UI tracing, consistent with prior work in this codebase.

**Spec:** No separate spec file — short design was agreed in conversation (see plan header above for the full agreed scope). Confirmed explicitly out of scope: Ventas, Cotizaciones, Cobros, Servicio Técnico, Compras (already have working search) and Técnicos Externos (no document-number concept).

## Global Constraints

- Match the exact existing `q`-filter SQL pattern: `(x.numero LIKE ? OR ...)` with `params.push(`%${q}%`, ...)`, as in `getTransferencias` (`backend/controllers/inventarioOps.Controller.js:88-91`).
- Match the exact existing frontend input markup/classes used in `Transferencias.jsx`/`Ajustes.jsx`'s filters grid (`inputCls`, same `grid` wrapper), not a new visual style.
- Do not touch Ventas, Cotizaciones, Cobros, Servicio Técnico, Compras, or Técnicos Externos — those are out of scope.
- No automated tests exist for this backend/frontend; verify with `curl` (backend) and `npm run build` + manual trace (frontend), per established project convention.

## Review Focus

- Empty `q` (not sent, or sent as `''`): must behave exactly like today — no filter applied, full list returned. (Pinned by Task 1's "no `q` param" curl check and by `Object.fromEntries(...).filter(([, v]) => v !== '')` already stripping empty strings in both list pages' `cargar()`.)
- `q` with no matches: must return `{ ajustes: [], total: 0, ... }` / empty transferencias list, not an error. (Pinned by Task 1's curl check with a nonsense string.)
- Partial match on the number's middle segment (e.g. just `202609` or just `0038`): `LIKE '%<q>%'` must still match since the pattern wraps `q` on both sides. (Pinned by Task 1's curl check.)
- Typing in the new input must not fight the date-range/estado/depósito filters already in `filtros` state — it's one more key in the same object, following the same `setF(k, v)` pattern, so no separate state or race is introduced. (Pinned by Task 2/3 code review against the existing `setF` helper.)
- SQL injection via `q`: already mitigated identically to every other module — parameterized `?` placeholders, never string-interpolated into the query. (Pinned by Task 1's implementation using `params.push`, matching `getTransferencias`.)

---

### Task 1: Backend — add `q` filter to `getAjustes`

**Files:**
- Modify: `backend/controllers/inventarioOps.Controller.js:779-820` (`getAjustes`)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `GET /api/inventario/ajustes?q=<texto>` now filters results by `a.numero LIKE '%<texto>%'`, combinable with the existing `estado`/`id_deposito`/`fecha_desde`/`fecha_hasta` params. Task 2's frontend relies on this exact param name (`q`).

- [ ] **Step 1: Add `q` to the destructured query params**

In `getAjustes` (line 781), add `q` to the destructure, matching `getTransferencias` line 78:
```js
const { estado, id_deposito, fecha_desde, fecha_hasta, q, page = 1, limit = 20 } = req.query;
```

- [ ] **Step 2: Add the `q` WHERE clause**

Right after the existing `fecha_hasta` push (after line 789), add, matching the shape of `getTransferencias` lines 88-91 (but only one column — `ajustes_inventario` has no joined-name column worth searching):
```js
if (q) {
  where.push('a.numero LIKE ?');
  params.push(`%${q}%`);
}
```

- [ ] **Step 3: Restart the backend and verify with curl**

With the dev backend running (test auth: sign a JWT with `JWT_SECRET` from `backend/.env`, payload `{ jti: '<uuid>', id_usuario: 1, rol: 1, id_sucursal: null, debe_cambiar_pass: 0 }`, plus a matching active row in `sesiones`, as used throughout this project's prior sessions):
1. `curl .../api/inventario/ajustes` (no `q`) → same `total` as before this change.
2. `curl .../api/inventario/ajustes?q=AJU` → `total` > 0, every returned `numero` contains `AJU`.
3. `curl .../api/inventario/ajustes?q=zzzznoexiste` → `{ "ajustes": [], "total": 0, ... }`.
4. Pick one known real ajuste's `numero` (e.g. from step 1's output), query with just its middle `YYYYMM` segment as `q` → that ajuste is in the results.

Expected: all four checks pass as described.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/inventarioOps.Controller.js
git commit -m "feat: permitir buscar ajustes de inventario por numero de documento"
```

---

### Task 2: Frontend — search input in Ajustes list

**Files:**
- Modify: `frontend/src/pages/inventario/Ajustes.jsx:30-32` (filtros state), `:101-117` (filters grid)

**Interfaces:**
- Consumes: Task 1's `q` param on `GET /api/inventario/ajustes`.
- Produces: nothing consumed by later tasks (Task 3 is independent).

- [ ] **Step 1: Add `q` to `filtros` initial state**

Line 30-32, add `q: ''` to the initial object:
```js
const [filtros,   setFiltros]   = useState({
  q: '', estado: '', id_deposito: '', fecha_desde: HACE30, fecha_hasta: HOY,
});
```

- [ ] **Step 2: Add the search input to the filters grid**

In the filters grid (currently `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, lines 101-117), add a text input as the first child, following the exact pattern used in `Compras.jsx` lines 170-177 (placeholder, `value`, `onChange={e => setF('q', e.target.value)}`, reusing `inputCls`). Use placeholder `"Número de ajuste…"`. Widen the grid to `lg:grid-cols-5` to fit the new field alongside the existing four without crowding.

- [ ] **Step 3: `npm run build` in `frontend/` and manual trace**

Run: `npm run build` (in `frontend/`)
Expected: clean build, no errors.

Manually trace: typing in the new input calls `setF('q', value)` → updates `filtros.q` → on next `cargar(1)` call (the existing "Buscar" button, or add the same `onKeyDown` Enter-triggers-search pattern as `Compras.jsx` line 175) → `Object.fromEntries(...).filter(([, v]) => v !== '')` passes `q` through when non-empty, strips it when empty → `ajustesService.getAll({ q: ..., ... })`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/inventario/Ajustes.jsx
git commit -m "feat: agregar buscador por numero en el listado de ajustes"
```

---

### Task 3: Frontend — search input in Transferencias list

**Files:**
- Modify: `frontend/src/pages/inventario/Transferencias.jsx:33-36` (filtros state), `:108-130` (filters grid)

**Interfaces:**
- Consumes: the already-existing `q` param on `GET /api/inventario/transferencias` (`getTransferencias`, `backend/controllers/inventarioOps.Controller.js:76-126` — no backend change needed).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add `q` to `filtros` initial state**

Line 33-36, add `q: ''`:
```js
const [filtros,        setFiltros]        = useState({
  q: '', estado: '', id_deposito_origen: '', id_deposito_destino: '',
  fecha_desde: HACE30, fecha_hasta: HOY,
});
```

- [ ] **Step 2: Add the search input to the filters grid**

In the filters grid (currently `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, lines 109-129), add a text input as the first child, same pattern as Task 2 Step 2 and `Compras.jsx` lines 170-177. Use placeholder `"Número de transferencia…"`. Widen the grid to `lg:grid-cols-4` to fit the new field.

Note: this page already debounces on every `filtros` change (lines 57-60, 400ms `setTimeout`), unlike Ajustes which only loads on mount/button-click — so the new input gets live search automatically here; don't add an `onKeyDown` Enter handler for it (there's no need, and `Compras.jsx`'s pattern doesn't apply to this already-debounced page).

- [ ] **Step 3: `npm run build` in `frontend/` and manual trace**

Run: `npm run build` (in `frontend/`)
Expected: clean build, no errors.

Manually trace: typing in the new input calls `setF('q', value)` → updates `filtros.q` → the existing debounced `useEffect` (lines 57-60) fires `cargar(1)` 400ms after the last keystroke → `q` passed through to `transferenciasService.getAll`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/inventario/Transferencias.jsx
git commit -m "feat: agregar buscador por numero en el listado de transferencias"
```
