const mongoose = require('mongoose');
const Site = require('../models/Site');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Attendance = require('../models/Attendance');
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

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const attendanceSiteMatch = resolvedSiteId ? { site: new mongoose.Types.ObjectId(resolvedSiteId), ...isDeletedFilter } : { ...isDeletedFilter };

  const [
    totalSites,
    activeSites,
    siteAdmins,
    totalWorkers,
    totalMaterialCost,
    totalLabourExpense,
    totalOtherExpenses,
    monthlyMaterial,
    monthlyLabourExpense,
    monthlyExpenses,
    todayPurchases,
    monthlyPurchases,
    recentActivities,
    recentPurchases,
    topSpendingSites,
    monthlyTrend,
    expenseBreakdown,
    todayWorkersPresent,
    todayLabourExpense,
    weeklyLabourExpense,
    recentAttendance,
    recentExpenses,
  ] = await Promise.all([
    Site.countDocuments(isDeletedFilter),
    Site.countDocuments({ status: 'active', ...isDeletedFilter }),
    User.countDocuments({ role: 'site_admin', status: 'active', ...isDeletedFilter }),
    Attendance.countDocuments(attendanceSiteMatch),
    sumField(Material, materialMatch, 'totalAmount'),
    sumField(Attendance, attendanceSiteMatch, 'totalAmount'),
    sumField(Expense, expenseMatch, 'amount'),
    sumField(Material, { ...materialMatch, date: { $gte: monthStart } }, 'totalAmount'),
    sumField(Attendance, { ...attendanceSiteMatch, date: { $gte: monthStart, $lte: todayEnd } }, 'totalAmount'),
    sumField(Expense, { ...expenseMatch, date: { $gte: monthStart } }, 'amount'),
    sumField(Material, { ...materialMatch, date: { $gte: todayStart } }, 'totalAmount'),
    sumField(Material, { ...materialMatch, date: { $gte: monthStart } }, 'totalAmount'),
    ActivityLog.find(
      resolvedSiteId ? { site: resolvedSiteId } : {},
    )
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('actor', 'name')
      .populate('site', 'name'),
    Material.find(materialMatch).sort({ date: -1 }).limit(5).populate('site', 'name').populate('supplier', 'name'),
    Material.aggregate([
      { $match: materialMatch },
      { $group: { _id: '$site', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'sites', localField: '_id', foreignField: '_id', as: 'site' } },
      { $unwind: '$site' },
      { $project: { siteName: '$site.name', total: 1 } },
    ]),
    buildMonthlyTrend({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter, materialMatch, attendanceSiteMatch, expenseMatch }),
    buildExpenseBreakdown({ materialMatch, attendanceSiteMatch, expenseMatch }),
    Attendance.countDocuments({ ...attendanceSiteMatch, date: { $gte: todayStart, $lte: todayEnd }, status: { $in: ['present', 'halfDay'] } }),
    sumField(Attendance, { ...attendanceSiteMatch, date: { $gte: todayStart, $lte: todayEnd } }, 'totalAmount'),
    sumField(Attendance, { ...attendanceSiteMatch, date: { $gte: weekStart, $lte: todayEnd } }, 'totalAmount'),
    Attendance.find(attendanceSiteMatch).sort({ date: -1, createdAt: -1 }).limit(5).populate('site', 'name').populate('profession', 'name'),
    Expense.find(expenseMatch).sort({ date: -1 }).limit(5).populate('site', 'name').populate('category', 'name'),
  ]);

  const totalExpensesSum = totalMaterialCost + totalLabourExpense + totalOtherExpenses;
  const monthlyExpensesSum = monthlyMaterial + monthlyLabourExpense + monthlyExpenses;

  if (userRole === 'super_admin') {
    return {
      cards: {
        totalSites,
        activeSites,
        siteAdmins,
        totalWorkers,
        todayWorkersPresent,
        todayLabourExpense,
        weeklyLabourExpense,
        monthlyLabourExpense,
        totalMaterialCost,
        totalWorkerPayments: totalLabourExpense,
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
        attendance: recentAttendance,
        expenses: recentExpenses,
        topSpendingSites,
      },
    };
  }

  return {
    cards: {
      todayPurchases,
      monthlyPurchases,
      totalWorkers,
      todayWorkersPresent,
      todayLabourExpense,
      weeklyLabourExpense,
      monthlyLabourExpense,
      workerPayments: totalLabourExpense,
      otherExpenses: totalOtherExpenses,
      pendingPayments: 0,
      totalExpenses: totalLabourExpense + totalOtherExpenses + monthlyPurchases,
    },
    charts: {
      monthlyTrend,
      expenseBreakdown,
    },
    recent: {
      activities: recentActivities,
      attendance: recentAttendance,
      expenses: recentExpenses,
    },
  };
}

async function buildMonthlyTrend({ resolvedSiteId, period, startDate, endDate, category, search, isDeletedFilter, materialMatch, attendanceSiteMatch, expenseMatch }) {
  const trendDateMatch = getDateRangeFilter(period, startDate, endDate, 'date');
  const dateField = period === 'today' || period === 'yesterday' || period === 'week' ? '%Y-%m-%d' : '%Y-%m';

  const materialTrendMatch = { ...materialMatch };
  const expenseTrendMatch = { ...expenseMatch };
  const attendanceTrendMatch = { ...attendanceSiteMatch };

  if (trendDateMatch.date) {
    materialTrendMatch.date = trendDateMatch.date;
    expenseTrendMatch.date = trendDateMatch.date;
    attendanceTrendMatch.date = trendDateMatch.date;
  }

  const [materials, labour, expenses] = await Promise.all([
    Material.aggregate([
      { $match: materialTrendMatch },
      { $group: { _id: { $dateToString: { format: dateField, date: '$date' } }, materials: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]),
    Attendance.aggregate([
      { $match: attendanceTrendMatch },
      { $group: { _id: { $dateToString: { format: dateField, date: '$date' } }, labour: { $sum: '$totalAmount' } } },
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
    ...labour.map((item) => item._id),
    ...expenses.map((item) => item._id),
  ]);

  return [...months].sort().map((month) => ({
    month,
    materials: materials.find((item) => item._id === month)?.materials ?? 0,
    labour: labour.find((item) => item._id === month)?.labour ?? 0,
    payments: labour.find((item) => item._id === month)?.labour ?? 0,
    expenses: expenses.find((item) => item._id === month)?.expenses ?? 0,
  }));
}

async function buildExpenseBreakdown({ materialMatch, attendanceSiteMatch, expenseMatch }) {
  const [materials, labour, expenses] = await Promise.all([
    Material.aggregate([{ $match: materialMatch }, { $group: { _id: 'Materials', total: { $sum: '$totalAmount' } } }]),
    Attendance.aggregate([{ $match: attendanceSiteMatch }, { $group: { _id: 'Labour Attendance', total: { $sum: '$totalAmount' } } }]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $lookup: { from: 'expensecategories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$cat.name', 'Other Overheads'] }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const breakdown = [];
  if (materials[0]) breakdown.push({ name: materials[0]._id, value: materials[0].total });
  if (labour[0]) breakdown.push({ name: labour[0]._id, value: labour[0].total });
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
