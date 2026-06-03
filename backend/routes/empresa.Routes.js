const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/empresa.Controller');

// ── Multer para logo ──────────────────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `empresa_${req.params.id}${ext}`);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
    cb(null, true);
  },
});

// ── Rutas ─────────────────────────────────────────────────────────────────
router.get('/publico',    ctrl.getEmpresaPublico);                                                                          // pública
router.get('/',           authMiddleware, checkPermission('ver',    'configuracion'), ctrl.getEmpresa);
router.post('/',          authMiddleware, checkPermission('editar', 'empresa'),       ctrl.createEmpresa);
router.put('/:id',        authMiddleware, checkPermission('editar', 'empresa'),       ctrl.updateEmpresa);
router.post('/:id/logo',  authMiddleware, checkPermission('editar', 'empresa'),       uploadLogo.single('logo'), ctrl.uploadLogo);

module.exports = router;
