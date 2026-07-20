'use strict';
/**
 * seedDummyData.js
 * Run with: npm run seed:dummy
 *
 * Creates realistic dummy data for all 13 project sites plus
 * related site admins, workers, attendance, materials, expenses,
 * worker payments, suppliers, professions, and categories.
 *
 * SAFE TO RUN MULTIPLE TIMES — checks for existing records before inserting.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Models ───────────────────────────────────────────────────────────────────
const User             = require('../models/User');
const Site             = require('../models/Site');
const Profession       = require('../models/Profession');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory  = require('../models/ExpenseCategory');
const Supplier         = require('../models/Supplier');
const Worker           = require('../models/Worker');
const Attendance       = require('../models/Attendance');
const Material         = require('../models/Material');
const Expense          = require('../models/Expense');
const WorkerPayment    = require('../models/WorkerPayment');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateRange(start, end) {
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── Project Sites Definition ─────────────────────────────────────────────────
const SITES_DEF = [
  { name: "Mr. Gopi Residence",              code: "MGR001",  city: "Mannivakkam, Chennai",   status: "completed", desc: "Premium residential villa with modern architecture",                         startDaysAgo: 730 },
  { name: "Mr. Luke Thomas Residence",       code: "MLT001",  city: "Perambur, Chennai",       status: "completed", desc: "Contemporary home with elegant design",                                   startDaysAgo: 600 },
  { name: "Mr. Madhu Residence",             code: "MMR001",  city: "Madhavaram, Chennai",     status: "completed", desc: "Modern residential construction with quality finishes",                  startDaysAgo: 540 },
  { name: "Mr. Prabin Residence",            code: "MPR001",  city: "Poombuhar Nagar, Chennai",status: "completed", desc: "Luxury villa with contemporary amenities",                               startDaysAgo: 480 },
  { name: "Mrs. Veni Residence",             code: "MVR001",  city: "Senthil Nagar, Chennai",  status: "completed", desc: "Elegant residential home with modern design",                            startDaysAgo: 420 },
  { name: "Mrs. Lathika Residence",          code: "MLR001",  city: "West Mambalam, Chennai",  status: "active",    desc: "Elegant residential project in the heart of West Mambalam",              startDaysAgo: 300 },
  { name: "Mr. Thomas Apartments",           code: "MTA001",  city: "Annapoorna Nagar, Chennai",status:"active",    desc: "Modern apartment complex featuring contemporary amenities",               startDaysAgo: 180 },
  { name: "Mr. Vasudevan Residence",         code: "MVD001",  city: "Poombukar Nagar, Chennai",status: "active",    desc: "Custom-designed luxury residence with premium finishes",                  startDaysAgo: 150 },
  { name: "Mr. Samuel Sathish Residence",    code: "MSS001",  city: "Vadaperumbakkam, Chennai", status: "active",    desc: "Modern residential villa featuring spacious interiors",                  startDaysAgo: 120 },
  { name: "Mr. Krishna Menon Residence",     code: "MKM001",  city: "Tiruvottriyur, Chennai",  status: "active",    desc: "Contemporary residential home at Tiruvottriyur",                         startDaysAgo: 90  },
  { name: "Mrs. Mala's Legacy Residential Apartment", code: "MLRA01", city: "Kolathur, Chennai", status: "active", desc: "Flagship residential apartment complex in Kolathur",                    startDaysAgo: 60  },
];

// ─── Reference Data ───────────────────────────────────────────────────────────
const PROFESSION_NAMES = [
  "Construction Labourer", "Mason / Bricklayer", "Carpenter", "Electrician",
  "Plumber", "Painter", "Tile Worker", "Welder", "Steel Fixer", "Helper",
];

const MATERIAL_CATEGORY_NAMES = [
  { name: "Cement & Concrete",  desc: "Cement bags, concrete mix, RMC" },
  { name: "Steel & Iron",       desc: "TMT bars, angle iron, plates" },
  { name: "Bricks & Blocks",    desc: "Red bricks, hollow blocks, AAC blocks" },
  { name: "Sand & Aggregates",  desc: "River sand, M-sand, coarse aggregate, granite" },
  { name: "Plumbing",           desc: "Pipes, fittings, valves, sanitary ware" },
  { name: "Electrical",         desc: "Wires, conduits, switches, panels" },
  { name: "Wood & Timber",      desc: "Plywood, teak wood, door frames" },
  { name: "Tiles & Flooring",   desc: "Ceramic tiles, vitrified tiles, granite slabs" },
  { name: "Paints & Chemicals", desc: "Emulsion paint, primer, admixtures, waterproofing" },
  { name: "Miscellaneous",      desc: "Scaffolding, tools, consumables" },
];

const EXPENSE_CATEGORY_NAMES = [
  { name: "Site Transportation", desc: "Local vehicle hire, auto, fuel for site trips" },
  { name: "Fuel & Generator",   desc: "Diesel, petrol for equipment and generators" },
  { name: "Equipment Rental",   desc: "JCB, concrete mixer, compactor hire charges" },
  { name: "Office Supplies",    desc: "Stationery, printing, site registers" },
  { name: "Safety & PPE",       desc: "Helmets, gloves, safety boots, harness" },
  { name: "Utilities",          desc: "Temporary electricity, water tanker charges" },
  { name: "Miscellaneous Site Expenses", desc: "Incidental and sundry site expenses" },
  { name: "Contractor Labour",  desc: "Sub-contractor and third-party labour charges" },
];

const MATERIAL_DATA = [
  { materialName: "OPC 53 Grade Cement",  catName: "Cement & Concrete",  unit: "Bags", rate: 370, tax: 28 },
  { materialName: "PPC Cement",           catName: "Cement & Concrete",  unit: "Bags", rate: 340, tax: 28 },
  { materialName: "Ready Mix Concrete M25",catName:"Cement & Concrete",  unit: "cu.m", rate: 5800, tax: 18 },
  { materialName: "TMT Fe500D 12mm Bars", catName: "Steel & Iron",       unit: "MT",   rate: 62000, tax: 18 },
  { materialName: "TMT Fe500D 8mm Bars",  catName: "Steel & Iron",       unit: "MT",   rate: 64000, tax: 18 },
  { materialName: "Red Clay Bricks",      catName: "Bricks & Blocks",    unit: "Nos",  rate: 7.5,   tax: 12 },
  { materialName: "AAC Blocks 6inch",     catName: "Bricks & Blocks",    unit: "cu.m", rate: 4200,  tax: 12 },
  { materialName: "River Sand",           catName: "Sand & Aggregates",  unit: "CFT",  rate: 38,    tax: 5 },
  { materialName: "M-Sand",              catName: "Sand & Aggregates",  unit: "CFT",  rate: 28,    tax: 5 },
  { materialName: "20mm Blue Metal",      catName: "Sand & Aggregates",  unit: "CFT",  rate: 32,    tax: 5 },
  { materialName: "CPVC Pipes 1inch",     catName: "Plumbing",           unit: "Mts",  rate: 145,   tax: 18 },
  { materialName: "GI Pipe 2inch",        catName: "Plumbing",           unit: "Mts",  rate: 320,   tax: 18 },
  { materialName: "2.5 sqmm FR Cable",    catName: "Electrical",         unit: "Mts",  rate: 42,    tax: 18 },
  { materialName: "PVC Conduit 25mm",     catName: "Electrical",         unit: "Mts",  rate: 28,    tax: 18 },
  { materialName: "Teak Wood Planks",     catName: "Wood & Timber",      unit: "CFT",  rate: 2200,  tax: 12 },
  { materialName: "Commercial Plywood 18mm",catName:"Wood & Timber",     unit: "Sht",  rate: 1650,  tax: 18 },
  { materialName: "Vitrified Tiles 2x2",  catName: "Tiles & Flooring",   unit: "Sqft", rate: 72,    tax: 18 },
  { materialName: "Ceramic Wall Tiles",   catName: "Tiles & Flooring",   unit: "Sqft", rate: 55,    tax: 18 },
  { materialName: "Exterior Emulsion",    catName: "Paints & Chemicals", unit: "Ltrs", rate: 185,   tax: 18 },
  { materialName: "Interior Emulsion",    catName: "Paints & Chemicals", unit: "Ltrs", rate: 145,   tax: 18 },
  { materialName: "Waterproofing Chemical",catName:"Paints & Chemicals", unit: "Ltrs", rate: 420,   tax: 18 },
];

const SUPPLIER_DATA = [
  { name: "Sri Murugan Building Materials",  phone: "9841001001", email: "srimurugan@gmail.com",   address: "Anna Nagar, Chennai" },
  { name: "Chennai TMT Steel Traders",       phone: "9841002002", email: "chennaisteel@gmail.com",  address: "Perambur, Chennai" },
  { name: "Vel Construction Supplies",       phone: "9841003003", email: "velconst@gmail.com",       address: "Ambattur, Chennai" },
  { name: "Ganesh Cement Agency",            phone: "9841004004", email: "ganeshcement@gmail.com",   address: "Kolathur, Chennai" },
  { name: "Lakshmi Sand & Aggregates",       phone: "9841005005", email: "lakshmisand@gmail.com",    address: "Madhavaram, Chennai" },
  { name: "Pioneer Tiles & Flooring",        phone: "9841006006", email: "pioneertiles@gmail.com",   address: "T. Nagar, Chennai" },
  { name: "Karthik Electrical Solutions",   phone: "9841007007", email: "karthikelectric@gmail.com","address": "Chromepet, Chennai" },
  { name: "Arun Plumbing & Sanitary Works", phone: "9841008008", email: "arunplumb@gmail.com",       address: "Tambaram, Chennai" },
  { name: "Royal Wood & Timber Mart",        phone: "9841009009", email: "royalwood@gmail.com",      address: "Poonamallee, Chennai" },
  { name: "Saravana Paint House",            phone: "9841010010", email: "sarapaints@gmail.com",     address: "Guindy, Chennai" },
];

const CONTRACTOR_NAMES = [
  "Direct / In-House", "Rajan Contractors", "Murugan Labour Contractors",
  "Sri Devi Works", "Prime Civil Contractors",
];

const PAYMENT_METHODS_EXPENSE = ["cash", "bankTransfer", "upi", "cheque", "card"];
const PAYMENT_METHODS_WORKER  = ["cash", "bankTransfer", "upi", "cheque"];

const EXPENSE_TITLES = {
  "Site Transportation": ["Site vehicle hire", "Auto charges for material transport", "Lorry hire for debris removal"],
  "Fuel & Generator": ["Diesel for generator", "Petrol for water pump", "Generator rental charges"],
  "Equipment Rental": ["JCB excavation charges", "Concrete mixer hire", "Compactor plate rent", "Crane charges"],
  "Office Supplies": ["Stationery and site registers", "Printing and photocopying", "Stamps and postal charges"],
  "Safety & PPE": ["Safety helmets purchase", "Gloves and goggles", "Safety nets installation"],
  "Utilities": ["Water tanker charges", "Temporary power connection", "Sewage disposal"],
  "Miscellaneous Site Expenses": ["Miscellaneous site expenses", "Sundry charges", "Petty cash expenditure"],
  "Contractor Labour": ["Sub-contractor charges", "Skilled labour hire", "Painting contractor advance"],
};

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // ── 1. Find super admin ────────────────────────────────────────────────────
  let superAdmin = await User.findOne({ role: 'super_admin', isDeleted: false });
  if (!superAdmin) {
    console.log('⚠️  No super_admin found – creating one...');
    superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: await bcrypt.hash('superadmin1234', 12),
      role: 'super_admin',
      status: 'active',
      verificationStatus: 'verified',
    });
    console.log('✅  Created super_admin');
  }
  const adminId = superAdmin._id;

  // ── 2. Professions ─────────────────────────────────────────────────────────
  console.log('\n📌  Seeding professions…');
  const professionMap = {};
  for (const pName of PROFESSION_NAMES) {
    let prof = await Profession.findOne({ name: pName, isDeleted: false });
    if (!prof) {
      prof = await Profession.create({ name: pName, status: 'active', createdBy: adminId });
      console.log(`  ✚ Created profession: ${pName}`);
    }
    professionMap[pName] = prof._id;
  }

  // ── 3. Material Categories ─────────────────────────────────────────────────
  console.log('\n📌  Seeding material categories…');
  const matCatMap = {};
  for (const mc of MATERIAL_CATEGORY_NAMES) {
    let cat = await MaterialCategory.findOne({ name: mc.name, isDeleted: false });
    if (!cat) {
      cat = await MaterialCategory.create({ name: mc.name, description: mc.desc, createdBy: adminId });
      console.log(`  ✚ Created material category: ${mc.name}`);
    }
    matCatMap[mc.name] = cat._id;
  }

  // ── 4. Expense Categories ──────────────────────────────────────────────────
  console.log('\n📌  Seeding expense categories…');
  const expCatMap = {};
  for (const ec of EXPENSE_CATEGORY_NAMES) {
    let cat = await ExpenseCategory.findOne({ name: ec.name, isDeleted: false });
    if (!cat) {
      cat = await ExpenseCategory.create({ name: ec.name, description: ec.desc, createdBy: adminId });
      console.log(`  ✚ Created expense category: ${ec.name}`);
    }
    expCatMap[ec.name] = cat._id;
  }

  // ── 5. Suppliers ───────────────────────────────────────────────────────────
  console.log('\n📌  Seeding suppliers…');
  const supplierIds = [];
  for (const sup of SUPPLIER_DATA) {
    let s = await Supplier.findOne({ name: sup.name, isDeleted: false });
    if (!s) {
      s = await Supplier.create({ ...sup, site: null, createdBy: adminId });
      console.log(`  ✚ Created supplier: ${sup.name}`);
    }
    supplierIds.push(s._id);
  }

  // ── 6. Sites + Site Admins ─────────────────────────────────────────────────
  console.log('\n📌  Seeding sites and site admins…');
  const siteObjects = [];

  for (let i = 0; i < SITES_DEF.length; i++) {
    const def = SITES_DEF[i];

    // --- Site Admin user ---
    const adminEmail = `siteadmin${String(i + 1).padStart(2, '0')}@mala.com`;
    let siteAdmin = await User.findOne({ email: adminEmail, isDeleted: false });
    if (!siteAdmin) {
      siteAdmin = await User.create({
        name: `Site Admin – ${def.name}`,
        email: adminEmail,
        phone: `98400${String(10000 + i * 11)}`,
        password: await bcrypt.hash('Admin@1234', 12),
        role: 'site_admin',
        status: 'active',
        verificationStatus: 'verified',
        designation: 'Site Manager',
        department: 'Construction',
        createdBy: adminId,
      });
      console.log(`  ✚ Created site admin: ${siteAdmin.email}`);
    }

    // --- Site ---
    let site = await Site.findOne({ code: def.code, isDeleted: false });
    if (!site) {
      site = await Site.create({
        name: def.name,
        code: def.code,
        address: def.city,
        city: def.city.split(',')[0].trim(),
        state: 'Tamil Nadu',
        country: 'India',
        startDate: daysAgo(def.startDaysAgo),
        status: def.status,
        description: def.desc,
        assignedSiteAdmin: siteAdmin._id,
        contactNumber: siteAdmin.phone,
        createdBy: adminId,
      });
      console.log(`  ✚ Created site: ${site.name}`);
    }

    // Update site admin's assignedSite
    if (!siteAdmin.assignedSite || String(siteAdmin.assignedSite) !== String(site._id)) {
      await User.findByIdAndUpdate(siteAdmin._id, { assignedSite: site._id });
    }

    siteObjects.push({ site, siteAdmin, def });
  }

  // ── 7. Workers ─────────────────────────────────────────────────────────────
  console.log('\n📌  Seeding workers…');
  const profNames = Object.keys(professionMap);
  const siteWorkerMap = {}; // siteId → Worker[]

  for (const { site, siteAdmin, def } of siteObjects) {
    const existingCount = await Worker.countDocuments({ site: site._id, isDeleted: false });
    if (existingCount >= 8) {
      console.log(`  ↷ Workers already exist for: ${site.name}`);
      siteWorkerMap[String(site._id)] = await Worker.find({ site: site._id, isDeleted: false }).limit(20).lean();
      continue;
    }

    const workers = [];
    const numWorkers = rand(8, 14);
    const firstNames = ["Rajan","Murugan","Selvam","Karthi","Suresh","Vinod","Bala","Siva","Anand","Prabhu","Kumar","Rajesh","Ganesh","Senthil","Velu","Arjun","Dinesh","Harish","Manoj","Pradeep","Sathish","Arun","Ramesh","Gopal","Vijay"];
    const lastNames = ["Kumar","Raj","Shankar","Mani","Das","Nathan","Pandian","Rajan","Selvan","Pillai","Naidu","Krishnan","Perumal","Subramanian","Iyer"];

    for (let w = 0; w < numWorkers; w++) {
      const profName = pick(profNames);
      const dailyWage = { "Construction Labourer": 700, "Mason / Bricklayer": 900, "Carpenter": 950, "Electrician": 1000, "Plumber": 900, "Painter": 800, "Tile Worker": 850, "Welder": 1050, "Steel Fixer": 950, "Helper": 600 }[profName] || 700;
      const wName = `${pick(firstNames)} ${pick(lastNames)}`;
      const wPhone = `9${rand(600000000, 999999999)}`;

      const worker = await Worker.create({
        site: site._id,
        name: wName,
        phone: wPhone,
        profession: professionMap[profName],
        dailyWage,
        joiningDate: daysAgo(rand(10, def.startDaysAgo - 10)),
        address: `${rand(1, 100)}, ${def.city}`,
        status: def.status === 'completed' ? 'inactive' : 'active',
        createdBy: siteAdmin._id,
      });
      workers.push(worker.toObject ? worker.toObject() : worker);
    }
    siteWorkerMap[String(site._id)] = workers;
    console.log(`  ✚ Created ${workers.length} workers for: ${site.name}`);
  }

  // ── 8. Attendance Records ──────────────────────────────────────────────────
  console.log('\n📌  Seeding attendance records…');
  for (const { site, siteAdmin, def } of siteObjects) {
    const existingAtt = await Attendance.countDocuments({ site: site._id, isDeleted: false });
    if (existingAtt > 50) {
      console.log(`  ↷ Attendance already seeded for: ${site.name}`);
      continue;
    }

    const workers = siteWorkerMap[String(site._id)] || [];
    if (!workers.length) continue;

    const daysBack = Math.min(def.startDaysAgo, 180);
    const endDate  = def.status === 'completed' ? daysAgo(60)  : daysAgo(0);
    const startDate= daysAgo(daysBack);
    const allDates = dateRange(startDate, endDate);
    let attCount = 0;

    for (const d of allDates) {
      // Only weekdays
      if (d.getDay() === 0) continue; // Skip Sundays

      const dayWorkers = workers.slice(0, rand(3, workers.length));
      for (const w of dayWorkers) {
        const statusOpts = ['present','present','present','halfDay','present'];
        const status = pick(statusOpts);
        const ot = status === 'present' && Math.random() > 0.85 ? rand(1, 3) : 0;
        const wage = w.dailyWage || 700;
        const labCost = status === 'halfDay' ? wage / 2 : wage;
        const otAmt   = ot * (wage / 8) * 1.5;
        const total   = labCost + otAmt;

        await Attendance.create({
          site:           site._id,
          date:           d,
          contractor:     pick(CONTRACTOR_NAMES),
          profession:     w.profession,
          professionName: profNames.find(p => String(professionMap[p]) === String(w.profession)) || 'Construction Labourer',
          workerName:     w.name,
          mobileNumber:   w.phone,
          gender:         'male',
          inTime:         '08:00',
          outTime:        status === 'halfDay' ? '13:00' : '18:00',
          workingHours:   status === 'halfDay' ? 5 : 9,
          status,
          dailyWage:      wage,
          overtimeHours:  ot,
          overtimeAmount: otAmt,
          totalAmount:    total,
          dailyLabourCost:total,
          markedBy:       siteAdmin._id,
        });
        attCount++;
      }
    }
    console.log(`  ✚ Created ${attCount} attendance records for: ${site.name}`);
  }

  // ── 9. Materials (Purchases) ───────────────────────────────────────────────
  console.log('\n📌  Seeding material purchases…');
  for (const { site, siteAdmin, def } of siteObjects) {
    const existingMat = await Material.countDocuments({ site: site._id, isDeleted: false });
    if (existingMat >= 20) {
      console.log(`  ↷ Materials already seeded for: ${site.name}`);
      continue;
    }

    const numPurchases = rand(20, 35);
    let matCount = 0;
    for (let m = 0; m < numPurchases; m++) {
      const matDef    = pick(MATERIAL_DATA);
      const catId     = matCatMap[matDef.catName];
      if (!catId) continue;

      const supplierId = pick(supplierIds);
      const qty       = randF(2, 100);
      const rate      = matDef.rate * randF(0.9, 1.1);
      const taxAmt    = rate * qty * (matDef.tax / 100);
      const transport = randF(500, 3000);
      const total     = rate * qty + taxAmt + transport;
      const daysOffset= rand(10, Math.min(def.startDaysAgo, 365));

      await Material.create({
        site:           site._id,
        invoiceNumber:  `INV-${site.code}-${String(m + 1).padStart(3, '0')}`,
        supplier:       supplierId,
        materialName:   matDef.materialName,
        category:       catId,
        quantity:       qty,
        unit:           matDef.unit,
        rate:           parseFloat(rate.toFixed(2)),
        tax:            matDef.tax,
        transportCharge:parseFloat(transport.toFixed(2)),
        discount:       Math.random() > 0.8 ? rand(1, 5) : 0,
        totalAmount:    parseFloat(total.toFixed(2)),
        date:           daysAgo(daysOffset),
        notes:          `Delivery for ${site.name} – ${matDef.materialName}`,
        createdBy:      siteAdmin._id,
      });
      matCount++;
    }
    console.log(`  ✚ Created ${matCount} material purchases for: ${site.name}`);
  }

  // ── 10. Expenses ───────────────────────────────────────────────────────────
  console.log('\n📌  Seeding expenses…');
  for (const { site, siteAdmin, def } of siteObjects) {
    const existingExp = await Expense.countDocuments({ site: site._id, isDeleted: false });
    if (existingExp >= 15) {
      console.log(`  ↷ Expenses already seeded for: ${site.name}`);
      continue;
    }

    const numExpenses = rand(18, 30);
    let expCount = 0;
    for (let e = 0; e < numExpenses; e++) {
      const catName = pick(Object.keys(expCatMap));
      const catId   = expCatMap[catName];
      const titles  = EXPENSE_TITLES[catName] || ["Site expense"];
      const statusOpts = ['pending','pending','approved','approved','approved','rejected'];
      const daysOffset = rand(5, Math.min(def.startDaysAgo, 365));

      await Expense.create({
        site:          site._id,
        title:         pick(titles),
        category:      catId,
        amount:        randF(500, 25000),
        vendor:        pick(["M/s Rajan Works", "Murugan Hire", "Vel Agencies", "Sri Devi Contractors", "Sathish Enterprises"]),
        description:   `Expense for ${site.name}`,
        date:          daysAgo(daysOffset),
        paymentMethod: pick(PAYMENT_METHODS_EXPENSE),
        status:        pick(statusOpts),
        createdBy:     siteAdmin._id,
      });
      expCount++;
    }
    console.log(`  ✚ Created ${expCount} expenses for: ${site.name}`);
  }

  // ── 11. Worker Payments ────────────────────────────────────────────────────
  console.log('\n📌  Seeding worker payments…');
  for (const { site, siteAdmin, def } of siteObjects) {
    const existingPay = await WorkerPayment.countDocuments({ site: site._id, isDeleted: false });
    if (existingPay >= 10) {
      console.log(`  ↷ Worker payments already seeded for: ${site.name}`);
      continue;
    }

    const workers = siteWorkerMap[String(site._id)] || [];
    let payCount = 0;

    for (const w of workers) {
      const numPayments = rand(2, 5);
      for (let p = 0; p < numPayments; p++) {
        const periodEndOffset   = rand(30, Math.min(def.startDaysAgo, 350));
        const periodStartOffset = periodEndOffset + 30;
        const workingDays = rand(20, 28);
        const wage        = w.dailyWage || 700;
        const ot          = randF(0, 3000);
        const bonus       = Math.random() > 0.8 ? rand(500, 2000) : 0;
        const advance     = Math.random() > 0.7 ? rand(1000, 5000) : 0;
        const deduction   = Math.random() > 0.9 ? rand(200, 1000)  : 0;
        const net         = (workingDays * wage) + ot + bonus - advance - deduction;
        const isPaid      = Math.random() > 0.2;

        await WorkerPayment.create({
          site:          site._id,
          worker:        w._id,
          periodStart:   daysAgo(periodStartOffset),
          periodEnd:     daysAgo(periodEndOffset),
          workingDays,
          dailyWage:     wage,
          overtimeAmount:parseFloat(ot.toFixed(2)),
          bonus,
          advance,
          deduction,
          netSalary:     parseFloat(net.toFixed(2)),
          status:        isPaid ? 'paid' : 'pending',
          paymentMethod: pick(PAYMENT_METHODS_WORKER),
          paidOn:        isPaid ? daysAgo(rand(1, periodEndOffset)) : null,
          remarks:       `Monthly payment – ${site.name}`,
          createdBy:     siteAdmin._id,
        });
        payCount++;
      }
    }
    console.log(`  ✚ Created ${payCount} worker payments for: ${site.name}`);
  }

  console.log('\n🎉  Dummy data seeding complete!\n');
  console.log('   Site Admin Login: siteadmin01@mala.com … siteadmin11@mala.com');
  console.log('   Password for all site admins: Admin@1234\n');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed error:', err);
  process.exit(1);
});
