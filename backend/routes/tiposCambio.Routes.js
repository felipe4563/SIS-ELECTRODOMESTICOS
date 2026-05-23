const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/tiposCambio.Controller');

router.get('/',       authMiddleware, checkPermission('ver',        'tipos_cambio'), ctrl.getTiposCambio);
router.get('/hoy',    authMiddleware, checkPermission('ver',        'tipos_cambio'), ctrl.getTipoCambioHoy);
router.post('/',      authMiddleware, checkPermission('gestionar',  'tipos_cambio'), ctrl.createTipoCambio);
router.delete('/:id', authMiddleware, checkPermission('gestionar',  'tipos_cambio'), ctrl.deleteTipoCambio);

module.exports = router;
