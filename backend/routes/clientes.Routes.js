const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/clientes.Controller');
const {authMiddleware, checkPermission}  = require('../middlewares/authMiddleware');

// ── Clientes CRUD ─────────────────────────────────────────────────────────
router.get('/',    authMiddleware, checkPermission('ver',      'clientes'), ctrl.getClientes);
router.get('/:id', authMiddleware, checkPermission('ver',      'clientes'), ctrl.getCliente);
router.post('/',   authMiddleware, checkPermission('crear',    'clientes'), ctrl.createCliente);
router.put('/:id', authMiddleware, checkPermission('editar',   'clientes'), ctrl.updateCliente);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'clientes'), ctrl.deleteCliente);

// ── Crédito ───────────────────────────────────────────────────────────────
router.patch('/:id/credito', authMiddleware, checkPermission('dar_credito', 'clientes'), ctrl.updateCredito);

// ── Direcciones ───────────────────────────────────────────────────────────
router.get('/:id/direcciones',
  authMiddleware, checkPermission('ver', 'clientes'), ctrl.getDirecciones);
router.post('/:id/direcciones',
  authMiddleware, checkPermission('gestionar_direcciones', 'clientes'), ctrl.createDireccion);
router.put('/:id/direcciones/:idD',
  authMiddleware, checkPermission('gestionar_direcciones', 'clientes'), ctrl.updateDireccion);
router.delete('/:id/direcciones/:idD',
  authMiddleware, checkPermission('gestionar_direcciones', 'clientes'), ctrl.deleteDireccion);

module.exports = router;
