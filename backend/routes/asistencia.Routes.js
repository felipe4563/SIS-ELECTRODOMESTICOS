const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/asistencia.Controller');

router.get('/hoy',              authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.getMiAsistenciaHoy);
router.get('/mi-historial',     authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.getMiHistorial);
router.post('/entrada',         authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.marcarEntrada);
router.post('/salida',          authMiddleware, checkPermission('marcar', 'asistencia'), ctrl.marcarSalida);
router.get('/',                 authMiddleware, checkPermission('ver',    'asistencia'), ctrl.getAsistencias);
router.put('/:id/justificar',   authMiddleware, checkPermission('editar', 'asistencia'), ctrl.justificarFalta);

module.exports = router;
