const analyticsService = require('../services/analyticsService');
const { Movie } = require('../models');

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalMovies,
      totalViews,
      totalRatings,
      featuredCount,
      recentMovies
    ] = await Promise.all([
      Movie.countDocuments(),
      Movie.aggregate([
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      Movie.aggregate([
        { $group: { _id: null, total: { $sum: '$ratingCount' } } }
      ]),
      Movie.countDocuments({ isFeatured: true }),
      Movie.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title views rating createdAt')
    ]);

    const topRated = await Movie.find({ ratingCount: { $gt: 0 } })
      .sort({ rating: -1 })
      .limit(5)
      .select('title rating ratingCount views');

    const topViewed = await Movie.find()
      .sort({ views: -1 })
      .limit(5)
      .select('title views');

    res.json({
      stats: {
        totalMovies,
        totalViews: totalViews[0]?.total || 0,
        totalRatings: totalRatings[0]?.total || 0,
        featuredCount
      },
      recentMovies,
      topRated,
      topViewed
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { days = 30, movieId } = req.query;

    let analytics;
    if (movieId) {
      analytics = await analyticsService.getMovieAnalytics(movieId);
    } else {
      analytics = await getOverallAnalytics(parseInt(days));
    }

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

const getOverallAnalytics = async (days) => {
  return analyticsService.getOverallAnalytics(days);
};

module.exports = {
  getDashboardStats,
  getAnalytics,
  getOverallAnalytics
};
