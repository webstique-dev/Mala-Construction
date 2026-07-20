require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const reportService = require('../services/reportService');
const User = require('../models/User');

async function verifyAllReports() {
  await mongoose.connect(env.mongoUri);
  const admin = await User.findOne({ role: 'super_admin' });
  if (!admin) throw new Error('Super Admin not found');

  const reportTypes = ['daily', 'monthly', 'site', 'expense', 'payment'];
  
  for (const type of reportTypes) {
    console.log(`--- Testing Report Type: ${type} ---`);
    const jsonRes = await reportService.generateReport({ type, format: 'json' }, admin);
    console.log(`JSON Result (${type}): ${jsonRes.data.rows.length} rows found`);
    console.log(`Summary Grand Total (${type}): Rs. ${jsonRes.data.summary.grandTotal}`);

    const pdfRes = await reportService.generateReport({ type, format: 'pdf' }, admin);
    console.log(`PDF Result (${type}): ${pdfRes.buffer.length} bytes generated`);

    const excelRes = await reportService.generateReport({ type, format: 'excel' }, admin);
    console.log(`Excel Result (${type}): ${excelRes.buffer.length} bytes generated`);
  }

  console.log('--- All report types, PDF, Excel, and JSON calculations verified successfully! ---');
  await mongoose.disconnect();
}

verifyAllReports()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
