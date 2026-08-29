const express = require('express');
const corteController = require('./corteController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/asignatura/:asignaturaId', authenticate, corteController.getByAsignatura);
router.post('/',    authenticate, authorize('docente', 'admin'), corteController.create);
router.put('/:id',  authenticate, authorize('docente', 'admin'), corteController.update);

module.exports = router;
