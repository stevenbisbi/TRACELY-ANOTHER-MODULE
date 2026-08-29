const express = require('express');
const multer  = require('multer');
const calificacionController = require('./calificacionController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/estudiante/:estudianteId', authenticate, calificacionController.getByEstudiante);
router.get('/asignatura/:asignaturaId', authenticate, authorize('docente', 'admin'), calificacionController.getByAsignatura);
router.post('/',       authenticate, authorize('docente', 'admin'), calificacionController.upsert);
router.post('/bulk',   authenticate, authorize('docente', 'admin'), calificacionController.bulkUpsert);
router.post('/import', authenticate, authorize('docente', 'admin'), upload.single('archivo'), calificacionController.importExcel);

module.exports = router;
