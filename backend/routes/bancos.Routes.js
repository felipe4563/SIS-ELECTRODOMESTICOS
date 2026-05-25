const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/bancos.Controller');

router.get('/',       authMiddleware, checkPermission('ver',      'bancos'), ctrl.getBancos);
router.post('/',      authMiddleware, checkPermission('gestionar','bancos'), ctrl.createBanco);
router.put('/:id',    authMiddleware, checkPermission('gestionar','bancos'), ctrl.updateBanco);
router.delete('/:id', authMiddleware, checkPermission('gestionar','bancos'), ctrl.deleteBanco);

module.exports = router;
