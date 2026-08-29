const express = require('express');
const adminController = require('./adminController');
const { authenticate, authorize } = require('../../middlewares/auth');

const router = express.Router();

router.get('/overview',        authenticate, authorize('admin'), adminController.getOverview);
router.get('/recent-activity', authenticate, authorize('admin'), adminController.getRecentActivity);
router.get('/program-stats',   authenticate, authorize('admin'), adminController.getProgramStats);

module.exports = router;
