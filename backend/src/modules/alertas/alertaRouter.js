const express = require('express');
const alertaController = require('./alertaController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/estudiante/:estudianteId', authenticate, alertaController.getByEstudiante);
router.post('/',         authenticate, authorize('admin', 'docente'), alertaController.create);
router.put('/:id/resolver', authenticate, authorize('admin', 'docente'), alertaController.resolver);

module.exports = router;
