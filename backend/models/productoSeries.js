// ── productoSeries.js ──────────────────────────────────────────────────────
// Módulo de queries compartido sobre `compra_detalle_series`, la tabla que
// actúa como unidad central de trazabilidad de números de serie: cada fila
// es una unidad física individual que atraviesa estados (EN_STOCK →
// EN_TRANSITO → EN_STOCK / VENDIDA) a medida que se compra, transfiere entre
// depósitos o vende.
//
// Ninguna función de este módulo abre ni cierra su propia transacción:
// reciben `db` (la conexión/pool mysql2 ya usada en el resto del proyecto,
// vía `db.promise()`) y se ejecutan dentro de la transacción del llamador.

// Lista las series EN_STOCK de un producto en un depósito determinado
// (p.ej. para ofrecerlas como origen de una transferencia o venta).
async function listarDisponibles(db, { id_producto, id_deposito }) {
  const [rows] = await db.promise().query(
    `SELECT id_serie, numero_serie, imagen_url
     FROM compra_detalle_series
     WHERE id_producto = ? AND id_deposito_actual = ? AND estado = 'EN_STOCK'`,
    [id_producto, id_deposito]
  );
  return rows;
}

// Alta manual de una unidad (p.ej. backfill de inventario existente, sin
// compra asociada). Queda EN_STOCK en el depósito indicado.
async function cargarManual(db, { id_producto, id_deposito, numero_serie, imagen_url, id_usuario }) {
  try {
    const [r] = await db.promise().query(
      `INSERT INTO compra_detalle_series
         (id_detalle, id_producto, numero_serie, imagen_url, id_deposito_actual, estado, origen, id_usuario)
       VALUES (NULL, ?, ?, ?, ?, 'EN_STOCK', 'MANUAL', ?)`,
      [id_producto, numero_serie, imagen_url || null, id_deposito, id_usuario]
    );
    return { id_serie: r.insertId };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new Error('DUPLICADO');
    throw err;
  }
}

// Marca las unidades como EN_TRANSITO (salida hacia otro depósito por
// transferencia). Exige que todas estuvieran EN_STOCK Y en el depósito de
// origen esperado (id_deposito_origen) en una sola query atómica: esto
// cierra la ventana de carrera donde dos transferencias eligen la misma
// serie antes de que ninguna la envíe — si una ya la recibió en otro
// depósito (volvió a EN_STOCK ahí), la condición de id_deposito_actual hace
// que el UPDATE no la toque, y el chequeo de affectedRows abajo lo detecta.
// Si alguna fila no cumple ambas condiciones (o no existe), no se actualiza
// nada para esa fila y se lanza SERIE_NO_DISPONIBLE para que el llamador
// revierta la transacción completa.
// `id_transferencia_detalle` se acepta por compatibilidad de firma con el
// llamador (Task 4 lo necesitará para su propio registro), pero esta
// función no lo persiste: la columna que lo guardaría no existe todavía en
// compra_detalle_series (llega en una migración de Task 4).
async function moverATransito(db, idsSerie, { id_transferencia_detalle, id_deposito_origen } = {}) {
  if (!idsSerie || !idsSerie.length) return;
  const [r] = await db.promise().query(
    `UPDATE compra_detalle_series
     SET estado = 'EN_TRANSITO'
     WHERE id_serie IN (?) AND estado = 'EN_STOCK' AND id_deposito_actual = ?`,
    [idsSerie, id_deposito_origen]
  );
  if (r.affectedRows !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
}

// Confirma la recepción de unidades EN_TRANSITO en el depósito destino:
// vuelven a EN_STOCK, ya ubicadas en el nuevo depósito.
async function confirmarRecepcion(db, idsSerie, { id_deposito_destino }) {
  if (!idsSerie || !idsSerie.length) return;
  const [r] = await db.promise().query(
    `UPDATE compra_detalle_series
     SET estado = 'EN_STOCK', id_deposito_actual = ?
     WHERE id_serie IN (?) AND estado = 'EN_TRANSITO'`,
    [id_deposito_destino, idsSerie]
  );
  if (r.affectedRows !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
}

// Anula una transferencia antes de que llegue a destino: las unidades
// EN_TRANSITO vuelven a EN_STOCK en su depósito de origen original.
async function revertirATransito(db, idsSerie, { id_deposito_origen }) {
  if (!idsSerie || !idsSerie.length) return;
  const [r] = await db.promise().query(
    `UPDATE compra_detalle_series
     SET estado = 'EN_STOCK', id_deposito_actual = ?
     WHERE id_serie IN (?) AND estado = 'EN_TRANSITO'`,
    [id_deposito_origen, idsSerie]
  );
  if (r.affectedRows !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
}

// Marca unidades como vendidas: dejan de estar en cualquier depósito y
// quedan ligadas a la línea de venta que las vendió.
async function marcarVendida(db, idsSerie, { id_venta_detalle }) {
  if (!idsSerie || !idsSerie.length) return;
  const [r] = await db.promise().query(
    `UPDATE compra_detalle_series
     SET estado = 'VENDIDA', id_deposito_actual = NULL, id_venta_detalle = ?
     WHERE id_serie IN (?) AND estado = 'EN_STOCK'`,
    [id_venta_detalle, idsSerie]
  );
  if (r.affectedRows !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
}

// Revierte una venta (total o parcialmente, al anularla o al editar un
// borrador que ya tenía series asociadas antes de recrear sus líneas): las
// unidades VENDIDA vuelven a EN_STOCK en el depósito indicado, liberadas de
// la línea de venta que las vendió. Simétrico a revertirATransito pero
// partiendo de VENDIDA en vez de EN_TRANSITO.
async function revertirVenta(db, idsSerie, { id_deposito_destino }) {
  if (!idsSerie || !idsSerie.length) return;
  const [r] = await db.promise().query(
    `UPDATE compra_detalle_series
     SET estado = 'EN_STOCK', id_deposito_actual = ?, id_venta_detalle = NULL
     WHERE id_serie IN (?) AND estado = 'VENDIDA'`,
    [id_deposito_destino, idsSerie]
  );
  if (r.affectedRows !== idsSerie.length) throw new Error('SERIE_NO_DISPONIBLE');
}

module.exports = {
  listarDisponibles,
  cargarManual,
  moverATransito,
  confirmarRecepcion,
  revertirATransito,
  marcarVendida,
  revertirVenta,
};
