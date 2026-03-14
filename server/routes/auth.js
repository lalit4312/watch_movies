const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, authController.login);
router.post('/register', authMiddleware, authController.register);
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/change-password', authMiddleware, authController.changePassword);
router.post('/change-credentials', authMiddleware, authController.changeCredentials);

module.exports = router;
