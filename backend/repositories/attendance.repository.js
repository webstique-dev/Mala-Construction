const Attendance = require('../models/Attendance');
const { addSoftDeleteFilter, createSoftDeletePayload, createRestorePayload } = require('../utils/softDeleteHelpers');

const populateFields = [
  { path: 'site', select: 'name code' },
  { path: 'profession', select: 'name' },
  { path: 'markedBy', select: 'name' },
];

function create(data) {
  return Attendance.create(data);
}

function createMany(records) {
  return Attendance.insertMany(records);
}

function findById(id, includeDeleted = false) {
  const query = addSoftDeleteFilter({ _id: id }, includeDeleted);
  return Attendance.findOne(query).populate(populateFields);
}

async function findAll(query, { page = 1, limit = 20, sort = { date: -1 } }, includeDeleted = false) {
  const filterQuery = addSoftDeleteFilter(query, includeDeleted);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Attendance.find(filterQuery).populate(populateFields).sort(sort).skip(skip).limit(limit),
    Attendance.countDocuments(filterQuery),
  ]);
  return { items, total };
}

function updateById(id, data) {
  return Attendance.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(populateFields);
}

function softDelete(id, userId) {
  const payload = createSoftDeletePayload(userId);
  return Attendance.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function restore(id) {
  const payload = createRestorePayload();
  return Attendance.findByIdAndUpdate(id, payload, { new: true }).populate(populateFields);
}

function deleteById(id) {
  return Attendance.findByIdAndDelete(id);
}

async function getDistinctContractors(filter = {}) {
  const query = addSoftDeleteFilter(filter, false);
  return Attendance.distinct('contractor', query);
}

async function getStats(filter) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(todayStart);
  monthStart.setDate(1);

  const baseMatch = { isDeleted: false, ...filter };

  const [todayPresent, todayExpenseRes, weeklyExpenseRes, monthlyExpenseRes] = await Promise.all([
    Attendance.countDocuments({
      ...baseMatch,
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['present', 'halfDay', 'overtime'] },
    }),
    Attendance.aggregate([
      { $match: { ...baseMatch, date: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Attendance.aggregate([
      { $match: { ...baseMatch, date: { $gte: weekStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Attendance.aggregate([
      { $match: { ...baseMatch, date: { $gte: monthStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  return {
    todayWorkersPresent: todayPresent,
    todayLabourExpense: todayExpenseRes[0]?.total || 0,
    weeklyLabourExpense: weeklyExpenseRes[0]?.total || 0,
    monthlyLabourExpense: monthlyExpenseRes[0]?.total || 0,
  };
}

async function getWeeklyReportData(matchFilter) {
  const baseMatch = { isDeleted: false, ...matchFilter };

  const [
    totalsRes,
    contractorBreakdown,
    professionBreakdown,
    dailyBreakdown,
  ] = await Promise.all([
    Attendance.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'fullDay']] }, 1, 0] },
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ['$status', 'halfDay'] }, 1, 0] },
          },
          totalOvertimeHours: { $sum: '$overtimeHours' },
          totalOvertimeAmount: { $sum: '$overtimeAmount' },
          totalLabourCost: { $sum: '$totalAmount' },
        },
      },
    ]),

    // Contractor-wise Summary
    Attendance.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$contractor',
          totalWorkers: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $in: ['$status', ['present', 'overtime']] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ['$status', 'halfDay'] }, 1, 0] } },
          overtimeHours: { $sum: '$overtimeHours' },
          overtimeAmount: { $sum: '$overtimeAmount' },
          totalCost: { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalCost: -1 } },
    ]),

    // Profession-wise Summary
    Attendance.aggregate([
      { $match: baseMatch },
      {
        $lookup: {
          from: 'professions',
          localField: 'profession',
          foreignField: '_id',
          as: 'profDoc',
        },
      },
      { $unwind: { path: '$profDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$profDoc.name', '$professionName', 'Other'] },
          totalWorkers: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $in: ['$status', ['present', 'overtime']] }, 1, 0] } },
          halfDays: { $sum: { $cond: [{ $eq: ['$status', 'halfDay'] }, 1, 0] } },
          overtimeHours: { $sum: '$overtimeHours' },
          totalCost: { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalCost: -1 } },
    ]),

    // Date-wise Summary
    Attendance.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalWorkers: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $in: ['$status', ['present', 'overtime']] }, 1, 0] } },
          halfDayCount: { $sum: { $cond: [{ $eq: ['$status', 'halfDay'] }, 1, 0] } },
          totalCost: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const summary = totalsRes[0] || {
    totalEntries: 0,
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    totalOvertimeHours: 0,
    totalOvertimeAmount: 0,
    totalLabourCost: 0,
  };

  return {
    summary,
    contractorBreakdown: contractorBreakdown.map((c) => ({
      contractor: c._id || 'Direct / In-House',
      totalWorkers: c.totalWorkers,
      presentDays: c.presentDays,
      halfDays: c.halfDays,
      overtimeHours: c.overtimeHours,
      overtimeAmount: c.overtimeAmount,
      totalCost: c.totalCost,
    })),
    professionBreakdown: professionBreakdown.map((p) => ({
      profession: p._id,
      totalWorkers: p.totalWorkers,
      presentDays: p.presentDays,
      halfDays: p.halfDays,
      overtimeHours: p.overtimeHours,
      totalCost: p.totalCost,
    })),
    dailyBreakdown: dailyBreakdown.map((d) => ({
      date: d._id,
      totalWorkers: d.totalWorkers,
      presentCount: d.presentCount,
      halfDayCount: d.halfDayCount,
      totalCost: d.totalCost,
    })),
  };
}

module.exports = {
  create,
  createMany,
  findById,
  findAll,
  updateById,
  softDelete,
  restore,
  deleteById,
  getDistinctContractors,
  getStats,
  getWeeklyReportData,
};
