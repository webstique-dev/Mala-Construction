const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createSiteAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  phone: z.string().trim().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (expect E.164 format, e.g. +919876543210)'),
  assignedSite: objectId,
});

const updateSiteAdminSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
});

const setStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

const reassignSiteSchema = z.object({
  siteId: objectId,
});

const listSiteAdminsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  role: z.enum(['super_admin', 'site_admin']).optional(),
  assignedSite: objectId.optional(),
  status: z.enum(['active', 'suspended', 'inactive']).optional(),
  verificationStatus: z.string().trim().max(50).optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
  lastLoginFrom: z.string().trim().optional(),
  lastLoginTo: z.string().trim().optional(),
  department: z.string().trim().max(100).optional(),
  employeeId: z.string().trim().max(50).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastLoginAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
});

const idParamSchema = z.object({ id: objectId });

module.exports = {
  createSiteAdminSchema,
  updateSiteAdminSchema,
  setStatusSchema,
  reassignSiteSchema,
  listSiteAdminsQuerySchema,
  idParamSchema,
};
