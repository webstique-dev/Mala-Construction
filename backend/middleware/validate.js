const ApiError = require('../utils/ApiError');

/**
 * Usage: validate({ body: loginSchema }) or validate({ body: schema, params: idSchema }).
 * On success, replaces req[key] with the parsed (and coerced/defaulted) value.
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const key of Object.keys(schemas)) {
        const result = schemas[key].safeParse(req[key]);
        if (!result.success) {
          const details = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }));
          throw ApiError.badRequest('Validation failed', details);
        }
        req[key] = result.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
