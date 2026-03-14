const { Admin } = require('../models');
const { generateToken } = require('../middleware/auth');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    admin.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    await admin.save();

    const token = generateToken(admin._id);

    res.json({
      success: true,
      token,
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingAdmin = await Admin.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const admin = new Admin({
      username,
      email,
      password,
      role: 'admin'
    });

    await admin.save();

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      token,
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const getProfile = async (req, res) => {
  res.json({ admin: req.admin });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const admin = await Admin.findById(req.admin._id);

    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const changeCredentials = async (req, res) => {
  try {
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }

    if (!newUsername && !newPassword) {
      return res.status(400).json({ error: 'Enter new username or password' });
    }

    const admin = await Admin.findById(req.admin._id);

    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newUsername) {
      const existingAdmin = await Admin.findOne({ 
        username: newUsername.toLowerCase(),
        _id: { $ne: admin._id }
      });

      if (existingAdmin) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      admin.username = newUsername.toLowerCase();
    }

    if (newPassword) {
      admin.password = newPassword;
    }

    await admin.save();

    const token = generateToken(admin._id);

    res.json({ 
      success: true, 
      message: 'Credentials changed successfully',
      token,
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error('Change credentials error:', error);
    res.status(500).json({ error: 'Failed to change credentials' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  changePassword,
  changeCredentials
};
