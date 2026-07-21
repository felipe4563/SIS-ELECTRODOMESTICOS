const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const ctrl    = require('../controllers/productos.Controller');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const { validateMagic, IMAGES_ONLY, EXCEL_ONLY } = require('../middlewares/validateMagic');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.xlsx?$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .xlsx o .xls'), ok);
  },
});

const imgDir = path.join(__dirname, '../uploads/productos');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const uploadImg = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, imgDir),
    filename:    (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      cb(null, `prod_${Date.now()}${ext}`);
    },
  }),
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Solo se permiten imágenes JPG, PNG o WebP'), ok);
  },
});

// ── Datos para formulario ─────────────────────────────────────────────────
router.get('/form-data', authMiddleware, checkPermission('crear', 'productos'), ctrl.getFormData);

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

// ── Imágenes de producto (múltiples) ─────────────────────────────────────
router.get('/:id/imagenes',
  authMiddleware, checkPermission('ver', 'productos'),
  ctrl.getImagenes);

router.post('/:id/imagenes',
  authMiddleware, checkPermission('editar', 'productos'),
  uploadImg.single('imagen'),
  validateMagic(IMAGES_ONLY),
  ctrl.uploadImagen);

router.put('/:id/imagenes/:idImagen/principal',
  authMiddleware, checkPermission('editar', 'productos'),
  ctrl.setPrincipalImagen);

router.delete('/:id/imagenes/:idImagen',
  authMiddleware, checkPermission('editar', 'productos'),
  ctrl.deleteImagen);


module.exports = router;
