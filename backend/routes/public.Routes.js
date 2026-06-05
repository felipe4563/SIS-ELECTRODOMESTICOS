const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/public.Controller');

router.get('/producto/:codigo', ctrl.getProductoPorCodigo);

module.exports = router;
