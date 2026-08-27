const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const ctrl    = require('../controllers/inventario.Controller');
const opsCtrl = require('../controllers/inventarioOps.Controller');

// Form-data para Kardex y otros filtros — cualquier permiso de inventario habilita el acceso
const puedeVerInventario = checkAnyPermission([
  ['ver',                 'inventario'],
  ['ver_todos_depositos', 'inventario'],
  ['ver_kardex',          'inventario'],
  ['alertas_ver',         'inventario'],
  ['transferir_solicitar','inventario'],
  ['transferir_enviar',   'inventario'],
  ['transferir_recibir',  'inventario'],
  ['transferir_anular',   'inventario'],
  ['ajuste_crear',        'inventario'],
  ['ajuste_aprobar',      'inventario'],
  ['ajuste_anular',       'inventario'],
]);

router.get('/form-data', authMiddleware, puedeVerInventario, ctrl.getKardexFormData);
router.get('/stock-deposito/:id', authMiddleware, puedeVerInventario, ctrl.getStockDeposito);

// Stock consolidado: acepta ver O ver_todos_depositos
router.get('/stock',
  authMiddleware,
  checkAnyPermission([['ver', 'inventario'], ['ver_todos_depositos', 'inventario']]),
  ctrl.getStockConsolidado
);

// Editar stock mínimo de un producto
router.put('/stock-minimo/:id',
  authMiddleware,
  checkPermission('stock_minimo_editar', 'inventario'),
  ctrl.editarStockMinimo
);

// Kardex
router.get('/kardex',
  authMiddleware,
  checkPermission('ver_kardex', 'inventario'),
  ctrl.getKardex
);

// Alertas
router.get('/alertas',
  authMiddleware,
  checkPermission('alertas_ver', 'inventario'),
  ctrl.getAlertas
);

router.patch('/alertas/:id/atender',
  authMiddleware,
  checkPermission('alertas_atender', 'inventario'),
  ctrl.atenderAlerta
);

// ── Transferencias ────────────────────────────────────────────────────────────
const puedeVerTransferencias = checkAnyPermission([
  ['transferir_solicitar', 'inventario'],
  ['transferir_enviar',    'inventario'],
  ['transferir_recibir',   'inventario'],
  ['transferir_anular',    'inventario'],
]);

router.get('/transferencias',
  authMiddleware, puedeVerTransferencias, opsCtrl.getTransferencias);
router.post('/transferencias',
  authMiddleware, checkPermission('transferir_solicitar', 'inventario'), opsCtrl.createTransferencia);
router.get('/transferencias/:id',
  authMiddleware, puedeVerTransferencias, opsCtrl.getTransferencia);
router.put('/transferencias/:id',
  authMiddleware, checkPermission('transferir_solicitar', 'inventario'), opsCtrl.updateTransferencia);
router.post('/transferencias/:id/emitir',
  authMiddleware, checkPermission('transferir_solicitar', 'inventario'), opsCtrl.emitirTransferencia);
router.post('/transferencias/:id/enviar',
  authMiddleware, checkPermission('transferir_enviar', 'inventario'), opsCtrl.enviarTransferencia);
router.post('/transferencias/:id/recibir',
  authMiddleware, checkPermission('transferir_recibir', 'inventario'), opsCtrl.recibirTransferencia);
router.post('/transferencias/:id/anular',
  authMiddleware, checkPermission('transferir_anular', 'inventario'), opsCtrl.anularTransferencia);

// ── Ajustes de inventario ─────────────────────────────────────────────────────
const puedeVerAjustes = checkAnyPermission([
  ['ajuste_crear',   'inventario'],
  ['ajuste_aprobar', 'inventario'],
  ['ajuste_anular',  'inventario'],
]);

router.get('/ajustes',
  authMiddleware, puedeVerAjustes, opsCtrl.getAjustes);
router.post('/ajustes',
  authMiddleware, checkPermission('ajuste_crear', 'inventario'), opsCtrl.createAjuste);
router.get('/ajustes/:id',
  authMiddleware, puedeVerAjustes, opsCtrl.getAjuste);
router.put('/ajustes/:id',
  authMiddleware, checkPermission('ajuste_crear', 'inventario'), opsCtrl.updateAjuste);
router.post('/ajustes/:id/aprobar',
  authMiddleware, checkPermission('ajuste_aprobar', 'inventario'), opsCtrl.aprobarAjuste);
router.post('/ajustes/:id/anular',
  authMiddleware, checkPermission('ajuste_anular', 'inventario'), opsCtrl.anularAjuste);

module.exports = router;
