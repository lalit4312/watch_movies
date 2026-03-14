const authRoutes = require('./auth');
const movieRoutes = require('./movie');
const analyticsRoutes = require('./analytics');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api', movieRoutes);
  app.use('/api/admin', analyticsRoutes);
};
