const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/ventas.Controller');

router.get('/',    authMiddleware, checkPermission('ver_sucursal', 'ventas'), ctrl.getVentas);
router.post('/',   authMiddleware, checkPermission('crear_menor',  'ventas'), ctrl.createVenta);
router.get('/:id', authMiddleware, checkPermission('ver_sucursal', 'ventas'), ctrl.getVenta);
router.put('/:id', authMiddleware, checkPermission('editar_borrador', 'ventas'), ctrl.updateVenta);

router.post('/:id/emitir',  authMiddleware, checkPermission('emitir', 'ventas'), ctrl.emitirVenta);
router.post('/:id/cobrar',  authMiddleware, checkPermission('cobrar', 'ventas'), ctrl.registrarCobro);
router.post('/:id/anular',  authMiddleware, checkPermission('anular', 'ventas'), ctrl.anularVenta);
router.get('/:id/ticket',   authMiddleware, checkPermission('imprimir', 'ventas'), ctrl.getTicket);

router.post('/:id/devoluciones',              authMiddleware, checkPermission('devolucion_crear',   'ventas'), ctrl.crearDevolucion);
router.post('/devoluciones/:id_devolucion/aprobar',  authMiddleware, checkPermission('devolucion_aprobar', 'ventas'), ctrl.aprobarDevolucion);
router.post('/devoluciones/:id_devolucion/rechazar', authMiddleware, checkPermission('devolucion_aprobar', 'ventas'), ctrl.rechazarDevolucion);

router.delete('/cobros/:id_pago', authMiddleware, checkPermission('anular_cobro', 'ventas'), ctrl.anularCobro);

module.exports = router;
