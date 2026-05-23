const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/usuarios.Controller');

// Perfil propio (no requiere permiso especial, sólo sesión)
router.put('/mi-perfil', authMiddleware, ctrl.updateMiPerfil);

// CRUD usuarios
router.get('/',    authMiddleware, checkPermission('ver',    'usuarios'), ctrl.getUsuarios);
router.get('/:id', authMiddleware, checkPermission('ver',    'usuarios'), ctrl.getUsuario);
router.post('/',   authMiddleware, checkPermission('crear',  'usuarios'), ctrl.createUsuario);
router.put('/:id', authMiddleware, checkPermission('editar', 'usuarios'), ctrl.updateUsuario);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'usuarios'), ctrl.deleteUsuario);

// Acciones adicionales
router.post('/:id/reset-password',  authMiddleware, checkPermission('resetear_password',  'usuarios'), ctrl.resetPassword);
router.put('/:id/sucursales',        authMiddleware, checkPermission('asignar_sucursales', 'usuarios'), ctrl.asignarSucursales);
router.post('/:id/cerrar-sesiones',  authMiddleware, checkPermission('cerrar_sesiones',    'usuarios'), ctrl.cerrarSesiones);

module.exports = router;
