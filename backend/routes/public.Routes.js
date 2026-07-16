const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/public.Controller');

router.get('/empresa',            ctrl.getEmpresa);
router.get('/categorias',         ctrl.getCategorias);
router.get('/marcas',             ctrl.getMarcas);
router.get('/productos',          ctrl.getProductos);
router.get('/producto/:codigo',   ctrl.getProductoPorCodigo);
router.get('/colores',            ctrl.getColores);
router.get('/promociones',        ctrl.getPromociones);
router.get('/combos',             ctrl.getCombos);

module.exports = router;
