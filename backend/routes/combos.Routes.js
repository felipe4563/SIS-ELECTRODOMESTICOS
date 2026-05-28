const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const C = require('../controllers/combosPromos.Controller');

router.use(authMiddleware);

router.get('/',                  checkPermission('ver',      'combos'), C.getCombos);
router.get('/:id',               checkPermission('ver',      'combos'), C.getCombo);
router.post('/',                 checkPermission('crear',    'combos'), C.createCombo);
router.put('/:id',               checkPermission('editar',   'combos'), C.updateCombo);
router.delete('/:id',            checkPermission('eliminar', 'combos'), C.deleteCombo);
router.get('/:id/productos',     checkPermission('ver',      'combos'), C.getComboDetalle);
router.post('/:id/productos',    checkPermission('editar',   'combos'), C.upsertComboDetalle);

module.exports = router;
