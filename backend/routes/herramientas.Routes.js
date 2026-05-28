const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/herramientas.Controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Backup ────────────────────────────────────────────────────────────────────
router.get(    '/backup',               authMiddleware, checkPermission('ver',        'herramientas'), ctrl.listarBackups);
router.post(   '/backup/crear',         authMiddleware, checkPermission('crear',      'backup'),       ctrl.crearBackup);
router.post(   '/backup/restaurar',     authMiddleware, checkPermission('restaurar',  'backup'),       ctrl.restaurarBackup);
router.get(    '/backup/:id/descargar', authMiddleware, checkPermission('descargar',  'backup'),       ctrl.descargarBackup);
router.delete( '/backup/:id',           authMiddleware, checkPermission('crear',      'backup'),       ctrl.eliminarBackup);

// ── Excel ─────────────────────────────────────────────────────────────────────
router.get(  '/excel/plantilla',          authMiddleware, checkPermission('exportar_planilla',  'excel'), ctrl.descargarPlantilla);
router.get(  '/excel/exportar-productos', authMiddleware, checkPermission('exportar_productos', 'excel'), ctrl.exportarProductos);
router.post( '/excel/importar-productos', authMiddleware, checkPermission('importar_productos', 'excel'), upload.single('archivo'), ctrl.importarProductos);

// ── Código de barras ──────────────────────────────────────────────────────────
router.get( '/codigo-barras/imagen/:id_producto',   authMiddleware, checkPermission('generar', 'codigo_barras'), ctrl.generarCodigoBarras);
router.get( '/codigo-barras/imprimir',              authMiddleware, checkPermission('generar', 'codigo_barras'), ctrl.imprimirCodigoBarras);
router.get( '/codigo-barras/imprimir/:id_producto', authMiddleware, checkPermission('generar', 'codigo_barras'), ctrl.imprimirCodigoBarras);

// ── Catálogo PDF ──────────────────────────────────────────────────────────────
router.get( '/catalogo/marcas',     authMiddleware, checkPermission('ver',          'herramientas'), ctrl.getCatalogoMarcas);
router.get( '/catalogo/categorias', authMiddleware, checkPermission('ver',          'herramientas'), ctrl.getCatalogoCategorias);
router.get( '/catalogo/pdf',        authMiddleware, checkPermission('generar_pdf',  'catalogo'),     ctrl.generarCatalogoPDF);

// ── Impresora ─────────────────────────────────────────────────────────────────
router.get( '/impresora', authMiddleware, checkPermission('ver',        'herramientas'),  ctrl.getImpresora);
router.put( '/impresora', authMiddleware, checkPermission('configurar', 'impresora'),     ctrl.updateImpresora);

// ── Factura plantilla ─────────────────────────────────────────────────────────
router.get( '/factura/plantilla', authMiddleware, checkPermission('ver',        'herramientas'), ctrl.getPlantillaFactura);
router.put( '/factura/plantilla', authMiddleware, checkPermission('configurar', 'impresora'),    ctrl.updatePlantillaFactura);

// ── Eliminar registros ────────────────────────────────────────────────────────
router.get(  '/bd/tablas',            authMiddleware, checkPermission('eliminar_registros', 'bd'), ctrl.getTablasBorrables);
router.post( '/bd/eliminar-registros', authMiddleware, checkPermission('eliminar_registros', 'bd'), ctrl.eliminarRegistros);

module.exports = router;
