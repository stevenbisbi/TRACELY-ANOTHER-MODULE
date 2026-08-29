const express = require('express');
const attendanceController = require('./attendanceController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/estudiante/:estudianteId', authenticate, attendanceController.getByEstudiante);
router.get('/asignatura/:asignaturaId', authenticate, authorize('docente', 'admin'), attendanceController.getByAsignatura);
router.post('/bulk', authenticate, authorize('docente', 'admin'), attendanceController.saveDayAttendance);

module.exports = router;
