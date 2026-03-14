const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const config = require('../config');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    const allowedTypes = /mp4|mkv|avi|webm|mov/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');
    
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (MP4, MKV, AVI, WebM, MOV)'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype) || file.mimetype.startsWith('image/');
    
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.videoMaxSize,
    files: 2
  }
});

const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.imageMaxSize,
    files: 1
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is ${config.upload.videoMaxSize / (1024 * 1024)}MB` });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = {
  upload,
  imageUpload,
  handleMulterError
};
