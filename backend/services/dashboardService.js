const mongoose = require('mongoose');
const Site = require('../models/Site');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const WorkerPayment = require('../models/WorkerPayment');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory = require('../models/ExpenseCategory');
const { resolveSiteScope } = require('../utils/siteScope');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getDateRangeFilter(period, startDate, endDate, dateField = 'date') {
  const match = {};

  if (period === 'custom' || startDate || endDate) {
    const range = {};
    if (startDate) {
      range.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    if (Object.keys(range).length > 0) {
      match[dateField] = range;
    }
    return match;
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'today') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    match[dateField] = { $gte: start, $lte: end };
  } else if (period === 'yesterday') {
    const yesterdayStart = new Date(start);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);
    match[dateField] = { $gte: yesterdayStart, $lte: yesterdayEnd };
  } else if (period === 'week') {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - 7);
    match[dateField] = { $gte: weekStart, $lte: now };
  } else if (period === 'year') {
    const yearStart = new Date(start);
    yearStart.setMonth(0, 1);
    match[dateField] = { $gte: yearStart, $lte: now };
  } else if (period === 'month') {
    const monthStart = new Date(start);
    monthStart.setDate(1);
    match[dateField] = { $gte: monthStart, $lte: now };
  }

  return match;
}

async function sumField(Model, match, field) {
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result[0]?.total ?? 0;
}

async function resolveCategoryFilter(category, type) {
  if (!category) return null;

  if (isValidObjectId(category)) {
    return new mongoose.Types.ObjectId(category);
  }

  const CategoryModel = type === 'expense' ? ExpenseCategory : MaterialCategory;
  const categories = await CategoryModel.find({ name: new RegExp(category, 'i') }).select('_id');

  if (!categories.length) {
    return null;
  }

  return { $in: categories.map((item) => item._id) };
}

async function buildMaterialMatch({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter }) {
  const match = { ...isDeletedFilter };

  if (resolvedSiteId) {
    match.site = new mongoose.Types.ObjectId(resolvedSiteId);
  }

  const dateRange = getDateRangeFilter(period, startDate, endDate, 'date');
  if (dateRange.date) {
    match.date = dateRange.date;
  }

  if (category) {
    const categoryFilter = await resolveCategoryFilter(category, 'material');
    if (categoryFilter) {
      match.category = categoryFilter;
    }
  }

  if (search) {
    match.$or = [
      { materialName: new RegExp(search, 'i') },
      { supplierName: new RegExp(search, 'i') },
      { invoiceNumber: new RegExp(search, 'i') },
    ];
  }

  return match;
}

async function buildExpenseMatch({ resolvedSiteId, period, startDate, endDate, category, status, search, isDeletedFilter }) {
  const match = { ...isDeletedFilter };

  if (resolvedSiteId) {
    match.site = new mongoose.Types.ObjectId(resolvedSiteId);
  }

  const dateRange = getDateRangeFilter(period, startDate, endDate, 'date');
  if (dateRange.date) {
    match.date = dateRange.date;
  }

  if (category) {
    const categoryFilter = await resolveCategoryFilter(category, 'expense');
    if (categoryFilter) {
      match.category = categoryFilter;
    }
  }

  if (status) {
    match.status = status;
  }

  if (search) {
    match.$or = [
      { description: new RegExp(search, 'i') },
      { voucherNumber: new RegExp(search, 'i') },
    ];
  }

  return match;
}

async function buildPaymentMatch({ resolvedSiteId, period, startDate, endDate, category, status, search, isDeletedFilter }) {
  const match = { ...isDeletedFilter };

  if (resolvedSiteId) {
    match.site = new mongoose.Types.ObjectId(resolvedSiteId);
  }

  const dateRange = getDateRangeFilter(period, startDate, endDate, 'paidOn');
  if (dateRange.paidOn) {
    match.paidOn = dateRange.paidOn;
  }

  if (status) {
    match.status = status;
  }

  if (category || search) {
    const workerQuery = { ...isDeletedFilter };

    if (resolvedSiteId) {
      workerQuery.site = new mongoose.Types.ObjectId(resolvedSiteId);
    }

    if (category && !isValidObjectId(category)) {
      workerQuery.profession = new RegExp(category, 'i');
    }

    if (search) {
      workerQuery.name = new RegExp(search, 'i');
    }

    const workersList = await Worker.find(workerQuery).select('_id');
    match.worker = { $in: workersList.map((worker) => worker._id) };
  }

  if (search) {
    match.$or = [
      { voucherNumber: new RegExp(search, 'i') },
      { remarks: new RegExp(search, 'i') },
    ];
  }

  return match;
}

async function buildWorkerMatch({ resolvedSiteId, category, search, isDeletedFilter }) {
  const match = { status: 'active', ...isDeletedFilter };

  if (resolvedSiteId) {
    match.site = new mongoose.Types.ObjectId(resolvedSiteId);
  }

  if (category && !isValidObjectId(category)) {
    match.profession = new RegExp(category, 'i');
  }

  if (search) {
    match.name = new RegExp(search, 'i');
  }

  return match;
}

async function getDashboard(queryParams, actor) {
  const { period = 'month', siteId, startDate, endDate, category, status, search, showDeleted } = queryParams || {};
  const isDeletedFilter = (showDeleted === 'true' || showDeleted === true) ? {} : { isDeleted: false };

  const userRole = actor?.role || 'site_admin';
  let resolvedSiteId = null;

  if (userRole === 'super_admin') {
    resolvedSiteId = siteId || null;
  } else {
    const scope = resolveSiteScope(actor, siteId);
    resolvedSiteId = scope.site || actor?.assignedSite;
  }

  const [materialMatch, expenseMatch, paymentMatch, workerMatch] = await Promise.all([
    buildMaterialMatch({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter }),
    buildExpenseMatch({ resolvedSiteId, period, startDate, endDate, category, status, search, isDeletedFilter }),
    buildPaymentMatch({ resolvedSiteId, period, startDate, endDate, category, status, search, isDeletedFilter }),
    buildWorkerMatch({ resolvedSiteId, category, search, isDeletedFilter }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalSites,
    activeSites,
    siteAdmins,
    totalWorkers,
    totalMaterialCost,
    totalWorkerPayments,
    totalOtherExpenses,
    monthlyMaterial,
    monthlyPayments,
    monthlyExpenses,
    todayPurchases,
    monthlyPurchases,
    pendingPayments,
    recentActivities,
    recentPurchases,
    recentPayments,
    topSpendingSites,
    monthlyTrend,
    expenseBreakdown,
  ] = await Promise.all([
    Site.countDocuments(isDeletedFilter),
    Site.countDocuments({ status: 'active', ...isDeletedFilter }),
    User.countDocuments({ role: 'site_admin', status: 'active', ...isDeletedFilter }),
    Worker.countDocuments(workerMatch),
    sumField(Material, materialMatch, 'totalAmount'),
    sumField(WorkerPayment, { ...paymentMatch, status: 'paid' }, 'netSalary'),
    sumField(Expense, expenseMatch, 'amount'),
    sumField(Material, { ...materialMatch, date: { $gte: monthStart } }, 'totalAmount'),
    sumField(WorkerPayment, { ...paymentMatch, status: 'paid', paidOn: { $gte: monthStart } }, 'netSalary'),
    sumField(Expense, { ...expenseMatch, date: { $gte: monthStart } }, 'amount'),
    sumField(Material, { ...materialMatch, date: { $gte: todayStart } }, 'totalAmount'),
    sumField(Material, { ...materialMatch, date: { $gte: monthStart } }, 'totalAmount'),
    WorkerPayment.countDocuments({ ...paymentMatch, status: 'pending' }),
    ActivityLog.find(
      resolvedSiteId ? { site: resolvedSiteId } : {},
    )
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('actor', 'name')
      .populate('site', 'name'),
    Material.find(materialMatch).sort({ date: -1 }).limit(5).populate('site', 'name').populate('supplier', 'name'),
    WorkerPayment.find({ ...paymentMatch, status: 'paid' }).sort({ paidOn: -1 }).limit(5).populate('worker', 'name').populate('site', 'name'),
    Material.aggregate([
      { $match: materialMatch },
      { $group: { _id: '$site', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'sites', localField: '_id', foreignField: '_id', as: 'site' } },
      { $unwind: '$site' },
      { $project: { siteName: '$site.name', total: 1 } },
    ]),
    buildMonthlyTrend({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter, materialMatch, paymentMatch, expenseMatch }),
    buildExpenseBreakdown({ materialMatch, paymentMatch, expenseMatch }),
  ]);

  const totalExpensesSum = totalMaterialCost + totalWorkerPayments + totalOtherExpenses;
  const monthlyExpensesSum = monthlyMaterial + monthlyPayments + monthlyExpenses;

  if (userRole === 'super_admin') {
    return {
      cards: {
        totalSites,
        activeSites,
        siteAdmins,
        totalWorkers,
        totalMaterialCost,
        totalWorkerPayments,
        totalOtherExpenses,
        totalExpenses: totalExpensesSum,
        monthlyExpenses: monthlyExpensesSum,
      },
      charts: {
        monthlyTrend,
        expenseBreakdown,
        sitePerformance: topSpendingSites.map((site) => ({ name: site.siteName, value: site.total })),
      },
      recent: {
        activities: recentActivities,
        purchases: recentPurchases,
        payments: recentPayments,
        topSpendingSites,
      },
    };
  }

  return {
    cards: {
      todayPurchases,
      monthlyPurchases,
      totalWorkers,
      workerPayments: totalWorkerPayments,
      otherExpenses: totalOtherExpenses,
      pendingPayments,
      totalExpenses: totalWorkerPayments + totalOtherExpenses + monthlyPurchases,
    },
    charts: {
      monthlyTrend,
      expenseBreakdown,
    },
    recent: {
      activities: recentActivities,
    },
  };
}

async function buildMonthlyTrend({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter, materialMatch, paymentMatch, expenseMatch }) {
  const trendDateMatch = getDateRangeFilter(period, startDate, endDate, 'date');
  const dateField = period === 'today' || period === 'yesterday' || period === 'week' ? '%Y-%m-%d' : '%Y-%m';

  const materialTrendMatch = { ...materialMatch };
  const expenseTrendMatch = { ...expenseMatch };
  const paymentTrendMatch = { ...paymentMatch, status: 'paid' };

  if (trendDateMatch.date) {
    materialTrendMatch.date = trendDateMatch.date;
    expenseTrendMatch.date = trendDateMatch.date;
  }

  if (trendDateMatch.paidOn) {
    paymentTrendMatch.paidOn = trendDateMatch.paidOn;
  }

  const [materials, payments, expenses] = await Promise.all([
    Material.aggregate([
      { $match: materialTrendMatch },
      { $group: { _id: { $dateToString: { format: dateField, date: '$date' } }, materials: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    WorkerPayment.aggregate([
      { $match: paymentTrendMatch },
      { $group: { _id: { $dateToString: { format: dateField, date: '$paidOn' } }, payments: { $sum: '$netSalary' } } },
      { $sort: { _id: 1 } },
    ]),
    Expense.aggregate([
      { $match: expenseTrendMatch },
      { $group: { _id: { $dateToString: { format: dateField, date: '$date' } }, expenses: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const months = new Set([
    ...materials.map((item) => item._id),
    ...payments.map((item) => item._id),
    ...expenses.map((item) => item._id),
  ]);

  return [...months].sort().map((month) => ({
    month,
    materials: materials.find((item) => item._id === month)?.materials ?? 0,
    payments: payments.find((item) => item._id === month)?.payments ?? 0,
    expenses: expenses.find((item) => item._id === month)?.expenses ?? 0,
  }));
}

async function buildExpenseBreakdown({ materialMatch, paymentMatch, expenseMatch }) {
  const [materials, payments, expenses] = await Promise.all([
    Material.aggregate([{ $match: materialMatch }, { $group: { _id: 'Materials', total: { $sum: '$totalAmount' } } }]),
    WorkerPayment.aggregate([{ $match: { ...paymentMatch, status: 'paid' } }, { $group: { _id: 'Worker Payments', total: { $sum: '$netSalary' } } }]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $lookup: { from: 'expensecategories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.name', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const breakdown = [];
  if (materials[0]) breakdown.push({ name: materials[0]._id, value: materials[0].total });
  if (payments[0]) breakdown.push({ name: payments[0]._id, value: payments[0].total });
  expenses.forEach((item) => {
    if (item._id) {
      breakdown.push({ name: item._id, value: item.total });
    }
  });

  return breakdown;
}

async function getSuperAdminDashboard(queryParams, actor) {
  return getDashboard(queryParams, actor);
}

async function getSiteAdminDashboard(queryParams, actor) {
  return getDashboard(queryParams, actor);
}

module.exports = { getDashboard, getSuperAdminDashboard, getSiteAdminDashboard };
