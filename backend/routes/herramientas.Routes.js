const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/herramientas.Controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Backup ────────────────────────────────────────────────────────────────────
router.get(    '/backup',               authMiddleware, checkPermission('descargar',  'backup'), ctrl.listarBackups);
router.post(   '/backup/crear',         authMiddleware, checkPermission('crear',      'backup'), ctrl.crearBackup);
router.post(   '/backup/restaurar',     authMiddleware, checkPermission('restaurar',  'backup'), ctrl.restaurarBackup);
router.get(    '/backup/:id/descargar', authMiddleware, checkPermission('descargar',  'backup'), ctrl.descargarBackup);
router.delete( '/backup/:id',           authMiddleware, checkPermission('crear',      'backup'), ctrl.eliminarBackup);

// ── Excel — solo importar ─────────────────────────────────────────────────────
router.post('/excel/importar-productos', authMiddleware, checkPermission('importar_productos', 'excel'), upload.single('archivo'), ctrl.importarProductos);

// ── Catálogo PDF ──────────────────────────────────────────────────────────────
router.get('/catalogo/marcas',      authMiddleware, checkPermission('generar_pdf', 'catalogo'), ctrl.getCatalogoMarcas);
router.get('/catalogo/categorias',  authMiddleware, checkPermission('generar_pdf', 'catalogo'), ctrl.getCatalogoCategorias);
router.get('/catalogo/sucursales',  authMiddleware, checkPermission('generar_pdf', 'catalogo'), ctrl.getCatalogoSucursales);
router.get('/catalogo/pdf',         authMiddleware, checkPermission('generar_pdf', 'catalogo'), ctrl.generarCatalogoPDF);

module.exports = router;
