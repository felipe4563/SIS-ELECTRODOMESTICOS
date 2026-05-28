const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/caja.Controller');

// Cajas CRUD
router.get('/',        authMiddleware, checkPermission('ver',       'caja'), ctrl.getCajas);
router.post('/',       authMiddleware, checkPermission('gestionar', 'caja'), ctrl.crearCaja);
router.put('/:id',     authMiddleware, checkPermission('gestionar', 'caja'), ctrl.updateCaja);

// Arqueos — rutas estáticas ANTES que /:id
router.get('/arqueos/actual',              authMiddleware, checkPermission('ver_arqueo_propio', 'caja'), ctrl.getArqueoActual);
router.get('/arqueos',                     authMiddleware, checkPermission('ver_arqueo_propio', 'caja'), ctrl.getArqueos);
router.get('/arqueos/:id',                 authMiddleware, checkPermission('ver_arqueo_propio', 'caja'), ctrl.getArqueo);
router.post('/:id_caja/abrir',             authMiddleware, checkPermission('abrir',             'caja'), ctrl.abrirCaja);
router.post('/arqueos/:id/cerrar',         authMiddleware, checkPermission('cerrar',            'caja'), ctrl.cerrarCaja);
router.post('/arqueos/:id/forzar-cierre',  authMiddleware, checkPermission('forzar_cierre',    'caja'), ctrl.forzarCierre);

module.exports = router;
