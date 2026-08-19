const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/compras.Controller');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');

const puedeVerCompras = checkAnyPermission([['ver', 'compras'], ['ver_todas', 'compras']]);
const puedeRecibirCompras = checkAnyPermission([['recibir', 'compras'], ['recibir_parcial', 'compras']]);

// Debe ir antes de /:id para que no lo capture como parámetro
router.get ('/form-data', authMiddleware,
  checkAnyPermission([['ver', 'compras'], ['ver_todas', 'compras'], ['crear_pre_pedido', 'compras']]),
  ctrl.getFormData);

router.get ('/',    authMiddleware, puedeVerCompras,                                ctrl.getCompras);
router.post('/',    authMiddleware, checkPermission('crear_pre_pedido', 'compras'), ctrl.createCompra);
router.get ('/:id', authMiddleware, puedeVerCompras,                               ctrl.getCompra);
router.put ('/:id', authMiddleware, checkPermission('editar_pre_pedido','compras'), ctrl.updateCompra);
router.put ('/:id/factura', authMiddleware,
  checkAnyPermission([['editar_pre_pedido', 'compras'], ['recibir', 'compras'], ['recibir_parcial', 'compras']]),
  ctrl.actualizarFacturaCompra);

router.post('/:id/aprobar',   authMiddleware, checkPermission('aprobar',           'compras'), ctrl.aprobarCompra);
router.post('/:id/confirmar', authMiddleware, checkPermission('confirmar_pedido',  'compras'), ctrl.confirmarPedido);
router.post('/:id/recibir',   authMiddleware, puedeRecibirCompras,                            ctrl.recibirMercaderia);
router.post('/:id/anular',    authMiddleware, checkPermission('anular',            'compras'), ctrl.anularCompra);

router.post  ('/:id/pagos',              authMiddleware, checkPermission('pagar',           'compras'), ctrl.createPago);
router.delete('/:id/pagos/:idPago',      authMiddleware, checkPermission('anular_pago',     'compras'), ctrl.anularPago);
router.put   ('/:id/cuotas/:idCuota',    authMiddleware, checkPermission('gestionar_cuotas','compras'), ctrl.actualizarCuota);

module.exports = router;
