const express = require('express');
const pensumController = require('./pensumController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/carrera/:carreraId', authenticate, pensumController.getByCarrera);
router.post('/',   authenticate, authorize('admin'), pensumController.create);
router.put('/:id', authenticate, authorize('admin'), pensumController.update);

module.exports = router;
