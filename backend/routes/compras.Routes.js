const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/compras.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

router.get ('/',    authMiddleware, checkPermission('ver',              'compras'), ctrl.getCompras);
router.post('/',    authMiddleware, checkPermission('crear_pre_pedido', 'compras'), ctrl.createCompra);
router.get ('/:id', authMiddleware, checkPermission('ver',              'compras'), ctrl.getCompra);
router.put ('/:id', authMiddleware, checkPermission('editar_pre_pedido','compras'), ctrl.updateCompra);

router.post('/:id/confirmar', authMiddleware, checkPermission('confirmar_pedido', 'compras'), ctrl.confirmarPedido);
router.post('/:id/recibir',   authMiddleware, checkPermission('recibir',          'compras'), ctrl.recibirMercaderia);
router.post('/:id/anular',    authMiddleware, checkPermission('anular',           'compras'), ctrl.anularCompra);

router.post  ('/:id/pagos',          authMiddleware, checkPermission('pagar',      'compras'), ctrl.createPago);
router.delete('/:id/pagos/:idPago',  authMiddleware, checkPermission('anular_pago','compras'), ctrl.anularPago);

module.exports = router;
