const express  = require('express');
const router   = express.Router();

const { login, logout, cambiarContrasena, me, seleccionarSucursal } = require('../controllers/auth.Controller');
const { authMiddleware }                                             = require('../middlewares/authMiddleware');

// POST /api/auth/login  — pública
router.post('/login', login);

// POST /api/auth/logout — requiere token válido
router.post('/logout', authMiddleware, logout);

// POST /api/auth/cambiar-contrasena — requiere token válido
router.post('/cambiar-contrasena', authMiddleware, cambiarContrasena);

// GET  /api/auth/me — datos del usuario autenticado
router.get('/me', authMiddleware, me);

// POST /api/auth/seleccionar-sucursal — elegir sucursal de trabajo
router.post('/seleccionar-sucursal', authMiddleware, seleccionarSucursal);

module.exports = router;
