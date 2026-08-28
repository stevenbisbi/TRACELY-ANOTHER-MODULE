const express = require('express');
const multer = require('multer');
const excusaController = require('./excusaController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

// El certificado se recibe en memoria (PDF o imagen), hasta 10 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Diagnóstico (cualquier usuario autenticado)
router.get('/estado-ia', authenticate, excusaController.estadoIA);

// Estudiante
router.post('/', authenticate, authorize('estudiante', 'admin'), upload.single('documento'), excusaController.radicar);
router.get('/mias', authenticate, authorize('estudiante', 'admin'), excusaController.misExcusas);

// Dirección de programa
router.get('/pendientes', authenticate, authorize('director_programa', 'admin'), excusaController.pendientes);
router.post('/:id/decision', authenticate, authorize('director_programa', 'admin'), excusaController.decidir);

module.exports = router;
