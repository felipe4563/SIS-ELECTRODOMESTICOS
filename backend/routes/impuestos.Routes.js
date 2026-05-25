const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/impuestos.Controller');

router.get('/',       authMiddleware, checkPermission('ver',      'impuestos'), ctrl.getImpuestos);
router.post('/',      authMiddleware, checkPermission('gestionar','impuestos'), ctrl.createImpuesto);
router.put('/:id',    authMiddleware, checkPermission('gestionar','impuestos'), ctrl.updateImpuesto);
router.delete('/:id', authMiddleware, checkPermission('gestionar','impuestos'), ctrl.deleteImpuesto);

module.exports = router;
