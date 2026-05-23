const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/categorias.Controller');

router.get('/',    authMiddleware, checkPermission('ver',       'categorias'), ctrl.getCategorias);
router.post('/',   authMiddleware, checkPermission('gestionar', 'categorias'), ctrl.createCategoria);
router.put('/:id', authMiddleware, checkPermission('gestionar', 'categorias'), ctrl.updateCategoria);
router.delete('/:id', authMiddleware, checkPermission('gestionar', 'categorias'), ctrl.deleteCategoria);

module.exports = router;
