const test = require('node:test');
const assert = require('node:assert/strict');
const cloudinary = require('cloudinary').v2;

const configPath = require.resolve('../config/cloudinary');

test('cloudinary config uses CLOUDINARY_URL when provided', () => {
  delete require.cache[configPath];
  process.env.CLOUDINARY_URL = 'cloudinary://test-key:test-secret@test-cloud';
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';

  require('../config/cloudinary');

  const cfg = cloudinary.config();
  assert.equal(cfg.cloud_name, 'test-cloud');
  assert.equal(cfg.api_key, 'test-key');
  assert.equal(cfg.api_secret, 'test-secret');
});
