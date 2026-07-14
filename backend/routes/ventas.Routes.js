const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { authMiddleware, checkPermission, checkAnyPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/ventas.Controller');

const storageSerie = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'series');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `serie-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadSerie = multer({
  storage: storageSerie,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const puedeVerVentas = checkAnyPermission([
  ['ver_propias',  'ventas'],
  ['ver_sucursal', 'ventas'],
  ['ver_todas',    'ventas'],
]);

const puedeCrearVenta = checkAnyPermission([
  ['crear_menor', 'ventas'],
  ['crear_mayor', 'ventas'],
]);

// Rutas fijas ANTES de /:id para evitar conflictos
router.get('/form-data',                authMiddleware, puedeCrearVenta,  ctrl.getFormData);
router.post('/agregar-producto-rapido', authMiddleware, puedeCrearVenta,  ctrl.agregarProductoRapido);

router.get('/',    authMiddleware, puedeVerVentas,                              ctrl.getVentas);
router.post('/',   authMiddleware, puedeCrearVenta,                             ctrl.createVenta);
router.get('/stock-deposito/:id_deposito', authMiddleware, puedeCrearVenta, ctrl.getStockDeposito);
router.get('/:id', authMiddleware, puedeVerVentas,                              ctrl.getVenta);
router.put('/:id', authMiddleware, checkPermission('editar_borrador', 'ventas'), ctrl.updateVenta);

router.get('/:id/preview', authMiddleware, puedeVerVentas, ctrl.getPreview);
router.post('/:id/emitir',   authMiddleware, checkPermission('emitir',          'ventas'), ctrl.emitirVenta);
router.post('/:id/cobrar',   authMiddleware, checkPermission('cobrar',           'ventas'), ctrl.registrarCobro);
router.post('/:id/anular',   authMiddleware, checkPermission('anular',           'ventas'), ctrl.anularVenta);
router.get('/:id/ticket',    authMiddleware, checkPermission('imprimir',         'ventas'), ctrl.getTicket);

router.post('/:id/devoluciones',                     authMiddleware, checkPermission('devolucion_crear',   'ventas'), ctrl.crearDevolucion);
router.post('/devoluciones/:id_devolucion/aprobar',  authMiddleware, checkPermission('devolucion_aprobar', 'ventas'), ctrl.aprobarDevolucion);
router.post('/devoluciones/:id_devolucion/rechazar', authMiddleware, checkPermission('devolucion_aprobar', 'ventas'), ctrl.rechazarDevolucion);

router.delete('/cobros/:id_pago', authMiddleware, checkPermission('anular_cobro', 'ventas'), ctrl.anularCobro);

router.post('/detalle/:id_detalle/imagen-serie', authMiddleware, checkAnyPermission([['crear','ventas'],['editar_borrador','ventas']]), uploadSerie.single('imagen_serie'), ctrl.subirImagenSerie);

module.exports = router;
