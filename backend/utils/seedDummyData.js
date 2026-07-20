require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('./logger');

const User = require('../models/User');
const Site = require('../models/Site');
const Supplier = require('../models/Supplier');
const Profession = require('../models/Profession');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory = require('../models/ExpenseCategory');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const Expense = require('../models/Expense');
const WorkerPayment = require('../models/WorkerPayment');
const Attendance = require('../models/Attendance');
const { seedLookups } = require('./seedLookups');

async function seedDummyData() {
  logger.info('Connecting to MongoDB for dummy data seeding...');
  await mongoose.connect(env.mongoUri);

  // 1. Seed Lookups
  await seedLookups();

  // Retrieve lookup objects
  const professions = await Profession.find({ isDeleted: { $ne: true } });
  const materialCategories = await MaterialCategory.find({ isDeleted: { $ne: true } });
  const expenseCategories = await ExpenseCategory.find({ isDeleted: { $ne: true } });

  if (professions.length === 0 || materialCategories.length === 0 || expenseCategories.length === 0) {
    throw new Error('Lookups could not be retrieved.');
  }

  // 2. Ensure Super Admin exists
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'superadmin@gmail.com';
  let superAdmin = await User.findOne({ email: superAdminEmail.toLowerCase() });
  if (!superAdmin) {
    superAdmin = await User.create({
      name: process.env.SEED_SUPER_ADMIN_NAME || 'superadmin',
      email: superAdminEmail,
      password: process.env.SEED_SUPER_ADMIN_PASSWORD || 'superadmin1234',
      role: 'super_admin',
      status: 'active',
    });
    logger.info(`Super Admin created: ${superAdminEmail}`);
  }

  // 3. Create Sites
  const siteData = [
    { name: 'Apex Residency', code: 'APX-001', address: 'Plot 42, Sector 15, City Center', status: 'active' },
    { name: 'Blue Sky Heights', code: 'BSH-002', address: '78 MG Road, Industrial Hub', status: 'active' },
    { name: 'Grand Horizon Mall', code: 'GHM-003', address: '12 Bypass Highway, Tech Park', status: 'active' },
    { name: 'Green Valley Villas', code: 'GVV-004', address: 'Valley Drive, Suburban Enclave', status: 'active' },
  ];

  const sites = [];
  for (const s of siteData) {
    let site = await Site.findOne({ code: s.code });
    if (!site) {
      site = await Site.create({ ...s, createdBy: superAdmin._id });
      logger.info(`Site created: ${site.name} (${site.code})`);
    }
    sites.push(site);
  }

  // 4. Create Site Admins
  const siteAdminProfiles = [
    { name: 'Rajesh Sharma', email: 'rajesh.siteadmin@gmail.com', phone: '+919876543210', site: sites[0]._id },
    { name: 'Suresh Kumar', email: 'suresh.siteadmin@gmail.com', phone: '+919876543211', site: sites[1]._id },
    { name: 'Anita Patel', email: 'anita.siteadmin@gmail.com', phone: '+919876543212', site: sites[2]._id },
    { name: 'Vikram Singh', email: 'vikram.siteadmin@gmail.com', phone: '+919876543213', site: sites[3]._id },
  ];

  for (const sa of siteAdminProfiles) {
    let admin = await User.findOne({ email: sa.email.toLowerCase() });
    if (!admin) {
      admin = await User.create({
        name: sa.name,
        email: sa.email,
        phone: sa.phone,
        password: 'siteadmin1234',
        role: 'site_admin',
        assignedSite: sa.site,
        status: 'active',
        createdBy: superAdmin._id,
      });
      await Site.findByIdAndUpdate(sa.site, { assignedSiteAdmin: admin._id });
      logger.info(`Site Admin created: ${admin.name} assigned to site`);
    }
  }

  // 5. Create Suppliers
  const supplierData = [
    { name: 'UltraTech Cement Ltd', contactPerson: 'Ramesh Verma', phone: '+919811122233', email: 'sales@ultratech.com', category: 'Cement' },
    { name: 'Tata Tiscon Steel', contactPerson: 'Alok Gupta', phone: '+919822233344', email: 'orders@tatatiscon.com', category: 'Steel' },
    { name: 'Supreme Plumbing Supplies', contactPerson: 'Mahesh Nair', phone: '+919833344455', email: 'info@supremeplumb.com', category: 'Plumbing' },
    { name: 'Asian Paints Authorized Dealer', contactPerson: 'Deepak Joshi', phone: '+919844455566', email: 'dealer@asianpaints.com', category: 'Paint' },
    { name: 'Jindal Steel & Power', contactPerson: 'Sunil Rao', phone: '+919855566677', email: 'contact@jindalsteel.com', category: 'Steel' },
  ];

  const suppliers = [];
  for (const sup of supplierData) {
    let supplier = await Supplier.findOne({ name: sup.name });
    if (!supplier) {
      supplier = await Supplier.create({ ...sup, createdBy: superAdmin._id });
      logger.info(`Supplier created: ${supplier.name}`);
    }
    suppliers.push(supplier);
  }

  // 6. Create Workers
  const workerProfiles = [
    { name: 'Ram Charan', phone: '+919900112233', dailyWage: 850, profIndex: 0, siteIndex: 0 },
    { name: 'Shyam Lal', phone: '+919900112234', dailyWage: 900, profIndex: 1, siteIndex: 0 },
    { name: 'Mukesh Kumar', phone: '+919900112235', dailyWage: 950, profIndex: 2, siteIndex: 1 },
    { name: 'Santosh Yadav', phone: '+919900112236', dailyWage: 800, profIndex: 3, siteIndex: 1 },
    { name: 'Dinesh Prasad', phone: '+919900112237', dailyWage: 1000, profIndex: 4, siteIndex: 2 },
    { name: 'Ganesh Shinde', phone: '+919900112238', dailyWage: 1100, profIndex: 5, siteIndex: 2 },
    { name: 'Kamlesh Sahu', phone: '+919900112239', dailyWage: 850, profIndex: 6, siteIndex: 3 },
    { name: 'Babulal Rai', phone: '+919900112240', dailyWage: 600, profIndex: 7, siteIndex: 3 },
    { name: 'Manish Pandey', phone: '+919900112241', dailyWage: 950, profIndex: 8, siteIndex: 0 },
    { name: 'Raju Helper', phone: '+919900112242', dailyWage: 550, profIndex: 9, siteIndex: 1 },
  ];

  const workers = [];
  for (const wp of workerProfiles) {
    let worker = await Worker.findOne({ phone: wp.phone });
    if (!worker) {
      worker = await Worker.create({
        name: wp.name,
        phone: wp.phone,
        dailyWage: wp.dailyWage,
        profession: professions[wp.profIndex % professions.length]._id,
        site: sites[wp.siteIndex % sites.length]._id,
        joiningDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        status: 'active',
        createdBy: superAdmin._id,
      });
      logger.info(`Worker created: ${worker.name}`);
    }
    workers.push(worker);
  }

  // 7. Seed Materials Across Dates
  const now = new Date();
  const dateOffsetsDays = [0, 1, 3, 7, 14, 30, 60, 120, 180, 240];

  const materialSamples = [
    { name: 'PPC Cement Bags', unit: 'bags', rate: 380, qty: 100, catIndex: 0, supIndex: 0 },
    { name: 'TMT Steel Rods 12mm', unit: 'tons', rate: 58000, qty: 5, catIndex: 1, supIndex: 1 },
    { name: 'River Sand', unit: 'cu.m', rate: 1600, qty: 20, catIndex: 2, supIndex: 4 },
    { name: 'Coarse Aggregate 20mm', unit: 'tons', rate: 1200, qty: 30, catIndex: 3, supIndex: 4 },
    { name: 'Red Clay Bricks', unit: 'pcs', rate: 9, qty: 5000, catIndex: 4, supIndex: 4 },
    { name: 'Vitrified Floor Tiles', unit: 'boxes', rate: 750, qty: 80, catIndex: 5, supIndex: 3 },
    { name: 'Acrylic Emulsion Paint', unit: 'liters', rate: 320, qty: 50, catIndex: 6, supIndex: 3 },
    { name: 'CPVC Pipes 1 inch', unit: 'meters', rate: 220, qty: 150, catIndex: 7, supIndex: 2 },
  ];

  let matCounter = 101;
  for (const offset of dateOffsetsDays) {
    const recordDate = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);

    for (let i = 0; i < materialSamples.length; i++) {
      const sample = materialSamples[i];
      const siteObj = sites[i % sites.length];
      const invNum = `INV-2026-${matCounter++}`;

      const existingMat = await Material.findOne({ invoiceNumber: invNum });
      if (!existingMat) {
        const totalAmt = Math.round((sample.qty * sample.rate) * 1.18);
        await Material.create({
          site: siteObj._id,
          invoiceNumber: invNum,
          supplier: suppliers[sample.supIndex % suppliers.length]._id,
          materialName: sample.name,
          category: materialCategories[sample.catIndex % materialCategories.length]._id,
          quantity: sample.qty,
          unit: sample.unit,
          rate: sample.rate,
          tax: 18,
          transportCharge: 1200,
          discount: 0,
          totalAmount: totalAmt,
          date: recordDate,
          notes: `Batch delivery for ${siteObj.name}`,
          createdBy: superAdmin._id,
        });
      }
    }
  }
  logger.info('Material dummy entries seeded');

  // 8. Seed Expenses Across Dates & Statuses & Payment Methods
  const expenseSamples = [
    { title: 'Diesel Fuel for Generator', amount: 12500, catIndex: 0, vendor: 'Bharat Petroleum', method: 'cash', status: 'approved' },
    { title: 'JCB Excavator Rental', amount: 35000, catIndex: 1, vendor: 'JCB Earthmovers', method: 'bankTransfer', status: 'approved' },
    { title: 'Worker Mess Allowance', amount: 18000, catIndex: 4, vendor: 'Annapurna Catering', method: 'cash', status: 'approved' },
    { title: 'Site Electricity Bill', amount: 24500, catIndex: 3, vendor: 'State Electricity Board', method: 'upi', status: 'approved' },
    { title: 'Truck Freight Charges', amount: 14000, catIndex: 5, vendor: 'Shree Ram Logistics', method: 'cheque', status: 'pending' },
    { title: 'Mixer Machine Maintenance', amount: 8500, catIndex: 7, vendor: 'Reliable Repair Works', method: 'card', status: 'approved' },
    { title: 'Safety Helmets & Gloves', amount: 9200, catIndex: 6, vendor: 'Suraksha Safety Store', method: 'upi', status: 'rejected' },
  ];

  let expCounter = 1;
  for (const offset of dateOffsetsDays) {
    const recordDate = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);

    for (let i = 0; i < expenseSamples.length; i++) {
      const sample = expenseSamples[i];
      const siteObj = sites[(i + expCounter) % sites.length];
      const titleUnique = `${sample.title} #${expCounter++}`;

      const existingExp = await Expense.findOne({ title: titleUnique });
      if (!existingExp) {
        await Expense.create({
          site: siteObj._id,
          title: titleUnique,
          category: expenseCategories[sample.catIndex % expenseCategories.length]._id,
          amount: sample.amount,
          vendor: sample.vendor,
          description: `Operational expense recorded for ${siteObj.name}`,
          date: recordDate,
          paymentMethod: sample.method,
          status: sample.status,
          createdBy: superAdmin._id,
        });
      }
    }
  }
  logger.info('Expense dummy entries seeded');

  // 9. Seed Worker Payments Across Dates
  for (const offset of dateOffsetsDays) {
    const recordDate = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);

    for (let i = 0; i < workers.length; i++) {
      const worker = workers[i];
      const workingDays = 6;
      const dailyWage = worker.dailyWage;
      const overtime = i % 2 === 0 ? 1200 : 0;
      const bonus = i % 3 === 0 ? 500 : 0;
      const advance = i % 4 === 0 ? 1000 : 0;
      const deduction = 0;

      const netSalary = (workingDays * dailyWage) + overtime + bonus - advance - deduction;
      const pStatus = i % 2 === 0 ? 'paid' : 'pending';
      const pMethod = i % 3 === 0 ? 'bankTransfer' : i % 2 === 0 ? 'upi' : 'cash';

      const periodStart = new Date(recordDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      await WorkerPayment.create({
        site: worker.site,
        worker: worker._id,
        periodStart,
        periodEnd: recordDate,
        workingDays,
        dailyWage,
        overtimeAmount: overtime,
        bonus,
        advance,
        deduction,
        netSalary,
        status: pStatus,
        paymentMethod: pMethod,
        paidOn: recordDate,
        remarks: `Weekly wage settlement for ${worker.name}`,
        createdBy: superAdmin._id,
      });
    }
  }
  logger.info('Worker Payment dummy entries seeded');

  // 10. Seed Attendance
  for (const offset of [0, 1, 2, 3, 4, 5, 6]) {
    const attDate = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    attDate.setHours(0, 0, 0, 0);

    for (const worker of workers) {
      const existingAtt = await Attendance.findOne({ worker: worker._id, date: attDate });
      if (!existingAtt) {
        await Attendance.create({
          site: worker.site,
          worker: worker._id,
          date: attDate,
          status: 'present',
          overtimeHours: 2,
          notes: 'Standard shift completed',
          markedBy: superAdmin._id,
        });
      }
    }
  }
  logger.info('Attendance dummy records seeded');

  logger.info('Dummy data seeding completed successfully!');
  await mongoose.disconnect();
}

seedDummyData()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`Seeding failed: ${err.message}`);
    process.exit(1);
  });
