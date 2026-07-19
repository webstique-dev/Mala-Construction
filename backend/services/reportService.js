const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const Material = require('../models/Material');
const Worker = require('../models/Worker');
const WorkerPayment = require('../models/WorkerPayment');
const Expense = require('../models/Expense');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory = require('../models/ExpenseCategory');
const Supplier = require('../models/Supplier');
const Site = require('../models/Site');
const { resolveSiteScope } = require('../utils/siteScope');
const ApiError = require('../utils/ApiError');

function getDateRange(type, startDate, endDate) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now);
  const end = endDate ? new Date(endDate) : new Date(now);
  end.setHours(23, 59, 59, 999);

  if (!startDate && !endDate) {
    start.setHours(0, 0, 0, 0);
    if (type === 'daily') return { start, end: now };
    if (type === 'weekly') { start.setDate(start.getDate() - 7); return { start, end: now }; }
    if (type === 'monthly') { start.setDate(1); return { start, end: now }; }
    if (type === 'yearly') { start.setMonth(0, 1); return { start, end: now }; }
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

async function fetchReportData(queryParams, actor) {
  const {
    type,
    siteId,
    startDate,
    endDate,
    category,
    status,
    paymentMethod,
    vendor,
    workerId,
    professionId,
    search,
    sortBy,
    sortOrder,
    showDeleted
  } = queryParams;

  const siteFilter = resolveSiteScope(actor, siteId);
  const { start, end } = getDateRange(type, startDate, endDate);
  const isDeletedFilter = (showDeleted === 'true' || showDeleted === true) ? {} : { isDeleted: false };

  const data = { title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`, rows: [], summary: {} };

  // Resolve category context
  let isMaterialCat = false;
  let isExpenseCat = false;
  if (category) {
    isMaterialCat = await MaterialCategory.exists({ _id: category, isDeleted: false });
    isExpenseCat = await ExpenseCategory.exists({ _id: category, isDeleted: false });
  }

  // Resolve vendor/supplier context
  let supplierId = null;
  let expenseVendorQuery = null;
  if (vendor) {
    if (mongoose.Types.ObjectId.isValid(vendor)) {
      supplierId = vendor;
      const supplierObj = await Supplier.findById(vendor);
      if (supplierObj) expenseVendorQuery = new RegExp(supplierObj.name, 'i');
    } else {
      expenseVendorQuery = new RegExp(vendor, 'i');
      const supplierObj = await Supplier.findOne({ name: new RegExp(`^${vendor.trim()}$`, 'i'), isDeleted: false });
      if (supplierObj) supplierId = supplierObj._id;
    }
  }

  // 1. Query Materials
  let includeMaterials = true;
  if (type === 'worker' || type === 'payment' || type === 'expense' || workerId || professionId) {
    includeMaterials = false;
  }
  if (status && status !== 'paid' && status !== 'approved') {
    includeMaterials = false;
  }
  if (paymentMethod && paymentMethod !== 'bankTransfer' && paymentMethod !== 'cash') {
    // materials don't support card/upi etc. explicitly, so if not cash/bankTransfer, filter out
    includeMaterials = false;
  }
  if (category && !isMaterialCat) {
    includeMaterials = false;
  }

  let materials = [];
  if (includeMaterials) {
    const materialQuery = {
      ...siteFilter,
      ...isDeletedFilter,
      date: { $gte: start, $lte: end },
    };
    if (category) materialQuery.category = category;
    if (supplierId) materialQuery.supplier = supplierId;
    if (search) {
      materialQuery.$or = [
        { materialName: new RegExp(search, 'i') },
        { invoiceNumber: new RegExp(search, 'i') },
      ];
    }
    materials = await Material.find(materialQuery)
      .populate('site', 'name')
      .populate('supplier', 'name')
      .populate('category', 'name')
      .sort({ date: -1 });
  }

  // 2. Query Worker Payments
  let includePayments = true;
  if (type === 'material' || type === 'expense' || category || supplierId || expenseVendorQuery) {
    includePayments = false;
  }
  if (status && status !== 'paid' && status !== 'pending') {
    includePayments = false;
  }

  let payments = [];
  if (includePayments) {
    const paymentQuery = {
      ...siteFilter,
      ...isDeletedFilter,
      paidOn: { $gte: start, $lte: end },
    };
    if (status) paymentQuery.status = status;
    if (paymentMethod) paymentQuery.paymentMethod = paymentMethod;
    if (workerId) paymentQuery.worker = workerId;
    if (professionId) {
      const workers = await Worker.find({ profession: professionId, isDeleted: false }).select('_id');
      paymentQuery.worker = { $in: workers.map((w) => w._id) };
    }
    if (search) {
      const workers = await Worker.find({ name: new RegExp(search, 'i'), isDeleted: false }).select('_id');
      paymentQuery.worker = { $in: workers.map((w) => w._id) };
    }
    payments = await WorkerPayment.find(paymentQuery)
      .populate('worker', 'name')
      .populate('site', 'name')
      .sort({ paidOn: -1 });
  }

  // 3. Query Expenses
  let includeExpenses = true;
  if (type === 'worker' || type === 'payment' || type === 'material' || workerId || professionId) {
    includeExpenses = false;
  }
  if (category && !isExpenseCat) {
    includeExpenses = false;
  }

  let expenses = [];
  if (includeExpenses) {
    const expenseQuery = {
      ...siteFilter,
      ...isDeletedFilter,
      date: { $gte: start, $lte: end },
    };
    if (category) expenseQuery.category = category;
    if (status) expenseQuery.status = status;
    if (paymentMethod) expenseQuery.paymentMethod = paymentMethod;
    if (expenseVendorQuery) expenseQuery.vendor = expenseVendorQuery;
    if (search) {
      expenseQuery.$or = [
        { title: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    expenses = await Expense.find(expenseQuery)
      .populate('site', 'name')
      .populate('category', 'name')
      .sort({ date: -1 });
  }

  // Format and consolidate data rows
  data.rows.push(...materials.map((m) => ({
    _id: m._id,
    type: 'Material',
    date: m.date,
    site: m.site?.name || 'Unknown',
    description: `${m.materialName} (${m.quantity} ${m.unit} @ ₹${m.rate})`,
    category: m.category?.name || 'Materials',
    vendor: m.supplier?.name || 'Unknown',
    paymentMethod: 'bankTransfer',
    amount: m.totalAmount,
    status: 'paid'
  })));

  data.rows.push(...payments.map((p) => ({
    _id: p._id,
    type: 'Payment',
    date: p.paidOn,
    site: p.site?.name || 'Unknown',
    description: `Wages: ${p.worker?.name || 'Worker'} (${p.workingDays} days worked)`,
    category: 'Worker Payment',
    vendor: '—',
    paymentMethod: p.paymentMethod,
    amount: p.netSalary,
    status: p.status
  })));

  data.rows.push(...expenses.map((e) => ({
    _id: e._id,
    type: 'Expense',
    date: e.date,
    site: e.site?.name || 'Unknown',
    description: e.title,
    category: e.category?.name || 'Overheads',
    vendor: e.vendor || '—',
    paymentMethod: e.paymentMethod,
    amount: e.amount,
    status: e.status
  })));

  // Calculate summaries matching filtered data ONLY
  data.summary.materialTotal = materials.reduce((s, m) => s + m.totalAmount, 0);
  data.summary.paymentTotal = payments.reduce((s, p) => s + p.netSalary, 0);
  data.summary.expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  data.summary.grandTotal = data.summary.materialTotal + data.summary.paymentTotal + data.summary.expenseTotal;

  // Sorting
  if (sortBy) {
    const order = sortOrder === 'asc' ? 1 : -1;
    data.rows.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'date') {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return -1 * order;
      if (valA > valB) return 1 * order;
      return 0;
    });
  } else {
    data.rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return data;
}

function generatePdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(data.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Grand Total: ₹${(data.summary.grandTotal ?? 0).toLocaleString('en-IN')}`);
    doc.moveDown();

    doc.fontSize(9);
    data.rows.slice(0, 200).forEach((row) => {
      doc.text(
        `${new Date(row.date).toLocaleDateString()} | ${row.type} | ${row.site ?? '-'} | ${row.description} | ₹${row.amount?.toLocaleString('en-IN')}`
      );
    });

    doc.end();
  });
}

async function generateExcel(data, queryParams, actor) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.75, header: 0.3, footer: 0.3 }
    }
  });

  // 1. Title Block
  sheet.addRow(['MALA CONSTRUCTION ERP']).font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0B2A5A' } };
  
  const reportTitle = `${data.title} Ledger`;
  sheet.addRow([reportTitle]).font = { name: 'Arial', size: 14, bold: true };
  
  const { start, end } = getDateRange(queryParams.type, queryParams.startDate, queryParams.endDate);
  const periodText = `Period: ${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;
  sheet.addRow([periodText]).font = { name: 'Arial', size: 10, italic: true };
  
  sheet.addRow([`Generated By: ${actor.name || 'Admin'} | Date: ${new Date().toLocaleString('en-IN')}`]).font = { name: 'Arial', size: 10 };

  // Site filter text
  let siteName = 'All Active Sites (Company-wide)';
  if (queryParams.siteId) {
    const siteObj = await Site.findById(queryParams.siteId);
    if (siteObj) siteName = `${siteObj.name} (${siteObj.code})`;
  }
  sheet.addRow([`Site Scope: ${siteName}`]).font = { name: 'Arial', size: 10, bold: true };

  // Filter summary text
  const filterParts = [];
  if (queryParams.category) {
    const catObj = await MaterialCategory.findById(queryParams.category) || await ExpenseCategory.findById(queryParams.category);
    if (catObj) filterParts.push(`Category: ${catObj.name}`);
  }
  if (queryParams.status) filterParts.push(`Status: ${queryParams.status}`);
  if (queryParams.paymentMethod) filterParts.push(`Payment Method: ${queryParams.paymentMethod}`);
  if (queryParams.vendor) filterParts.push(`Vendor/Supplier: ${queryParams.vendor}`);
  if (queryParams.search) filterParts.push(`Search Query: "${queryParams.search}"`);
  
  const filterSummary = filterParts.length > 0 ? `Filters Applied: ${filterParts.join(' | ')}` : 'Filters Applied: None';
  sheet.addRow([filterSummary]).font = { name: 'Arial', size: 10 };

  sheet.addRow([]); // Blank row

  // 2. Summary Section
  sheet.addRow(['REPORT EXPENDITURE SUMMARY']).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E6FFF' } };
  
  sheet.addRow([
    'Total Records',
    'Material Purchases',
    'Worker Wages Paid',
    'Overhead Expenses',
    'Grand Total'
  ]).font = { name: 'Arial', size: 10, bold: true };
  
  const summaryRow = sheet.addRow([
    data.rows.length,
    data.summary.materialTotal ?? 0,
    data.summary.paymentTotal ?? 0,
    data.summary.expenseTotal ?? 0,
    data.summary.grandTotal ?? 0
  ]);
  summaryRow.font = { name: 'Arial', size: 10, bold: true };
  summaryRow.getCell(2).numFmt = '₹#,##0.00';
  summaryRow.getCell(3).numFmt = '₹#,##0.00';
  summaryRow.getCell(4).numFmt = '₹#,##0.00';
  summaryRow.getCell(5).numFmt = '₹#,##0.00';

  sheet.addRow([]); // Blank row

  // 3. Data Table Headers
  const headerRow = sheet.addRow([
    'S.No.',
    'Date',
    'Type',
    'Project Site',
    'Description / Item / Worker',
    'Category',
    'Supplier / Vendor',
    'Payment Method',
    'Amount',
    'Status'
  ]);
  
  headerRow.height = 28;
  headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Style headers
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A1D29' } // Dark Navy sidebar theme
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // 4. Data Rows
  let index = 1;
  data.rows.forEach((row) => {
    const amountVal = Number(row.amount) || 0;
    const formattedDate = row.date ? new Date(row.date) : '';
    
    const dataRow = sheet.addRow([
      index++,
      formattedDate,
      row.type || '',
      row.site || '',
      row.description || '',
      row.category || '',
      row.vendor || '',
      row.paymentMethod || '',
      amountVal,
      row.status || ''
    ]);
    
    dataRow.height = 20;
    dataRow.font = { name: 'Arial', size: 9 };
    
    // Zebra striping background pattern
    const rowColor = (index % 2 === 0) ? 'FFFFFFFF' : 'FFF8FAFC'; // slate-50/white alternating
    
    dataRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowColor }
      };
      
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Alignments & Number formats
      if (colNumber === 1 || colNumber === 3 || colNumber === 8 || colNumber === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = 'yyyy-mm-dd';
      } else if (colNumber === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '₹#,##0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Enable Auto Filter
  sheet.autoFilter = `A13:J13`;

  // Freeze top panes (keep header visible, freeze row 1-13)
  sheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 13,
      topLeftCell: 'A14',
      activePane: 'bottomLeft'
    }
  ];

  // Adjust Column Widths dynamically
  sheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      let value = cell.value;
      if (value instanceof Date) {
        value = value.toISOString().slice(0, 10);
      }
      const columnLength = value ? value.toString().length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  // Footer with Page Numbers
  sheet.headerFooter.oddFooter = `&LGenerated: &D &T &RPage &P of &N`;

  return workbook.xlsx.writeBuffer();
}

function generateCsv(data) {
  const headers = ['Date', 'Type', 'Site', 'Description', 'Category', 'Vendor', 'Amount', 'Status'];
  const lines = [headers.join(',')];
  data.rows.forEach((row) => {
    lines.push([
      row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      row.type,
      `"${(row.site ?? '').replace(/"/g, '""')}"`,
      `"${(row.description ?? '').replace(/"/g, '""')}"`,
      `"${(row.category ?? '').replace(/"/g, '""')}"`,
      `"${(row.vendor ?? '').replace(/"/g, '""')}"`,
      row.amount ?? 0,
      row.status || ''
    ].join(','));
  });
  lines.push(`,,,,,Grand Total,${data.summary.grandTotal ?? 0}`);
  return Buffer.from(lines.join('\n'), 'utf-8');
}

async function generateReport(queryParams, actor) {
  const { type, format, startDate, endDate } = queryParams;
  const data = await fetchReportData(queryParams, actor);

  if (data.rows.length === 0) {
    throw ApiError.notFound('No data found for the selected report criteria');
  }

  if (format === 'json') {
    return { data, isJson: true };
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const startStr = startDate ? new Date(startDate).toISOString().slice(0, 10) : '';
  const endStr = endDate ? new Date(endDate).toISOString().slice(0, 10) : '';
  
  let rangeStr = dateStr;
  if (startStr && endStr) {
    rangeStr = `${startStr}_to_${endStr}`;
  }

  if (format === 'excel') {
    const buffer = await generateExcel(data, queryParams, actor);
    return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${rangeStr}.xlsx` };
  }

  if (format === 'csv') {
    const buffer = generateCsv(data);
    return { buffer, contentType: 'text/csv', filename: `${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${rangeStr}.csv` };
  }

  const buffer = await generatePdf(data);
  return { buffer, contentType: 'application/pdf', filename: `${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${rangeStr}.pdf` };
}

module.exports = { generateReport, fetchReportData };
