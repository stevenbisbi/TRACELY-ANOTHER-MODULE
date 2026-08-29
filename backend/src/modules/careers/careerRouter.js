const express = require('express');
const careerController = require('./careerController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/',    careerController.getAll);
router.get('/:id', careerController.getOne);
router.post('/',   authenticate, authorize('admin'), careerController.create);
router.put('/:id',    authenticate, authorize('admin'), careerController.update);
router.delete('/:id', authenticate, authorize('admin'), careerController.remove);

module.exports = router;
