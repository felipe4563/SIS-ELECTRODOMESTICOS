const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/monedas.Controller');

router.get('/',       authMiddleware, checkPermission('ver',        'monedas'), ctrl.getMonedas);
router.post('/',      authMiddleware, checkPermission('gestionar',  'monedas'), ctrl.createMoneda);
router.put('/:id',    authMiddleware, checkPermission('gestionar',  'monedas'), ctrl.updateMoneda);
router.delete('/:id', authMiddleware, checkPermission('gestionar',  'monedas'), ctrl.deleteMoneda);

module.exports = router;
