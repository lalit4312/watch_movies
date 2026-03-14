const { Analytics } = require('../models');

const trackEvent = async (data) => {
  try {
    const analytics = new Analytics({
      movieId: data.movieId,
      type: data.type,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      referrer: data.referrer,
      duration: data.duration,
      metadata: data.metadata || {}
    });

    await analytics.save();
    return analytics;
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return null;
  }
};

const getMovieAnalytics = async (movieId, startDate, endDate) => {
  const match = {
    movieId
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const views = await Analytics.aggregate([
    { $match: { ...match, type: 'view' } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);

  const ratings = await Analytics.aggregate([
    { $match: { ...match, type: 'rating' } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);

  return {
    views: views[0]?.count || 0,
    ratings: ratings[0]?.count || 0
  };
};

const getOverallAnalytics = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyStats = await Analytics.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  const topMovies = await Analytics.aggregate([
    { $match: { type: 'view', createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$movieId',
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: '$movie' },
    {
      $project: {
        _id: 0,
        movieId: '$_id',
        title: '$movie.title',
        views: 1
      }
    }
  ]);

  return {
    dailyStats,
    topMovies,
    totalViews: dailyStats.filter(d => d._id.type === 'view').reduce((sum, d) => sum + d.count, 0)
  };
};

module.exports = {
  trackEvent,
  getMovieAnalytics,
  getOverallAnalytics
};
