const sanitizeHtml = require('sanitize-html');

/**
 * Strips HTML/script content from string fields in body/params/query.
 * Runs in addition to express-mongo-sanitize (which strips $ and . keys
 * to prevent NoSQL operator injection). This one guards against stored XSS.
 */
function stripHtml(value) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

function deepSanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return stripHtml(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      obj[key] = deepSanitize(obj[key]);
    }
    return obj;
  }
  return obj;
}

function xssSanitize(req, res, next) {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.params) req.params = deepSanitize(req.params);
  // req.query is a getter-only property on some Express/Node versions; mutate in place instead of reassigning.
  if (req.query) deepSanitize(req.query);
  next();
}

module.exports = xssSanitize;
