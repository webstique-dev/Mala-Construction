const { z } = require('zod');

const createSiteSchema = z.object({
  name: z.string().trim().min(2, 'Site name is required').max(150),
  code: z.string().trim().min(2, 'Site code is required').max(20).toUpperCase(),
  address: z.string().trim().max(500).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  startDate: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  contactNumber: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().trim().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (expect E.164 format, e.g. +919876543210)').optional()
  ),
  description: z.string().trim().max(2000).optional(),
});

const updateSiteSchema = createSiteSchema.partial().extend({
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

const listSitesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  siteName: z.string().trim().max(150).optional(),
  siteCode: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  lastUpdatedFrom: z.string().trim().optional(),
  lastUpdatedTo: z.string().trim().optional(),
  createdBy: z.string().trim().max(100).optional(),
  sortBy: z.enum(['name', 'code', 'createdAt', 'startDate', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
});

const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id'),
});

module.exports = { createSiteSchema, updateSiteSchema, listSitesQuerySchema, idParamSchema };
