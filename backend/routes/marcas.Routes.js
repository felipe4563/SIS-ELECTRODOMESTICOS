const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/marcas.Controller');

router.get('/',    authMiddleware, checkPermission('ver',       'marcas'), ctrl.getMarcas);
router.post('/',   authMiddleware, checkPermission('gestionar', 'marcas'), ctrl.createMarca);
router.put('/:id', authMiddleware, checkPermission('gestionar', 'marcas'), ctrl.updateMarca);
router.delete('/:id', authMiddleware, checkPermission('gestionar', 'marcas'), ctrl.deleteMarca);

module.exports = router;
