const express = require('express');
const inscripcionController = require('./inscripcionController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/estudiante/:estudianteId', authenticate, inscripcionController.getByEstudiante);
router.get('/asignatura/:asignaturaId', authenticate, authorize('docente', 'admin'), inscripcionController.getByAsignatura);
router.post('/',              authenticate, authorize('admin'), inscripcionController.create);
router.put('/:id/finalizar',  authenticate, authorize('docente', 'admin'), inscripcionController.finalizar);
router.delete('/:id',         authenticate, authorize('admin'), inscripcionController.remove);

module.exports = router;
