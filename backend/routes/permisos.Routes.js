const router = require('express').Router();
const { authMiddleware, checkPermission } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/roles.Controller');

// GET /api/permisos
router.get('/', authMiddleware, checkPermission('ver', 'permisos'), ctrl.getPermisos);

module.exports = router;
