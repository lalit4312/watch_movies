const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Bollywood', 'Hollywood', 'Hindi', 'South', 'Anime', 'Other'],
    default: 'Other',
    index: true
  },
  year: {
    type: String,
    default: new Date().getFullYear().toString()
  },
  videoUrl: {
    type: String,
    default: ''
  },
  videoPublicId: {
    type: String,
    default: ''
  },
  posterUrl: {
    type: String,
    default: ''
  },
  posterPublicId: {
    type: String,
    default: ''
  },
  trailerUrl: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  totalRating: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  isLocal: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  fileSize: {
    type: Number,
    default: 0
  },
  quality: {
    type: String,
    enum: ['240p', '360p', '480p', '720p', '1080p', '4K'],
    default: '720p'
  },
  movieLanguage: [{
    type: String,
    default: ['Hindi']
  }],
  genre: [{
    type: String
  }],
  cast: [{
    type: String
  }],
  director: {
    type: String,
    default: ''
  },
  subtitles: [{
    lang: String,
    url: String
  }],
  source: {
    type: String,
    enum: ['upload', 'url', 'embed'],
    default: 'upload'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

movieSchema.index({ title: 'text', description: 'text' });
movieSchema.index({ views: -1 });
movieSchema.index({ rating: -1 });
movieSchema.index({ createdAt: -1 });

movieSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

movieSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Movie', movieSchema);
