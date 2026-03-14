const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, analyticsController.getDashboardStats);
router.get('/analytics', authMiddleware, analyticsController.getAnalytics);

module.exports = router;
