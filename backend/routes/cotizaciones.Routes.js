const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/cotizaciones.Controller');

router.get('/form-data',  authMiddleware, checkPermission('ver', 'cotizaciones'), ctrl.getFormData);

router.get('/',    authMiddleware, checkPermission('ver', 'cotizaciones'), ctrl.getCotizaciones);
router.post('/',   authMiddleware, checkPermission('crear', 'cotizaciones'), ctrl.createCotizacion);
router.get('/:id', authMiddleware, checkPermission('ver', 'cotizaciones'), ctrl.getCotizacion);
router.put('/:id', authMiddleware, checkPermission('editar', 'cotizaciones'), ctrl.updateCotizacion);

router.post('/:id/emitir',          authMiddleware, checkPermission('emitir', 'cotizaciones'), ctrl.emitirCotizacion);
router.post('/:id/aprobar',         authMiddleware, checkPermission('aprobar', 'cotizaciones'), ctrl.aprobarCotizacion);
router.post('/:id/rechazar',        authMiddleware, checkPermission('rechazar', 'cotizaciones'), ctrl.rechazarCotizacion);
router.post('/:id/anular',          authMiddleware, checkPermission('anular', 'cotizaciones'), ctrl.anularCotizacion);
router.post('/:id/convertir-venta', authMiddleware, checkPermission('convertir_venta', 'cotizaciones'), ctrl.convertirVenta);
router.get('/:id/pdf',              authMiddleware, checkPermission('ver', 'cotizaciones'), ctrl.getPDF);

module.exports = router;
