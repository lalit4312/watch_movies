const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { authMiddleware } = require('../middleware/auth');
const { upload, imageUpload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');

router.get('/movies', movieController.getMovies);
router.get('/movies/search', movieController.searchMovies);
router.get('/featured', movieController.getFeatured);
router.get('/movie/:id', movieController.getMovie);
router.post('/movie/:id/rate', movieController.rateMovie);

router.get('/admin/movies', authMiddleware, movieController.getAdminMovies);
router.post('/admin/movie', authMiddleware, movieController.createMovie);
router.post('/admin/upload', authMiddleware, uploadLimiter, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), handleMulterError, movieController.uploadMovie);
router.put('/admin/movie/:id', authMiddleware, movieController.updateMovie);
router.delete('/admin/movie/:id', authMiddleware, movieController.deleteMovie);

module.exports = router;
