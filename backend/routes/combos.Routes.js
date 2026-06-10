const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const { validateMagic, IMAGES_ONLY } = require('../middlewares/validateMagic');
const C = require('../controllers/combosPromos.Controller');

const combosImgDir = path.join(__dirname, '../uploads/combos');
const uploadImg = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(combosImgDir)) fs.mkdirSync(combosImgDir, { recursive: true });
      cb(null, combosImgDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `combo_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/.test(file.mimetype);
    cb(ok ? null : new Error('Solo JPG, PNG o WebP'), ok);
  },
});

router.use(authMiddleware);

router.get('/',               checkPermission('ver',      'combos'), C.getCombos);
router.get('/:id',            checkPermission('ver',      'combos'), C.getCombo);
router.post('/',              checkPermission('crear',    'combos'), C.createCombo);
router.put('/:id',            checkPermission('editar',   'combos'), C.updateCombo);
router.delete('/:id',         checkPermission('eliminar', 'combos'), C.deleteCombo);
router.get('/:id/productos',  checkPermission('ver',      'combos'), C.getComboDetalle);
router.post('/:id/productos', checkPermission('editar',   'combos'), C.upsertComboDetalle);
router.post('/:id/imagen',    checkPermission('editar',   'combos'), uploadImg.single('imagen'), validateMagic(IMAGES_ONLY), C.uploadImagenCombo);

module.exports = router;
