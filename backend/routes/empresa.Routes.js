const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const { getEmpresa, updateEmpresa } = require('../controllers/empresa.Controller');

router.get('/',    authMiddleware, checkPermission('ver',    'configuracion'), getEmpresa);
router.put('/:id', authMiddleware, checkPermission('editar', 'empresa'),       updateEmpresa);

module.exports = router;
