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
  let start = startDate ? new Date(startDate) : null;
  let end = endDate ? new Date(endDate) : null;

  if (start && isNaN(start.getTime())) start = null;
  if (end && isNaN(end.getTime())) end = null;

  if (!start && !end) {
    const defaultEnd = new Date(now);
    defaultEnd.setHours(23, 59, 59, 999);

    const defaultStart = new Date(now);
    defaultStart.setHours(0, 0, 0, 0);

    if (type === 'daily') {
      return { start: defaultStart, end: defaultEnd };
    }
    if (type === 'weekly') {
      defaultStart.setDate(defaultStart.getDate() - 7);
      return { start: defaultStart, end: defaultEnd };
    }
    if (type === 'monthly') {
      defaultStart.setDate(1);
      return { start: defaultStart, end: defaultEnd };
    }
    if (type === 'yearly') {
      defaultStart.setMonth(0, 1);
      return { start: defaultStart, end: defaultEnd };
    }

    // Default to all historical records for site, expense, payment, worker, material, etc.
    return { start: new Date(0), end: defaultEnd };
  }

  const finalStart = start ? new Date(start) : new Date(0);
  finalStart.setHours(0, 0, 0, 0);

  const finalEnd = end ? new Date(end) : new Date(now);
  finalEnd.setHours(23, 59, 59, 999);

  if (finalStart > finalEnd) {
    const tempStart = new Date(finalEnd);
    tempStart.setHours(0, 0, 0, 0);
    const tempEnd = new Date(finalStart);
    tempEnd.setHours(23, 59, 59, 999);
    return { start: tempStart, end: tempEnd };
  }

  return { start: finalStart, end: finalEnd };
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

  const data = { title: `${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'General'} Report`, rows: [], summary: {} };

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
  if (paymentMethod && paymentMethod !== 'bankTransfer') {
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
      const suppliers = await Supplier.find({ name: new RegExp(search, 'i'), isDeleted: false }).select('_id');
      materialQuery.$or = [
        { materialName: new RegExp(search, 'i') },
        { invoiceNumber: new RegExp(search, 'i') },
        { notes: new RegExp(search, 'i') },
        ...(suppliers.length > 0 ? [{ supplier: { $in: suppliers.map(s => s._id) } }] : [])
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
      paymentQuery.$or = [
        { remarks: new RegExp(search, 'i') },
        ...(workers.length > 0 ? [{ worker: { $in: workers.map((w) => w._id) } }] : [])
      ];
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
    description: `${m.materialName || 'Material'} (${m.quantity || 0} ${m.unit || 'units'} @ Rs. ${m.rate || 0})`,
    category: m.category?.name || 'Materials',
    vendor: m.supplier?.name || 'Unknown',
    paymentMethod: 'bankTransfer',
    amount: m.totalAmount || 0,
    status: 'paid'
  })));

  data.rows.push(...payments.map((p) => ({
    _id: p._id,
    type: 'Payment',
    date: p.paidOn,
    site: p.site?.name || 'Unknown',
    description: `Wages: ${p.worker?.name || 'Worker'} (${p.workingDays || 0} days worked)`,
    category: 'Worker Payment',
    vendor: '—',
    paymentMethod: p.paymentMethod || 'cash',
    amount: p.netSalary || 0,
    status: p.status || 'pending'
  })));

  data.rows.push(...expenses.map((e) => ({
    _id: e._id,
    type: 'Expense',
    date: e.date,
    site: e.site?.name || 'Unknown',
    description: e.title || 'Overhead Expense',
    category: e.category?.name || 'Overheads',
    vendor: e.vendor || '—',
    paymentMethod: e.paymentMethod || 'cash',
    amount: e.amount || 0,
    status: e.status || 'pending'
  })));

  // Calculate summaries matching filtered data ONLY
  data.summary.materialTotal = materials.reduce((s, m) => s + (m.totalAmount || 0), 0);
  data.summary.paymentTotal = payments.reduce((s, p) => s + (p.netSalary || 0), 0);
  data.summary.expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
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
    data.rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  return data;
}

async function generatePdf(data, queryParams = {}, actor = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: 'A4', bufferPages: true });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const headerBgColor = '#1a1d29';
      const textColor = '#0f172a';
      const lightBg = '#f8fafc';
      const borderColor = '#cbd5e1';

      // 1. Header Banner
      doc.rect(0, 0, doc.page.width, 65).fill('#0b2a5a');
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('MALA CONSTRUCTION ERP', 35, 15);
      doc.fontSize(10).font('Helvetica').text('Audited Operations & Financial Ledger', 35, 38);

      const reportTitleStr = `${data.title || 'Financial Statement'}`;
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(reportTitleStr.toUpperCase(), doc.page.width - 260, 24, { width: 225, align: 'right' });

      doc.y = 78;

      // 2. Metadata & Scope Box
      const { start, end } = getDateRange(queryParams.type, queryParams.startDate, queryParams.endDate);
      const periodStr = `${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}`;

      let siteName = 'All Active Sites (Company-wide)';
      if (queryParams.siteId) {
        const siteObj = await Site.findById(queryParams.siteId);
        if (siteObj) siteName = `${siteObj.name} (${siteObj.code})`;
      }

      const metaBoxY = doc.y;
      doc.rect(35, metaBoxY, 525, 48).fillAndStroke(lightBg, borderColor);

      const metaY = metaBoxY + 8;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0b2a5a').text(`Site Scope: `, 43, metaY, { continued: true });
      doc.font('Helvetica').fillColor(textColor).text(siteName);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0b2a5a').text(`Period: `, 43, metaY + 14, { continued: true });
      doc.font('Helvetica').fillColor(textColor).text(periodStr);

      const printDate = new Date().toLocaleString('en-IN');
      const authorStr = actor.name || 'Admin';
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0b2a5a').text(`Generated By: `, 305, metaY, { continued: true });
      doc.font('Helvetica').fillColor(textColor).text(`${authorStr} (${printDate})`);

      const recCount = data.rows ? data.rows.length : 0;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0b2a5a').text(`Total Records: `, 305, metaY + 14, { continued: true });
      doc.font('Helvetica').fillColor(textColor).text(`${recCount} entries`);

      doc.y = metaBoxY + 56;

      // 3. KPI Summary Metrics Boxes
      const summaryBoxY = doc.y;
      const boxWidth = 125;
      const matTotal = data.summary?.materialTotal || 0;
      const payTotal = data.summary?.paymentTotal || 0;
      const expTotal = data.summary?.expenseTotal || 0;
      const grandTotal = data.summary?.grandTotal || 0;

      const kpis = [
        { label: 'Material Costs', val: matTotal, color: '#10b981' },
        { label: 'Wages Paid', val: payTotal, color: '#f59e0b' },
        { label: 'Overhead Costs', val: expTotal, color: '#ef4444' },
        { label: 'Grand Total', val: grandTotal, color: '#1e6fff' }
      ];

      kpis.forEach((kpi, idx) => {
        const bx = 35 + idx * (boxWidth + 8);
        doc.rect(bx, summaryBoxY, boxWidth, 36).fillAndStroke('#ffffff', borderColor);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text(kpi.label.toUpperCase(), bx + 6, summaryBoxY + 6);
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor(kpi.color).text(`Rs. ${kpi.val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bx + 6, summaryBoxY + 18);
      });

      doc.y = summaryBoxY + 44;

      // 4. Data Table Headers (Exact total sum = 525pt matching printable page width)
      const headers = [
        { label: 'S.No.', width: 28, align: 'center' },
        { label: 'Date', width: 60, align: 'center' },
        { label: 'Type', width: 50, align: 'center' },
        { label: 'Project Site', width: 80, align: 'left' },
        { label: 'Description', width: 150, align: 'left' },
        { label: 'Category', width: 70, align: 'left' },
        { label: 'Amount (Rs.)', width: 87, align: 'right' },
      ];

      const drawTableHeader = (yPos) => {
        doc.rect(35, yPos, 525, 20).fill(headerBgColor);
        let currX = 35;
        headers.forEach((h) => {
          const paddingLeft = h.align === 'right' ? 0 : 4;
          const paddingRight = h.align === 'right' ? 4 : 0;
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff').text(
            h.label,
            currX + paddingLeft,
            yPos + 5,
            { width: h.width - (paddingLeft + paddingRight), align: h.align }
          );
          currX += h.width;
        });
        return yPos + 20;
      };

      let tableY = drawTableHeader(doc.y);

      if (data.rows.length === 0) {
        doc.rect(35, tableY, 525, 32).fillAndStroke(lightBg, borderColor);
        doc.fontSize(9).font('Helvetica').fillColor('#64748b').text('No ledger records found matching the specified report filters.', 45, tableY + 10, { align: 'center', width: 505 });
      } else {
        data.rows.forEach((row, i) => {
          const descText = row.description || '-';

          // Calculate dynamic row height based on Description text
          doc.fontSize(7.5).font('Helvetica');
          const descHeight = doc.heightOfString(descText, { width: headers[4].width - 8 });
          const rowHeight = Math.max(18, Math.min(48, Math.ceil(descHeight + 6)));

          if (tableY + rowHeight > doc.page.height - 40) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, 26).fill('#0b2a5a');
            doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(`MALA CONSTRUCTION ERP - ${data.title} (Contd.)`, 35, 8);
            tableY = drawTableHeader(34);
          }

          const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          doc.rect(35, tableY, 525, rowHeight).fillAndStroke(rowBg, borderColor);

          let currX = 35;
          const formattedDateStr = row.date ? new Date(row.date).toISOString().slice(0, 10) : '-';
          const amtStr = Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const values = [
            { text: String(i + 1), width: headers[0].width, align: headers[0].align, multiLine: false },
            { text: formattedDateStr, width: headers[1].width, align: headers[1].align, multiLine: false },
            { text: row.type || '-', width: headers[2].width, align: headers[2].align, multiLine: false },
            { text: row.site || '-', width: headers[3].width, align: headers[3].align, multiLine: false },
            { text: descText, width: headers[4].width, align: headers[4].align, multiLine: true },
            { text: row.category || '-', width: headers[5].width, align: headers[5].align, multiLine: false },
            { text: amtStr, width: headers[6].width, align: headers[6].align, multiLine: false },
          ];

          values.forEach((v) => {
            const paddingLeft = v.align === 'right' ? 0 : 4;
            const paddingRight = v.align === 'right' ? 4 : 0;
            const cellW = v.width - (paddingLeft + paddingRight);

            doc.fontSize(7.5).font('Helvetica').fillColor(textColor).text(v.text, currX + paddingLeft, tableY + 4, {
              width: cellW,
              align: v.align,
              lineBreak: v.multiLine,
              ellipsis: !v.multiLine,
              height: rowHeight - 6
            });
            currX += v.width;
          });

          tableY += rowHeight;
        });
      }

      // 5. Footer with Page Numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text(
          `Page ${i + 1} of ${pages.count}   |   Mala Construction ERP   |   Confidential Operations Ledger`,
          35,
          doc.page.height - 24,
          { align: 'center', width: 525 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
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

  const reportTitle = `${data.title || 'Financial'} Ledger Statement`;
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
  if (queryParams.workerId) {
    const workerObj = await Worker.findById(queryParams.workerId);
    if (workerObj) filterParts.push(`Worker: ${workerObj.name}`);
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
  summaryRow.getCell(2).numFmt = '"Rs." #,##0.00';
  summaryRow.getCell(3).numFmt = '"Rs." #,##0.00';
  summaryRow.getCell(4).numFmt = '"Rs." #,##0.00';
  summaryRow.getCell(5).numFmt = '"Rs." #,##0.00';

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
      fgColor: { argb: 'FF1A1D29' }
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

    const rowColor = (index % 2 === 0) ? 'FFFFFFFF' : 'FFF8FAFC';

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

      if (colNumber === 1 || colNumber === 3 || colNumber === 8 || colNumber === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = 'yyyy-mm-dd';
      } else if (colNumber === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '"Rs." #,##0.00';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  sheet.autoFilter = `A13:J13`;

  sheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 13,
      topLeftCell: 'A14',
      activePane: 'bottomLeft'
    }
  ];

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

  if (format === 'json') {
    return { data, isJson: true };
  }

  if (data.rows.length === 0) {
    throw ApiError.notFound('No data found for the selected report criteria');
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

  const buffer = await generatePdf(data, queryParams, actor);
  return { buffer, contentType: 'application/pdf', filename: `${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${rangeStr}.pdf` };
}

module.exports = { generateReport, fetchReportData };
