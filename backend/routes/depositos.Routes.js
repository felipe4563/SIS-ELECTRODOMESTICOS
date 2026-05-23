const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/depositos.Controller');

router.get('/',       authMiddleware, checkPermission('ver',      'depositos'), ctrl.getDepositos);
router.get('/:id',    authMiddleware, checkPermission('ver',      'depositos'), ctrl.getDeposito);
router.post('/',      authMiddleware, checkPermission('crear',    'depositos'), ctrl.createDeposito);
router.put('/:id',    authMiddleware, checkPermission('editar',   'depositos'), ctrl.updateDeposito);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'depositos'), ctrl.deleteDeposito);

module.exports = router;
