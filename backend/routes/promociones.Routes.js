const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const C = require('../controllers/combosPromos.Controller');

router.use(authMiddleware);

router.get('/exportar/pdf',    checkPermission('exportar',  'promociones'), C.exportarPromociones);
router.get('/items-para-promo',checkPermission('ver',       'promociones'), C.getItemsParaPromocion);
router.get('/vigentes',        checkPermission('ver',       'promociones'), C.getPromocionesVigentes);
router.get('/',                checkPermission('ver',       'promociones'), C.getPromociones);
router.get('/:id',             checkPermission('ver',       'promociones'), C.getPromocion);
router.post('/',               checkPermission('crear',     'promociones'), C.createPromocion);
router.put('/:id',             checkPermission('editar',    'promociones'), C.updatePromocion);
router.delete('/:id',          checkPermission('eliminar',  'promociones'), C.deletePromocion);
router.get('/:id/aplicaciones',  checkPermission('ver',    'promociones'), C.getAplicaciones);
router.post('/:id/aplicaciones', checkAnyPermission([['crear','promociones'],['editar','promociones']]), C.upsertAplicaciones);

module.exports = router;
