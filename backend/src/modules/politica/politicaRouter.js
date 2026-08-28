const express = require('express');
const multer = require('multer');
const politicaController = require('./politicaController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Consulta (autenticado)
router.get('/vigente',  authenticate, politicaController.vigente);
router.get('/',         authenticate, authorize('admin', 'decano'), politicaController.historial);

// Interpretación y aplicación de reglamento (solo admin)
router.post('/interpretar', authenticate, authorize('admin'), upload.single('reglamento'), politicaController.interpretar);
router.post('/aplicar',     authenticate, authorize('admin'), politicaController.aplicar);

module.exports = router;
