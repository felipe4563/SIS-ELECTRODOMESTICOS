const express = require('express');
const router  = express.Router();

const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/servicioTecnico.Controller');

// ── Permiso de vista (cualquiera de los dos) ─────────────────────────────────
const puedeVer = checkAnyPermission([
  ['ver',       'servicio_tecnico'],
  ['ver_todas', 'servicio_tecnico'],
]);

// ── Técnicos externos  (rutas estáticas primero) ─────────────────────────────
router.get ('/tecnicos',          authMiddleware, puedeVer,                                            ctrl.getTecnicos);
router.post('/tecnicos',          authMiddleware, checkPermission('gestionar_tecnicos', 'servicio_tecnico'), ctrl.createTecnico);
router.put ('/tecnicos/:id',      authMiddleware, checkPermission('gestionar_tecnicos', 'servicio_tecnico'), ctrl.updateTecnico);
router.put ('/tecnicos/:id/toggle', authMiddleware, checkPermission('gestionar_tecnicos', 'servicio_tecnico'), ctrl.toggleTecnico);

// ── Datos para formularios ────────────────────────────────────────────────────
router.get('/form-data', authMiddleware, puedeVer, ctrl.getFormData);

// ── Reportes ──────────────────────────────────────────────────────────────────
router.get('/reportes',        authMiddleware, checkPermission('servicio_tecnico', 'reportes'), ctrl.getReporte);
router.get('/reportes/detalle', authMiddleware, checkPermission('servicio_tecnico', 'reportes'), ctrl.getReporteDetalle);

// ── CRUD órdenes ──────────────────────────────────────────────────────────────
router.get ('/',    authMiddleware, puedeVer,                                        ctrl.getServicios);
router.post('/',    authMiddleware, checkPermission('crear',  'servicio_tecnico'),   ctrl.createServicio);
router.get ('/:id', authMiddleware, puedeVer,                                        ctrl.getServicio);
router.put ('/:id', authMiddleware, checkPermission('editar', 'servicio_tecnico'),   ctrl.updateServicio);

// ── Acciones de estado ────────────────────────────────────────────────────────
router.put('/:id/estado',    authMiddleware, checkPermission('cambiar_estado', 'servicio_tecnico'), ctrl.cambiarEstadoHandler);
router.put('/:id/entregar',  authMiddleware, checkPermission('entregar',       'servicio_tecnico'), ctrl.entregarServicio);
router.put('/:id/anular',    authMiddleware, checkPermission('anular',         'servicio_tecnico'), ctrl.anularServicio);

// ── Recibo / ticket ───────────────────────────────────────────────────────────
router.get('/:id/recibo', authMiddleware, checkPermission('imprimir', 'servicio_tecnico'), ctrl.getRecibo);

module.exports = router;
