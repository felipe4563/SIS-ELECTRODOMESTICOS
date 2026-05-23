const express         = require('express');
const router          = express.Router();
const ctrl            = require('../controllers/proveedores.Controller');
const {authMiddleware, checkPermission}  = require('../middlewares/authMiddleware');

// ── Proveedores ───────────────────────────────────────────────────────────
router.get('/',    authMiddleware, checkPermission('ver',      'proveedores'), ctrl.getProveedores);
router.get('/:id', authMiddleware, checkPermission('ver',      'proveedores'), ctrl.getProveedor);
router.post('/',   authMiddleware, checkPermission('crear',    'proveedores'), ctrl.createProveedor);
router.put('/:id', authMiddleware, checkPermission('editar',   'proveedores'), ctrl.updateProveedor);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'proveedores'), ctrl.deleteProveedor);

// ── Contactos ─────────────────────────────────────────────────────────────
router.get('/:id/contactos',
  authMiddleware, checkPermission('ver', 'proveedores'), ctrl.getContactos);
router.post('/:id/contactos',
  authMiddleware, checkPermission('gestionar_contactos', 'proveedores'), ctrl.createContacto);
router.put('/:id/contactos/:idC',
  authMiddleware, checkPermission('gestionar_contactos', 'proveedores'), ctrl.updateContacto);
router.delete('/:id/contactos/:idC',
  authMiddleware, checkPermission('gestionar_contactos', 'proveedores'), ctrl.deleteContacto);

// ── Cuentas de pago ───────────────────────────────────────────────────────
router.get('/:id/cuentas',
  authMiddleware, checkPermission('ver', 'proveedores'), ctrl.getCuentas);
router.post('/:id/cuentas',
  authMiddleware, checkPermission('gestionar_cuentas', 'proveedores'), ctrl.createCuenta);
router.put('/:id/cuentas/:idC',
  authMiddleware, checkPermission('gestionar_cuentas', 'proveedores'), ctrl.updateCuenta);
router.delete('/:id/cuentas/:idC',
  authMiddleware, checkPermission('gestionar_cuentas', 'proveedores'), ctrl.deleteCuenta);

module.exports = router;
