const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/sucursales.Controller');

router.get('/',    authMiddleware, checkPermission('ver',      'sucursales'), ctrl.getSucursales);
router.get('/:id', authMiddleware, checkPermission('ver',      'sucursales'), ctrl.getSucursal);
router.post('/',   authMiddleware, checkPermission('crear',    'sucursales'), ctrl.createSucursal);
router.put('/:id', authMiddleware, checkPermission('editar',   'sucursales'), ctrl.updateSucursal);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'sucursales'), ctrl.deleteSucursal);

module.exports = router;
