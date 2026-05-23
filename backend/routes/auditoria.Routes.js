const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/auditoria.Controller');

router.get('/',          authMiddleware, checkPermission('ver',    'auditoria'), ctrl.getAuditoria);
router.get('/tablas',    authMiddleware, checkPermission('ver',    'auditoria'), ctrl.getTablas);
router.get('/usuarios',  authMiddleware, checkPermission('ver',    'auditoria'), ctrl.getUsuariosAudit);
router.get('/sesiones',  authMiddleware, checkPermission('ver',    'sesiones'),  ctrl.getSesiones);
router.delete('/sesiones/:id', authMiddleware, checkPermission('cerrar', 'sesiones'), ctrl.cerrarSesion);

module.exports = router;
