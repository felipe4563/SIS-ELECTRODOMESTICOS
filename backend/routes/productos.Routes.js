const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/productos.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.xlsx?$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .xlsx o .xls'), ok);
  },
});

// ── Productos CRUD ────────────────────────────────────────────────────────
router.get('/',    authMiddleware, checkPermission('ver',      'productos'), ctrl.getProductos);
router.get('/:id', authMiddleware, checkPermission('ver',      'productos'), ctrl.getProducto);
router.post('/',   authMiddleware, checkPermission('crear',    'productos'), ctrl.createProducto);
router.put('/:id', authMiddleware, checkPermission('editar',   'productos'), ctrl.updateProducto);
router.delete('/:id', authMiddleware, checkPermission('eliminar', 'productos'), ctrl.deleteProducto);

// ── Histórico de precios ──────────────────────────────────────────────────
router.get('/:id/historico-precios',
  authMiddleware, checkPermission('ver_historico_precios', 'productos'), ctrl.getHistoricoPrecios);

// ── Stock por depósito ────────────────────────────────────────────────────
router.get('/:id/stock',
  authMiddleware, checkPermission('ver', 'productos'), ctrl.getStock);

// ── Importación masiva ────────────────────────────────────────────────────
router.post('/importar/excel',
  authMiddleware, checkPermission('importar', 'productos'),
  upload.single('archivo'),
  ctrl.importarDesdeExcel);

module.exports = router;
