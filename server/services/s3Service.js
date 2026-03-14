const AWS = require('aws-sdk');
const config = require('../config');

const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

const uploadToS3 = async (file, key) => {
  const params = {
    Bucket: config.aws.bucket,
    Key: `watchmovies/${key}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  return s3.upload(params).promise();
};

const deleteFromS3 = async (key) => {
  const params = {
    Bucket: config.aws.bucket,
    Key: `watchmovies/${key}`
  };

  return s3.deleteObject(params).promise();
};

const getSignedUrlS3 = (key, expiresIn = 3600) => {
  const params = {
    Bucket: config.aws.bucket,
    Key: `watchmovies/${key}`,
    Expires: expiresIn
  };

  return s3.getSignedUrlPromise('getObject', params);
};

const getVideoStreamUrlS3 = (key) => {
  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/watchmovies/${key}`;
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  getSignedUrlS3,
  getVideoStreamUrlS3
};
