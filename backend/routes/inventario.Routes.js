const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl    = require('../controllers/inventario.Controller');
const opsCtrl = require('../controllers/inventarioOps.Controller');

// Stock consolidado
router.get('/stock',
  authMiddleware,
  checkPermission('ver', 'inventario'),
  ctrl.getStockConsolidado
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
router.get('/transferencias',
  authMiddleware, checkPermission('ver', 'inventario'), opsCtrl.getTransferencias);
router.post('/transferencias',
  authMiddleware, checkPermission('transferir_solicitar', 'inventario'), opsCtrl.createTransferencia);
router.get('/transferencias/:id',
  authMiddleware, checkPermission('ver', 'inventario'), opsCtrl.getTransferencia);
router.post('/transferencias/:id/enviar',
  authMiddleware, checkPermission('transferir_enviar', 'inventario'), opsCtrl.enviarTransferencia);
router.post('/transferencias/:id/recibir',
  authMiddleware, checkPermission('transferir_recibir', 'inventario'), opsCtrl.recibirTransferencia);
router.post('/transferencias/:id/anular',
  authMiddleware, checkPermission('transferir_anular', 'inventario'), opsCtrl.anularTransferencia);

// ── Ajustes de inventario ─────────────────────────────────────────────────────
router.get('/ajustes',
  authMiddleware, checkPermission('ver', 'inventario'), opsCtrl.getAjustes);
router.post('/ajustes',
  authMiddleware, checkPermission('ajuste_crear', 'inventario'), opsCtrl.createAjuste);
router.get('/ajustes/:id',
  authMiddleware, checkPermission('ver', 'inventario'), opsCtrl.getAjuste);
router.put('/ajustes/:id',
  authMiddleware, checkPermission('ajuste_crear', 'inventario'), opsCtrl.updateAjuste);
router.post('/ajustes/:id/aprobar',
  authMiddleware, checkPermission('ajuste_aprobar', 'inventario'), opsCtrl.aprobarAjuste);
router.post('/ajustes/:id/anular',
  authMiddleware, checkPermission('ajuste_anular', 'inventario'), opsCtrl.anularAjuste);

module.exports = router;
