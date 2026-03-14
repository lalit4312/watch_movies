const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    index: true
  },
  type: {
    type: String,
    enum: ['view', 'rating', 'search', 'download', 'share'],
    required: true
  },
  userId: {
    type: String,
    default: null
  },
  ip: String,
  userAgent: String,
  referrer: String,
  duration: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ movieId: 1, createdAt: -1 });
analyticsSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
