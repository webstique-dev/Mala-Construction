const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

function parseCloudinaryUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:') return null;

    return {
      cloud_name: url.hostname || url.host || '',
      api_key: url.username || '',
      api_secret: url.password || '',
    };
  } catch (error) {
    logger.warn(`Invalid CLOUDINARY_URL format: ${error.message}`);
    return null;
  }
}

const cloudinaryUrlConfig = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

cloudinary.config({
  cloud_name: cloudinaryUrlConfig?.cloud_name || process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: cloudinaryUrlConfig?.api_key || process.env.CLOUDINARY_API_KEY || '',
  api_secret: cloudinaryUrlConfig?.api_secret || process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

module.exports = cloudinary;
