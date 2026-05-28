const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
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
router.get('/categorias',        authMiddleware, checkPermission('ver',                  'gastos'), ctrl.getCategorias);
router.post('/categorias',       authMiddleware, checkPermission('gestionar_categorias', 'gastos'), ctrl.crearCategoria);
router.put('/categorias/:id',    authMiddleware, checkPermission('gestionar_categorias', 'gastos'), ctrl.updateCategoria);
router.delete('/categorias/:id', authMiddleware, checkPermission('gestionar_categorias', 'gastos'), ctrl.deleteCategoria);

// ── Gastos ────────────────────────────────────────────────────────────────────
router.get('/',    authMiddleware, checkPermission('ver',    'gastos'), ctrl.getGastos);
router.post('/',   authMiddleware, checkPermission('crear',  'gastos'), ctrl.crearGasto);
router.get('/:id', authMiddleware, checkPermission('ver',    'gastos'), ctrl.getGasto);
router.put('/:id', authMiddleware, checkPermission('editar', 'gastos'), ctrl.updateGasto);

router.post('/:id/aprobar',      authMiddleware, checkPermission('aprobar', 'gastos'), ctrl.aprobarGasto);
router.post('/:id/pagar',        authMiddleware, checkPermission('pagar',   'gastos'), ctrl.pagarGasto);
router.post('/:id/anular',       authMiddleware, checkPermission('anular',  'gastos'), ctrl.anularGasto);
router.post('/:id/comprobante',  authMiddleware, checkPermission('crear',   'gastos'), upload.single('comprobante'), ctrl.subirComprobante);

module.exports = router;
