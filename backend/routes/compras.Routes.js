const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const ctrl    = require('../controllers/compras.Controller');
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const { validateMagic, IMAGES_ONLY } = require('../middlewares/validateMagic');

const puedeVerCompras = checkAnyPermission([['ver', 'compras'], ['ver_todas', 'compras']]);
const puedeRecibirCompras = checkAnyPermission([['recibir', 'compras'], ['recibir_parcial', 'compras']]);
const puedeEditarFactura = checkAnyPermission([['editar_pre_pedido', 'compras'], ['recibir', 'compras'], ['recibir_parcial', 'compras']]);

const uploadDir = path.join(__dirname, '..', 'uploads', 'compras');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
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
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Debe ir antes de /:id para que no lo capture como parámetro
router.get ('/form-data', authMiddleware,
  checkAnyPermission([['ver', 'compras'], ['ver_todas', 'compras'], ['crear_pre_pedido', 'compras']]),
  ctrl.getFormData);

router.get ('/',    authMiddleware, puedeVerCompras,                                ctrl.getCompras);
router.post('/',    authMiddleware, checkPermission('crear_pre_pedido', 'compras'), ctrl.createCompra);
router.get ('/:id', authMiddleware, puedeVerCompras,                               ctrl.getCompra);
router.put ('/:id', authMiddleware, checkPermission('editar_pre_pedido','compras'), ctrl.updateCompra);
router.put ('/:id/factura', authMiddleware, puedeEditarFactura, ctrl.actualizarFacturaCompra);
router.post('/:id/factura-imagen', authMiddleware, puedeEditarFactura,
  upload.single('imagen'), validateMagic(IMAGES_ONLY), ctrl.subirFacturaImagen);
router.post('/:id/detalle/:idDetalle/imagen', authMiddleware, puedeEditarFactura,
  upload.single('imagen'), validateMagic(IMAGES_ONLY), ctrl.subirImagenDetalle);
router.post('/:id/detalle/:idDetalle/series', authMiddleware, puedeEditarFactura,
  upload.single('imagen'), validateMagic(IMAGES_ONLY), ctrl.agregarSerieDetalle);
router.delete('/:id/detalle/:idDetalle/series/:idSerie', authMiddleware, puedeEditarFactura, ctrl.eliminarSerieDetalle);

router.post('/:id/aprobar',   authMiddleware, checkPermission('aprobar',           'compras'), ctrl.aprobarCompra);
router.post('/:id/confirmar', authMiddleware, checkPermission('confirmar_pedido',  'compras'), ctrl.confirmarPedido);
router.post('/:id/recibir',   authMiddleware, puedeRecibirCompras,                            ctrl.recibirMercaderia);
router.post('/:id/anular',    authMiddleware, checkPermission('anular',            'compras'), ctrl.anularCompra);

router.post  ('/:id/pagos',              authMiddleware, checkPermission('pagar',           'compras'),
  upload.single('comprobante'), validateMagic(IMAGES_ONLY), ctrl.createPago);
router.delete('/:id/pagos/:idPago',      authMiddleware, checkPermission('anular_pago',     'compras'), ctrl.anularPago);
router.put   ('/:id/cuotas/:idCuota',    authMiddleware, checkPermission('gestionar_cuotas','compras'), ctrl.actualizarCuota);

module.exports = router;
