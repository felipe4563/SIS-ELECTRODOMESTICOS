const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/unidades.Controller');

router.get('/',    authMiddleware, checkPermission('ver',       'unidades'), ctrl.getUnidades);
router.post('/',   authMiddleware, checkPermission('gestionar', 'unidades'), ctrl.createUnidad);
router.put('/:id', authMiddleware, checkPermission('gestionar', 'unidades'), ctrl.updateUnidad);
router.delete('/:id', authMiddleware, checkPermission('gestionar', 'unidades'), ctrl.deleteUnidad);

module.exports = router;
