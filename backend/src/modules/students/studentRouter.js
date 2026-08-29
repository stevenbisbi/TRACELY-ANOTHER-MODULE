const express = require('express');
const studentController = require('./studentController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/me',             authenticate, studentController.getMe);
router.get('/',               authenticate, authorize('admin'), studentController.getAll);
router.put('/:id',            authenticate, authorize('admin'), studentController.update);
router.get('/:id/dashboard',  authenticate, studentController.getDashboard);
router.get('/:estudianteId/pensum', authenticate, studentController.getPensum);
router.get('/:id/report.pdf', authenticate, authorize('docente', 'admin'), studentController.getReportPdf);

module.exports = router;
