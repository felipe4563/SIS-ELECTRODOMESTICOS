const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/cobros.Controller');

// Rutas estáticas ANTES de /:id para evitar conflictos
router.get('/cuentas-por-cobrar',                 authMiddleware, checkPermission('ver', 'cobros'),    ctrl.getCuentasPorCobrar);
router.get('/cliente/:id_cliente/ventas-pendientes', authMiddleware, checkPermission('ver', 'cobros'), ctrl.getVentasPendientes);

router.get('/',    authMiddleware, checkPermission('ver',    'cobros'), ctrl.getCobros);
router.post('/',   authMiddleware, checkPermission('crear',  'cobros'), ctrl.registrarCobro);

router.get('/:id/recibo', authMiddleware, checkPermission('imprimir', 'cobros'), ctrl.getRecibo);
router.put('/:id',        authMiddleware, checkPermission('editar',   'cobros'), ctrl.updateCobro);
router.delete('/:id',     authMiddleware, checkPermission('anular',   'cobros'), ctrl.anularCobro);

module.exports = router;
