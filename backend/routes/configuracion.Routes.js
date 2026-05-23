const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/configuracion.Controller');

router.get('/',         authMiddleware, checkPermission('ver',    'parametros'), ctrl.getParametros);
router.put('/:clave',   authMiddleware, checkPermission('editar', 'parametros'), ctrl.updateParametro);

module.exports = router;
