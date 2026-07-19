const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function assertCloudinaryReady() {
  const cfg = cloudinary.config();
  const missing = [];

  if (!cfg.cloud_name) missing.push('CLOUDINARY_CLOUD_NAME or CLOUDINARY_URL');
  if (!cfg.api_key) missing.push('CLOUDINARY_API_KEY or CLOUDINARY_URL');
  if (!cfg.api_secret) missing.push('CLOUDINARY_API_SECRET or CLOUDINARY_URL');

  if (missing.length) {
    throw ApiError.internal(`Cloudinary configuration error. Missing: ${missing.join(', ')}`);
  }
}

/**
 * Streams a buffer to Cloudinary and returns the secure URL and public ID.
 */
function uploadBuffer(buffer, folder, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    try {
      assertCloudinaryReady();
    } catch (error) {
      return reject(error);
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        ...(resourceType === 'image' ? { transformation: [{ quality: 'auto', fetch_format: 'auto' }] } : {}),
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload failed: ${error.message}`);
          return reject(ApiError.internal(`Cloudinary upload failed: ${error.message}`));
        }

        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${err.message}`);
  }
}

module.exports = { uploadBuffer, deleteAsset };
