const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret);

    const admin = await Admin.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid token or admin not found' });
    }

    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const generateToken = (adminId) => {
  return jwt.sign({ adminId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

module.exports = {
  authMiddleware,
  generateToken
};
