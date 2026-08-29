const express = require('express');
const subjectController = require('./subjectController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/',                  authenticate, subjectController.getAll);
router.get('/teacher/:docenteId',authenticate, subjectController.getByTeacher);
router.get('/:id',               authenticate, subjectController.getOne);
router.post('/',                 authenticate, authorize('admin'), subjectController.create);
router.put('/:id',               authenticate, authorize('admin'), subjectController.update);
router.delete('/:id',            authenticate, authorize('admin'), subjectController.remove);
router.put('/:id/umbral',        authenticate, authorize('admin', 'docente'), subjectController.updateUmbral);
router.put('/:id/cortes',        authenticate, authorize('admin', 'docente'), subjectController.updateCortes);

module.exports = router;
