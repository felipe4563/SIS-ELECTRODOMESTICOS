const router = require('express').Router();
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/depositos.Controller');

// Listar/consultar depósitos: también accesible a usuarios con permisos de inventario
// (necesitan la lista para selectores en transferencias, ajustes, kardex)
const puedeVerDepositos = checkAnyPermission([
  ['ver',                  'depositos'],
  ['ver',                  'inventario'],
  ['ver_todos_depositos',  'inventario'],
  ['transferir_solicitar', 'inventario'],
  ['transferir_enviar',    'inventario'],
  ['transferir_recibir',   'inventario'],
  ['transferir_anular',    'inventario'],
  ['ajuste_crear',         'inventario'],
  ['ajuste_aprobar',       'inventario'],
  ['ajuste_anular',        'inventario'],
  ['ver_kardex',           'inventario'],
  ['alertas_ver',          'inventario'],
]);

router.get('/',       authMiddleware, puedeVerDepositos,                       ctrl.getDepositos);
router.get('/:id',    authMiddleware, puedeVerDepositos,                       ctrl.getDeposito);
router.post('/',      authMiddleware, checkPermission('crear',    'depositos'), ctrl.createDeposito);
router.put('/:id',    authMiddleware, checkPermission('editar',   'depositos'), ctrl.updateDeposito);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'depositos'), ctrl.deleteDeposito);

module.exports = router;
