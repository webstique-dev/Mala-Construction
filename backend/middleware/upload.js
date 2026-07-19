const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB - photos
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB - invoice/receipt uploads (may be scanned PDFs)

function buildFilter(allowedTypes) {
  return (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  };
}

// Memory storage only - the buffer is streamed straight to Cloudinary, never written to disk.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: buildFilter(ALLOWED_IMAGE_TYPES),
});

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: buildFilter(ALLOWED_DOCUMENT_TYPES),
});

module.exports = { imageUpload, documentUpload };
