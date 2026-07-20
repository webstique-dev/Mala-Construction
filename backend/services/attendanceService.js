const attendanceRepo = require('../repositories/attendance.repository');
const Profession = require('../models/Profession');
const ApiError = require('../utils/ApiError');
const { resolveSiteScope, assertSiteAccess } = require('../utils/siteScope');
const { recordActivity, logActivity } = require('./auditLogService');
const { uploadBuffer, deleteAsset } = require('./uploadService');

function calculateWorkingHours(inTime = '09:00', outTime = '18:00') {
  if (!inTime || !outTime) return 8;

  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 8;

  let inMinutes = inH * 60 + inM;
  let outMinutes = outH * 60 + outM;

  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60; // Overnight shift
  }

  const diffMinutes = outMinutes - inMinutes;
  const hours = diffMinutes / 60;
  return Math.round(hours * 100) / 100;
}

function calculateFinancials(status = 'present', dailyWage = 0, overtimeHours = 0) {
  const wage = Number(dailyWage) || 0;
  const otHours = Number(overtimeHours) || 0;
  const hourlyRate = wage > 0 ? wage / 8 : 0;
  const overtimeAmount = Math.round((otHours * hourlyRate) * 100) / 100;

  const baseWage = status === 'halfDay' ? wage * 0.5 : wage;
  const totalAmount = Math.round((baseWage + overtimeAmount) * 100) / 100;

  return {
    overtimeAmount,
    totalAmount,
    dailyLabourCost: totalAmount,
  };
}

async function recordAttendance(data, actor, file) {
  const {
    site,
    date,
    contractor,
    profession,
    workerName = '',
    mobileNumber = '',
    gender = 'unspecified',
    inTime = '09:00',
    outTime = '18:00',
    dailyWage = 0,
    status = 'present',
    overtimeHours = 0,
    remarks = '',
  } = data;

  if (!site) throw ApiError.badRequest('Project site is required');
  if (!profession) throw ApiError.badRequest('Profession / Trade is required');
  if (!date) throw ApiError.badRequest('Attendance date is required');

  assertSiteAccess(actor, site);

  let profName = '';
  const profDoc = await Profession.findById(profession);
  if (profDoc) profName = profDoc.name;

  const workingHours = calculateWorkingHours(inTime, outTime);
  const { overtimeAmount, totalAmount, dailyLabourCost } = calculateFinancials(
    status,
    dailyWage,
    overtimeHours
  );

  let attachment = null;
  if (file) {
    attachment = await uploadBuffer(
      file.buffer,
      'mala-erp/attendance/attachments',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const payload = {
    site,
    date: new Date(date),
    contractor: contractor ? contractor.trim() : 'Direct / In-House',
    profession,
    professionName: profName,
    workerName: workerName ? workerName.trim() : '',
    mobileNumber: mobileNumber ? mobileNumber.trim() : '',
    gender: ['male', 'female', 'other'].includes(gender) ? gender : 'unspecified',
    inTime,
    outTime,
    workingHours,
    status,
    dailyWage: Number(dailyWage) || 0,
    overtimeHours: Number(overtimeHours) || 0,
    overtimeAmount,
    totalAmount,
    dailyLabourCost,
    remarks: remarks ? remarks.trim() : '',
    attachment,
    markedBy: actor._id,
  };

  let record = await attendanceRepo.create(payload);
  record = await attendanceRepo.findById(record._id);

  await logActivity({
    actor: actor._id,
    site,
    action: 'created',
    entityType: 'Attendance',
    entityId: record._id,
    description: `Logged labour entry for ${record.workerName || 'Worker'} (${record.contractor})`,
  });

  return record;
}

async function recordBatchAttendance(payload, actor) {
  const {
    site,
    date,
    contractor = 'Direct / In-House',
    profession,
    inTime = '09:00',
    outTime = '18:00',
    dailyWage = 0,
    workers = [],
  } = payload;

  if (!site) throw ApiError.badRequest('Project site is required');
  if (!profession) throw ApiError.badRequest('Profession is required');
  if (!date) throw ApiError.badRequest('Date is required');
  if (!Array.isArray(workers) || workers.length === 0) {
    throw ApiError.badRequest('At least one worker entry is required for batch creation');
  }

  assertSiteAccess(actor, site);

  let profName = '';
  const profDoc = await Profession.findById(profession);
  if (profDoc) profName = profDoc.name;

  const attendanceDate = new Date(date);
  const commonWorkingHours = calculateWorkingHours(inTime, outTime);
  const contractorName = contractor ? contractor.trim() : 'Direct / In-House';

  const documentsToInsert = workers.map((w) => {
    const workerWage = Number(w.dailyWage ?? dailyWage) || 0;
    const workerStatus = w.status || 'present';
    const workerOtHours = Number(w.overtimeHours) || 0;
    const workerInTime = w.inTime || inTime;
    const workerOutTime = w.outTime || outTime;
    const hours = calculateWorkingHours(workerInTime, workerOutTime) || commonWorkingHours;

    const { overtimeAmount, totalAmount, dailyLabourCost } = calculateFinancials(
      workerStatus,
      workerWage,
      workerOtHours
    );

    return {
      site,
      date: attendanceDate,
      contractor: contractorName,
      profession,
      professionName: profName,
      workerName: w.workerName ? w.workerName.trim() : '',
      mobileNumber: w.mobileNumber ? w.mobileNumber.trim() : '',
      gender: 'unspecified',
      inTime: workerInTime,
      outTime: workerOutTime,
      workingHours: hours,
      status: workerStatus,
      dailyWage: workerWage,
      overtimeHours: workerOtHours,
      overtimeAmount,
      totalAmount,
      dailyLabourCost,
      remarks: w.remarks ? w.remarks.trim() : '',
      markedBy: actor._id,
    };
  });

  const inserted = await attendanceRepo.createMany(documentsToInsert);

  await logActivity({
    actor: actor._id,
    site,
    action: 'created',
    entityType: 'Attendance',
    entityId: inserted[0]?._id,
    description: `Batch logged ${inserted.length} workers for profession "${profName}"`,
  });

  return inserted;
}

async function getAttendanceList(queryParams, actor) {
  const {
    siteId,
    date,
    period,
    startDate,
    endDate,
    contractor,
    professionId,
    search,
    status,
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortOrder = 'desc',
    showDeleted,
  } = queryParams;

  const siteFilter = resolveSiteScope(actor, siteId);
  const query = { ...siteFilter };

  if (status) {
    query.status = status;
  }

  if (professionId) {
    query.profession = professionId;
  }

  if (contractor) {
    query.contractor = new RegExp(`^${contractor.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  // Date / Period filters
  if (startDate || endDate || period === 'custom') {
    const range = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    if (Object.keys(range).length > 0) query.date = range;
  } else if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (period === 'week') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  } else if (period === 'month') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  // Search filter
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { workerName: regex },
      { contractor: regex },
      { mobileNumber: regex },
      { remarks: regex },
    ];
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const pagination = { page: Number(page) || 1, limit: Number(limit) || 20, sort };

  return attendanceRepo.findAll(query, pagination, showDeleted === 'true' || showDeleted === true);
}

async function getAttendanceById(id, actor) {
  const record = await attendanceRepo.findById(id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  assertSiteAccess(actor, record.site._id || record.site);
  return record;
}

async function updateAttendance(id, data, actor, file) {
  const existing = await attendanceRepo.findById(id);
  if (!existing) throw ApiError.notFound('Attendance record not found');

  assertSiteAccess(actor, existing.site._id || existing.site);

  const {
    contractor = existing.contractor,
    workerName = existing.workerName,
    mobileNumber = existing.mobileNumber,
    gender = existing.gender,
    inTime = existing.inTime,
    outTime = existing.outTime,
    dailyWage = existing.dailyWage,
    status = existing.status,
    overtimeHours = existing.overtimeHours,
    remarks = existing.remarks,
    profession = existing.profession?._id || existing.profession,
  } = data;

  let profName = existing.professionName;
  if (profession && profession !== (existing.profession?._id || existing.profession)?.toString()) {
    const profDoc = await Profession.findById(profession);
    if (profDoc) profName = profDoc.name;
  }

  const workingHours = calculateWorkingHours(inTime, outTime);
  const { overtimeAmount, totalAmount, dailyLabourCost } = calculateFinancials(
    status,
    dailyWage,
    overtimeHours
  );

  let attachment = existing.attachment;
  if (file) {
    if (existing.attachment?.publicId) {
      await deleteAsset(existing.attachment.publicId, existing.attachment.url?.endsWith('.pdf') ? 'raw' : 'image');
    }
    attachment = await uploadBuffer(
      file.buffer,
      'mala-erp/attendance/attachments',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const payload = {
    contractor: contractor ? contractor.trim() : 'Direct / In-House',
    workerName: workerName ? workerName.trim() : '',
    mobileNumber: mobileNumber ? mobileNumber.trim() : '',
    gender: ['male', 'female', 'other'].includes(gender) ? gender : 'unspecified',
    inTime,
    outTime,
    workingHours,
    dailyWage: Number(dailyWage) || 0,
    status,
    overtimeHours: Number(overtimeHours) || 0,
    overtimeAmount,
    totalAmount,
    dailyLabourCost,
    remarks: remarks ? remarks.trim() : '',
    profession,
    professionName: profName,
    attachment,
  };

  const updated = await attendanceRepo.updateById(id, payload);

  await logActivity({
    actor: actor._id,
    site: existing.site._id || existing.site,
    action: 'updated',
    entityType: 'Attendance',
    entityId: id,
    description: `Updated labour entry for ${updated.workerName || 'Worker'} (${updated.contractor})`,
  });

  return updated;
}

async function deleteAttendance(id, actor) {
  const existing = await attendanceRepo.findById(id);
  if (!existing) throw ApiError.notFound('Attendance record not found');

  assertSiteAccess(actor, existing.site._id || existing.site);

  const deleted = await attendanceRepo.softDelete(id, actor._id);

  await logActivity({
    actor: actor._id,
    site: existing.site._id || existing.site,
    action: 'deleted',
    entityType: 'Attendance',
    entityId: id,
    description: `Deleted labour entry for ${existing.workerName || 'Worker'}`,
  });

  return deleted;
}

async function getAttendanceStats(queryParams, actor) {
  const siteFilter = resolveSiteScope(actor, queryParams?.siteId);
  return attendanceRepo.getStats(siteFilter);
}

async function getWeeklyReport(queryParams, actor) {
  const { siteId, startDate, endDate, contractor } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const matchFilter = { ...siteFilter };

  if (contractor) {
    matchFilter.contractor = new RegExp(`^${contractor.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  const now = new Date();
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;

  if (!start) {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  }
  if (!end) {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  }

  matchFilter.date = { $gte: start, $lte: end };

  const report = await attendanceRepo.getWeeklyReportData(matchFilter);
  return {
    period: { start, end },
    ...report,
  };
}

async function getContractors(queryParams, actor) {
  const siteFilter = resolveSiteScope(actor, queryParams?.siteId);
  return attendanceRepo.getDistinctContractors(siteFilter);
}

module.exports = {
  recordAttendance,
  recordBatchAttendance,
  getAttendanceList,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  getWeeklyReport,
  getContractors,
  calculateWorkingHours,
  calculateFinancials,
};
