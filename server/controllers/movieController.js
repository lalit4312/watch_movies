const { Movie } = require('../models');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const analyticsService = require('../services/analyticsService');

const getMovies = async (req, res) => {
  try {
    const { 
      category, 
      page = 1, 
      limit = 20, 
      sort, 
      search,
      year,
      featured 
    } = req.query;

    const query = { isPublished: true };

    if (category && category !== 'all') {
      query.category = { $regex: category, $options: 'i' };
    }

    if (year) {
      query.year = year;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'views') {
      sortOption = { views: -1 };
    } else if (sort === 'rating') {
      sortOption = { rating: -1 };
    } else if (sort === 'title') {
      sortOption = { title: 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Movie.countDocuments(query)
    ]);

    res.json({
      movies,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
};

const getMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    movie.views += 1;
    await movie.save();

    await analyticsService.trackEvent({
      movieId: movie._id,
      type: 'view',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer')
    });

    res.json(movie);
  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
};

const getFeatured = async (req, res) => {
  try {
    const movies = await Movie.find({ isPublished: true, isFeatured: true })
      .limit(12)
      .sort({ views: -1 });

    res.json({ movies });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ error: 'Failed to fetch featured movies' });
  }
};

const searchMovies = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ movies: [] });
    }

    const movies = await Movie.find({
      $and: [
        { isPublished: true },
        {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { genre: { $in: [new RegExp(q, 'i')] } }
          ]
        }
      ]
    })
      .limit(20)
      .select('title posterUrl year views rating category');

    await analyticsService.trackEvent({
      type: 'search',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { query: q, results: movies.length }
    });

    res.json({ movies });
  } catch (error) {
    console.error('Search movies error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

const rateMovie = async (req, res) => {
  try {
    const { rating } = req.body;
    const ratingValue = parseFloat(rating);

    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    movie.totalRating = (movie.totalRating || 0) + ratingValue;
    movie.ratingCount = (movie.ratingCount || 0) + 1;
    movie.rating = parseFloat((movie.totalRating / movie.ratingCount).toFixed(1));

    await movie.save();

    await analyticsService.trackEvent({
      movieId: movie._id,
      type: 'rating',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { rating: ratingValue }
    });

    res.json({ 
      success: true, 
      rating: movie.rating, 
      ratingCount: movie.ratingCount 
    });
  } catch (error) {
    console.error('Rate movie error:', error);
    res.status(500).json({ error: 'Failed to rate movie' });
  }
};

const createMovie = async (req, res) => {
  try {
    const { title, description, category, year } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const movie = new Movie({
      title,
      description,
      category: category || 'Bollywood',
      year: year || new Date().getFullYear().toString(),
      uploadedBy: req.admin._id,
      isLocal: true,
      source: 'upload'
    });

    await movie.save();

    res.status(201).json({ success: true, movie });
  } catch (error) {
    console.error('Create movie error:', error);
    res.status(500).json({ error: 'Failed to create movie' });
  }
};

const uploadMovie = async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const { title, description, category, year, quality, movieLanguage, genre, director } = req.body;

    const languages = movieLanguage ? movieLanguage.split(',').map(l => l.trim()) : ['Hindi'];

    let videoData = {};
    let thumbnailData = {};

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      videoData = await uploadToCloudinary(videoFile, 'videos', 'video');
      if (thumbnailFile) {
        thumbnailData = await uploadToCloudinary(thumbnailFile, 'thumbnails', 'image');
      }
    } else {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
    }

    const movie = new Movie({
      title: title || 'Untitled',
      description: description || '',
      category: category || 'Bollywood',
      year: year || new Date().getFullYear().toString(),
      videoUrl: videoData.url,
      videoPublicId: videoData.publicId || '',
      posterUrl: thumbnailData.url || '',
      posterPublicId: thumbnailData.publicId || '',
      fileSize: videoData.bytes || 0,
      duration: videoData.duration || 0,
      quality: quality || '720p',
      movieLanguage: languages,
      genre: genre ? genre.split(',').map(g => g.trim()) : [],
      director: director || '',
      uploadedBy: req.admin._id,
      isLocal: true,
      source: 'upload'
    });

    await movie.save();

    res.status(201).json({ success: true, movie });
  } catch (error) {
    console.error('Upload movie error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload movie' });
  }
};

const updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'year', 'quality', 
      'movieLanguage', 'genre', 'director', 'isPublished', 'isFeatured'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'genre' && typeof req.body[field] === 'string') {
          movie[field] = req.body[field].split(',').map(g => g.trim());
        } else {
          movie[field] = req.body[field];
        }
      }
    });

    await movie.save();

    res.json({ success: true, movie });
  } catch (error) {
    console.error('Update movie error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
};

const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const isCloudConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

    if (isCloudConfigured) {
      if (movie.videoPublicId) {
        await deleteFromCloudinary(movie.videoPublicId, 'video');
      }

      if (movie.posterPublicId) {
        await deleteFromCloudinary(movie.posterPublicId, 'image');
      }
    }

    await Movie.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Movie deleted' });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
};

const getAdminMovies = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'username email')
        .select('-__v'),
      Movie.countDocuments(query)
    ]);

    res.json({
      movies,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get admin movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
};

module.exports = {
  getMovies,
  getMovie,
  getFeatured,
  searchMovies,
  rateMovie,
  createMovie,
  uploadMovie,
  updateMovie,
  deleteMovie,
  getAdminMovies
};
