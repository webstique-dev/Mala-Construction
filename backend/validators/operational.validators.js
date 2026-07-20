const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const paginationQuery = {
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(200).optional(),
  siteId: objectId.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
};

const idParamSchema = z.object({ id: objectId });

const createMaterialSchema = z.object({
  site: objectId,
  invoiceNumber: z.string().trim().min(1).max(100),
  supplierName: z.string().trim().min(1).max(150),
  materialName: z.string().trim().min(1).max(200),
  category: objectId,
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(50),
  rate: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).max(100).optional().default(0),
  transportCharge: z.coerce.number().min(0).optional().default(0),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  date: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
});

const updateMaterialSchema = createMaterialSchema.partial().omit({ site: true });

const listMaterialsQuerySchema = z.object({
  ...paginationQuery,
  category: objectId.optional(),
  supplier: objectId.optional(),
  sortBy: z.enum(['date', 'totalAmount', 'materialName', 'createdAt']).optional().default('date'),
});

const createWorkerSchema = z.object({
  site: objectId,
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (expect E.164 format, e.g. +919876543210)'),
  profession: objectId,
  dailyWage: z.coerce.number().min(0),
  joiningDate: z.coerce.date(),
  address: z.string().trim().max(500).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().trim().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (expect E.164 format, e.g. +919876543210)').optional()
  ),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

const updateWorkerSchema = createWorkerSchema.partial().omit({ site: true });

const listWorkersQuerySchema = z.object({
  ...paginationQuery,
  profession: objectId.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'dailyWage', 'joiningDate', 'createdAt']).optional().default('name'),
});

const createPaymentSchema = z.object({
  site: objectId,
  worker: objectId,
  workingDays: z.coerce.number().min(0),
  dailyWage: z.coerce.number().min(0),
  overtimeAmount: z.coerce.number().min(0).optional().default(0),
  bonus: z.coerce.number().min(0).optional().default(0),
  advance: z.coerce.number().min(0).optional().default(0),
  deduction: z.coerce.number().min(0).optional().default(0),
  paymentMethod: z.enum(['cash', 'bankTransfer', 'upi', 'cheque']).optional().default('cash'),
  paidOn: z.coerce.date(),
  status: z.enum(['pending', 'paid']).optional().default('paid'),
  remarks: z.string().trim().max(1000).optional(),
});

const updatePaymentSchema = createPaymentSchema.partial().omit({ site: true, worker: true });

const listPaymentsQuerySchema = z.object({
  ...paginationQuery,
  worker: objectId.optional(),
  status: z.enum(['pending', 'paid']).optional(),
  sortBy: z.enum(['paidOn', 'netSalary', 'createdAt']).optional().default('paidOn'),
});

const createExpenseSchema = z.object({
  site: objectId,
  title: z.string().trim().min(1).max(200),
  category: objectId,
  amount: z.coerce.number().positive(),
  vendor: z.string().trim().max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  date: z.coerce.date(),
  paymentMethod: z.enum(['cash', 'bankTransfer', 'upi', 'cheque', 'card']),
});

const updateExpenseSchema = createExpenseSchema.partial().omit({ site: true });

const listExpensesQuerySchema = z.object({
  ...paginationQuery,
  category: objectId.optional(),
  sortBy: z.enum(['date', 'amount', 'title', 'createdAt']).optional().default('date'),
});

const listActivityLogsQuerySchema = z.object({
  page: paginationQuery.page,
  limit: paginationQuery.limit,
  siteId: objectId.optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  startDate: paginationQuery.startDate,
  endDate: paginationQuery.endDate,
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  siteId: objectId.optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
});

const emptyToUndefined = (val) => (val === '' || val === null ? undefined : val);
const optionalObjectId = z.preprocess(emptyToUndefined, objectId.optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

const reportQuerySchema = z.object({
  type: z.enum([
    'daily', 'weekly', 'monthly', 'yearly', 'site', 'material',
    'worker', 'payment', 'expense', 'category', 'vendor', 'custom',
  ]),
  format: z.enum(['pdf', 'excel', 'csv', 'json']).optional().default('pdf'),
  siteId: optionalObjectId,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  category: optionalObjectId,
  status: optionalString,
  paymentMethod: optionalString,
  vendor: optionalString,
  workerId: optionalObjectId,
  professionId: optionalObjectId,
  search: optionalString,
  sortBy: optionalString,
  sortOrder: z.enum(['asc', 'desc']).optional(),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
});

const dashboardQuerySchema = z.object({
  siteId: objectId.optional(),
  period: z.string().optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  showDeleted: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
});

module.exports = {
  idParamSchema,
  createMaterialSchema,
  updateMaterialSchema,
  listMaterialsQuerySchema,
  createWorkerSchema,
  updateWorkerSchema,
  listWorkersQuerySchema,
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  listActivityLogsQuerySchema,
  searchQuerySchema,
  reportQuerySchema,
  dashboardQuerySchema,
};
