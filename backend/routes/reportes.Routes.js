const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/reportes.Controller');

router.get('/dashboard',         authMiddleware, checkPermission('ver', 'dashboard'), ctrl.getDashboard);
router.get('/ventas',            authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getVentas);
router.get('/ventas-vendedor',   authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getVentasVendedor);
router.get('/ventas-cliente',    authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getVentasCliente);
router.get('/ventas-producto',   authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getVentasProducto);
router.get('/compras',           authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getCompras);
router.get('/cuentas-cobrar',    authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getCuentasCobrar);
router.get('/cuentas-pagar',     authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getCuentasPagar);
router.get('/rentabilidad',      authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getRentabilidad);
router.get('/estado-resultados', authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getEstadoResultados);
router.get('/bonos-vendedores',  authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getBonosVendedores);
router.get('/stock-consolidado', authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getStockConsolidado);
router.get('/kardex/:id_producto', authMiddleware, checkPermission('ver', 'reportes'), ctrl.getKardexProducto);
router.get('/arqueos-caja',      authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getArqueosCaja);
router.get('/gastos-categoria',  authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getGastosCategoria);
router.get('/top-productos',     authMiddleware, checkPermission('ver', 'reportes'),  ctrl.getTopProductos);
router.get('/exportar',          authMiddleware, checkPermission('ver', 'reportes'),  ctrl.exportarReporte);

module.exports = router;
