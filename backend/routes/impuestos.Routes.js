const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/impuestos.Controller');

router.get('/',       authMiddleware, checkPermission('ver',      'impuestos'), ctrl.getImpuestos);
router.post('/',      authMiddleware, checkPermission('crear',    'impuestos'), ctrl.createImpuesto);
router.put('/:id',    authMiddleware, checkPermission('editar',   'impuestos'), ctrl.updateImpuesto);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'impuestos'), ctrl.deleteImpuesto);

module.exports = router;
