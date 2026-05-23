const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/roles.Controller');

router.get('/',                 authMiddleware, checkPermission('ver',              'roles'),    ctrl.getRoles);
router.get('/permisos',         authMiddleware, checkPermission('ver',              'permisos'), ctrl.getPermisos);
router.get('/:id/permisos',     authMiddleware, checkPermission('asignar_permisos', 'roles'),    ctrl.getRolPermisos);
router.post('/',                authMiddleware, checkPermission('crear',            'roles'),    ctrl.createRol);
router.put('/:id',              authMiddleware, checkPermission('editar',           'roles'),    ctrl.updateRol);
router.delete('/:id',           authMiddleware, checkPermission('eliminar',         'roles'),    ctrl.deleteRol);
router.put('/:id/permisos',     authMiddleware, checkPermission('asignar_permisos', 'roles'),    ctrl.asignarPermisos);

module.exports = router;
