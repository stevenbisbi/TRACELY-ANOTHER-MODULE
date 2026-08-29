const express = require('express');
const actividadController = require('./actividadController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/corte/:corteId', authenticate, actividadController.getByCorte);
router.post('/',    authenticate, authorize('docente', 'admin'), actividadController.create);
router.put('/:id',  authenticate, authorize('docente', 'admin'), actividadController.update);
router.delete('/:id', authenticate, authorize('docente', 'admin'), actividadController.delete);

module.exports = router;
