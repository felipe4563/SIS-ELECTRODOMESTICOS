const express = require('express');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/reportes.Controller');

router.get('/dashboard',           authMiddleware, checkPermission('ver',               'reportes'), ctrl.getDashboard);
router.get('/ventas',              authMiddleware, checkPermission('ventas_periodo',     'reportes'), ctrl.getVentas);
router.get('/ventas-vendedor',     authMiddleware, checkPermission('ventas_vendedor',    'reportes'), ctrl.getVentasVendedor);
router.get('/ventas-cliente',      authMiddleware, checkPermission('ventas_cliente',     'reportes'), ctrl.getVentasCliente);
router.get('/ventas-producto',     authMiddleware, checkPermission('ventas_producto',    'reportes'), ctrl.getVentasProducto);
router.get('/top-productos',       authMiddleware, checkPermission('ventas_producto',    'reportes'), ctrl.getTopProductos);
router.get('/bonos-vendedores',        authMiddleware, checkPermission('bonos_vendedores', 'reportes'), ctrl.getBonosVendedores);
router.get('/bonos-vendedores-detalle',authMiddleware, checkPermission('bonos_vendedores', 'reportes'), ctrl.getBonosVendedoresDetalle);
router.get('/compras',             authMiddleware, checkPermission('compras_periodo',    'reportes'), ctrl.getCompras);
router.get('/compras-proveedor',   authMiddleware, checkPermission('compras_proveedor', 'reportes'), ctrl.getComprasProveedor);
router.get('/cuentas-cobrar',      authMiddleware, checkPermission('cuentas_cobrar',    'reportes'), ctrl.getCuentasCobrar);
router.get('/cuentas-pagar',       authMiddleware, checkPermission('cuentas_pagar',     'reportes'), ctrl.getCuentasPagar);
router.get('/gastos-categoria',    authMiddleware, checkPermission('gastos_categoria',  'reportes'), ctrl.getGastosCategoria);
router.get('/rentabilidad',        authMiddleware, checkPermission('rentabilidad',       'reportes'), ctrl.getRentabilidad);
router.get('/estado-resultados',   authMiddleware, checkPermission('estado_resultados', 'reportes'), ctrl.getEstadoResultados);
router.get('/arqueos-caja',        authMiddleware, checkPermission('arqueos_caja',      'reportes'), ctrl.getArqueosCaja);
router.get('/alertas-stock',       authMiddleware, checkPermission('alertas_stock',     'reportes'), ctrl.getAlertasStock);
router.get('/stock-consolidado',   authMiddleware, checkPermission('stock_consolidado', 'reportes'), ctrl.getStockConsolidado);
router.get('/kardex/:id_producto', authMiddleware, checkPermission('kardex',            'reportes'), ctrl.getKardexProducto);
router.get('/transferencias',      authMiddleware, checkPermission('transferencias',    'reportes'), ctrl.getTransferencias);
router.get('/devoluciones',        authMiddleware, checkPermission('devoluciones',      'reportes'), ctrl.getDevoluciones);
router.get('/exportar',            authMiddleware, checkPermission('exportar',          'reportes'), ctrl.exportarReporte);

// Catálogos para filtros — solo requieren autenticación, sin permiso específico
router.get('/form-data/sucursales', authMiddleware, ctrl.getFormDataSucursales);

module.exports = router;
