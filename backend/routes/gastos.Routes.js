const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const { validateMagic, IMAGES_AND_PDF }   = require('../middlewares/validateMagic');
const ctrl = require('../controllers/gastos.Controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'gastos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── Categorías de gasto ──────────────────────────────────────────────────────
router.get('/categorias',        authMiddleware, checkAnyPermission([['ver','gastos'],['crear','gastos'],['categorias_ver','gastos'],['categorias_gestionar','gastos']]), ctrl.getCategorias);
router.post('/categorias',       authMiddleware, checkPermission('categorias_gestionar', 'gastos'), ctrl.crearCategoria);
router.put('/categorias/:id',    authMiddleware, checkPermission('categorias_gestionar', 'gastos'), ctrl.updateCategoria);
router.delete('/categorias/:id', authMiddleware, checkPermission('categorias_gestionar', 'gastos'), ctrl.deleteCategoria);

// ── Gastos ────────────────────────────────────────────────────────────────────
router.get('/form-data', authMiddleware, checkAnyPermission([['ver','gastos'],['crear','gastos'],['ver_todos','gastos']]), ctrl.getFormData);
router.get('/',    authMiddleware, checkAnyPermission([['ver','gastos'],['ver_todos','gastos']]), ctrl.getGastos);
router.post('/',   authMiddleware, checkPermission('crear',  'gastos'), ctrl.crearGasto);
router.get('/:id', authMiddleware, checkAnyPermission([['ver','gastos'],['ver_todos','gastos']]), ctrl.getGasto);
router.put('/:id', authMiddleware, checkPermission('editar', 'gastos'), ctrl.updateGasto);

router.post('/:id/aprobar',      authMiddleware, checkPermission('aprobar',              'gastos'), ctrl.aprobarGasto);
router.post('/:id/pagar',        authMiddleware, checkPermission('pagar',                'gastos'), ctrl.pagarGasto);
router.post('/:id/anular',       authMiddleware, checkPermission('anular',               'gastos'), ctrl.anularGasto);
router.post('/:id/comprobante',  authMiddleware, checkPermission('adjuntar_comprobante', 'gastos'), upload.single('comprobante'), validateMagic(IMAGES_AND_PDF), ctrl.subirComprobante);

module.exports = router;
