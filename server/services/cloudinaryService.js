const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const config = require('../config');

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret
});

const uploadToCloudinary = async (file, folder, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `watchmovies/${folder}`,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    if (resourceType === 'video') {
      uploadOptions.eager = [
        { streaming_profile: 'hd', format: 'm3u8' }
      ];
      uploadOptions.eager_async = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          duration: result.duration,
          bytes: result.bytes
        });
      }
    );

    const stream = Readable.from(file.buffer);
    stream.pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType
  });
};

const getSignedUrl = (publicId, resourceType = 'video', options = {}) => {
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    ...options
  });
};

const getVideoStreamUrl = (publicId, quality = 'auto') => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    format: 'm3u8',
    streaming_profile: quality,
    secure: true
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getSignedUrl,
  getVideoStreamUrl
};
