const { z } = require('zod');

const createLookupSchema = z.object({
  name: z.string({
    required_error: 'Name is required.',
  })
    .trim()
    .min(1, 'Name cannot be empty.')
    .max(100, 'Name must be at most 100 characters long.'),
});

module.exports = {
  createLookupSchema,
};
