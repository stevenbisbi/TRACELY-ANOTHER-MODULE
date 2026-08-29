const express = require('express');
const semesterController = require('./semesterController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/',           semesterController.getAll);   // público — el front lo necesita sin auth
router.get('/active',     semesterController.getActive);
router.post('/',          authenticate, authorize('admin'), semesterController.create);
router.put('/:id/activate', authenticate, authorize('admin'), semesterController.activate);

module.exports = router;
