# Categorías/subcategorías de gasto + Caja General vs Caja Chica

Fecha: 2026-09-12

## Contexto y objetivo

Hoy `categorias_gasto` es una lista plana (sin jerarquía) y `cajas` no
distingue entre una caja de venta/cobro (Caja General) y un fondo fijo para
gastos menores (Caja Chica) — ambas se comportan exactamente igual en el
código. Al registrar un gasto, además, el backend asigna automáticamente el
arqueo abierto más reciente del usuario (`crearGasto` en
`gastos.Controller.js`), sin dejar elegir la caja — esto rompe si un usuario
llega a tener dos cajas abiertas a la vez (General y Chica).

Este spec cubre dos piezas relacionadas:

1. **Categorías y subcategorías de gasto** (ej. ELFEC → GALLO 20, GALLO 18,
   URK 60, URK 61; EXPENSAS → GALLO 20, GALLO 18, VICTORIA, URK 60, URK 61).
2. **Caja Chica como fondo fijo**, con reposición desde Caja General
   modelada como un movimiento explícito y auditable (Opción B: tabla
   `movimientos_caja`), más los 4 reportes pedidos.

Fuera de alcance: cambiar el flujo de cobros de ventas, manejo de múltiples
monedas en `movimientos_caja` (se asume la misma moneda base que el resto de
caja/gastos), aprobaciones/flujo de autorización de la reposición (queda
para una fase posterior si se necesita).

## Modelo de datos

### `categorias_gasto` (ALTER)

- `id_categoria_gasto_padre` int NULL — FK a `categorias_gasto.id_categoria_gasto`
  (mismo patrón que ya usa la tabla `categorias` de productos).

Una categoría raíz tiene `id_categoria_gasto_padre = NULL`. Un gasto
(`gastos.id_categoria_gasto`) siempre apunta a una hoja (subcategoría), no a
la raíz, para que el reporte "Gastos por Categoría" pueda agrupar tanto por
subcategoría exacta como por categoría padre (JOIN hacia arriba por
`id_categoria_gasto_padre`). Si una categoría no tiene subcategorías
definidas, el gasto puede apuntar directamente a ella (se admite raíz como
hoja cuando no tiene hijos).

### `cajas` (ALTER)

- `tipo` enum('GENERAL','CHICA') NOT NULL DEFAULT 'GENERAL'
- `monto_fondo_fijo` decimal(14,2) DEFAULT NULL — solo aplica a tipo
  `CHICA`; es el monto al que debe volver tras cada reposición.

### `movimientos_caja` (nueva tabla)

| Columna             | Tipo                              | Notas                                                        |
|---------------------|------------------------------------|---------------------------------------------------------------|
| id_movimiento        | bigint PK AI                      |                                                                |
| id_caja_origen       | int FK cajas                      | normalmente la caja tipo GENERAL                              |
| id_caja_destino      | int FK cajas                      | normalmente la caja tipo CHICA                                |
| id_arqueo_origen     | bigint FK arqueos_caja NULL       | arqueo abierto de origen al momento del movimiento            |
| id_arqueo_destino    | bigint FK arqueos_caja NULL       | arqueo abierto de destino al momento del movimiento           |
| monto                | decimal(14,2) NOT NULL            |                                                                 |
| tipo                 | enum('REPOSICION') NOT NULL DEFAULT 'REPOSICION' | deja espacio a otros tipos de traspaso a futuro |
| observaciones        | varchar(255) NULL                 |                                                                 |
| id_usuario           | int FK usuarios                   | quién ejecutó el movimiento                                    |
| fecha                | datetime DEFAULT current_timestamp() |                                                              |

Si al momento del movimiento alguna de las dos cajas no tiene un arqueo
abierto, el `id_arqueo_*` correspondiente queda NULL (el movimiento igual se
registra; simplemente no se refleja en el cuadre de un turno puntual, solo
en el histórico/reportes).

### Migraciones

Una migración nueva (`migracion_29_caja_chica.sql`) con los 3 ALTER/CREATE
de arriba, más un `INSERT` de la categoría semilla "Reposición Caja Chica"
en `categorias_gasto` (queda disponible por si se prefiere registrar una
reposición como gasto en algún caso puntual, aunque el flujo principal usa
`movimientos_caja`).

## Lógica de negocio (backend)

### Fix previo: selección explícita de caja en gastos

`crearGasto` deja de inferir el arqueo por "el más reciente abierto del
usuario" y pasa a recibir `id_caja` (o `id_arqueo`) explícito desde el
formulario. Se valida que el usuario tenga esa caja abierta antes de
insertar. Esto es necesario en cuanto exista más de una caja abierta
simultáneamente para la misma persona.

### Reposición

- `POST /caja/movimientos` — body `{ id_caja_origen, id_caja_destino, monto, observaciones }`.
  - Valida permiso `caja.reponer_caja_chica`.
  - Valida que `id_caja_destino` sea tipo `CHICA` y `id_caja_origen` tipo `GENERAL` (o ambas activas, mismo `id_sucursal`).
  - Toma los arqueos abiertos actuales de ambas cajas (si existen) para `id_arqueo_origen`/`id_arqueo_destino`.
  - Inserta el movimiento.
  - Devuelve el monto sugerido de reposición cuando se llama sin `monto`: `monto_fondo_fijo - saldo_actual_destino`.

- `GET /caja/:id/saldo-actual` — para una caja `CHICA`, calcula:
  `saldo = monto_apertura_arqueo_actual + reposiciones_recibidas - gastos_del_arqueo`
  (mismo patrón de cálculo que ya usa `monto_cierre_sistema_provisional` en
  `getArqueo`, sumando el término de `movimientos_caja` como destino).

### Cambios en el cálculo de cierre de arqueo

En `caja.Controller.js`, tanto `getArqueo` (cálculo provisional) como
`_cerrarArqueo` (cálculo final) ganan un término más en la fórmula de
`monto_cierre_sistema`:

```
monto_cierre_sistema =
    monto_apertura
  + total_cobros
  - total_gastos
  - total_pagos_compra
  - total_movimientos_como_origen   -- nuevo: reposiciones que salieron de esta caja
  + total_movimientos_como_destino  -- nuevo: reposiciones que entraron a esta caja
```

Mismo patrón exacto que ya usan para sumar/restar los otros tres términos
(un `SELECT COALESCE(SUM(...))` filtrado por `id_arqueo`).

## Reportes

1. **Historial de reposiciones**: listado de `movimientos_caja` con join a
   caja origen/destino (nombre, sucursal), usuario y fecha. Filtrable por
   caja, sucursal y rango de fechas.
2. **Total repuesto por período**: `SUM(monto)` de `movimientos_caja`
   agrupado por caja destino y por mes/rango de fechas.
3. **Saldo actual vs fondo fijo**: por cada caja tipo `CHICA`,
   `monto_fondo_fijo` vs saldo actual (mismo cálculo de `saldo-actual`
   arriba). Pensado como tarjetas con semáforo: verde si el saldo está
   cerca del fondo fijo, rojo si está muy por debajo (sugiere reponer).
4. **Gastos de caja chica por categoría**: extiende el reporte existente
   `reportes.gastos_categoria` con un filtro opcional por `id_caja` (el
   gasto ya queda vinculado a su arqueo → su caja mediante `id_arqueo`).

## Permisos nuevos

- `caja.reponer_caja_chica` — quién puede ejecutar una reposición (módulo 10, junto a los demás permisos de `caja`).
- `reportes.caja_chica` — quién puede ver los 4 reportes de caja chica (módulo 12, junto a `reportes.arqueos_caja`).

## Frontend (referencia, se detalla en el plan de implementación)

- **Gestión de Categorías de Gasto**: pantalla pasa a mostrar árbol
  categoría → subcategorías (crear/editar/desactivar en ambos niveles).
- **Formulario de Gasto**: select en cascada (categoría → subcategoría) +
  select explícito de caja cuando el usuario tiene más de una abierta.
- **Cajas**: la lista de cajas muestra el tipo (badge General/Chica) y, para
  las de tipo Chica, el fondo fijo y el saldo actual.
- **Detalle de Caja Chica**: botón "Reponer" que abre un modal con el monto
  sugerido (editable) y observaciones.
- **Reportes**: nueva sección "Caja Chica" con los 4 reportes descritos
  arriba.

## Testing

- Backend: pruebas de `crearGasto` con `id_caja` explícito (incluyendo el
  caso de dos cajas abiertas simultáneamente por el mismo usuario).
- Backend: pruebas de `POST /caja/movimientos` (permiso, validación de
  tipo de caja origen/destino, cálculo del monto sugerido).
- Backend: pruebas de `getArqueo`/`_cerrarArqueo` con movimientos como
  origen y como destino, verificando que `monto_cierre_sistema` los
  incorpore correctamente en ambas direcciones.
- Manual: flujo completo en el navegador — crear categoría con
  subcategorías, registrar un gasto de Caja Chica, reponerla desde Caja
  General, verificar que ambos arqueos cuadren y que los 4 reportes
  reflejen el movimiento.
