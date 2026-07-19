const Profession = require('../models/Profession');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory = require('../models/ExpenseCategory');
const Supplier = require('../models/Supplier');
const Site = require('../models/Site');
const ApiError = require('../utils/ApiError');

async function listProfessions() {
  return Profession.find({ isDeleted: false }).sort({ name: 1 }).select('name');
}

async function listMaterialCategories() {
  return MaterialCategory.find({ isDeleted: false }).sort({ name: 1 }).select('name');
}

async function listExpenseCategories() {
  return ExpenseCategory.find({ isDeleted: false }).sort({ name: 1 }).select('name');
}

async function listSuppliers(siteId) {
  const query = siteId ? { $or: [{ site: siteId }, { site: null }] } : {};
  return Supplier.find({ ...query, isDeleted: false }).sort({ name: 1 }).select('name contactNumber site');
}

async function findOrCreateSupplier(name, siteId, actorId) {
  const trimmed = name.trim();
  let supplier = await Supplier.findOne({
    name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    $or: [{ site: siteId }, { site: null }],
    isDeleted: false,
  });

  if (!supplier) {
    supplier = await Supplier.create({
      name: trimmed,
      site: siteId,
      createdBy: actorId,
    });
  }
  return supplier;
}

async function listActiveSites() {
  return Site.find({ status: 'active', isDeleted: false }).sort({ name: 1 }).select('name code');
}

async function createProfession(name, actorId) {
  const trimmed = name.trim();
  const existing = await Profession.findOne({
    name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    isDeleted: false,
  });
  if (existing) {
    throw ApiError.conflict('A profession with this name already exists.');
  }

  return Profession.create({
    name: trimmed,
    createdBy: actorId,
  });
}

async function createMaterialCategory(name, actorId) {
  const trimmed = name.trim();
  const existing = await MaterialCategory.findOne({
    name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    isDeleted: false,
  });
  if (existing) {
    throw ApiError.conflict('A material category with this name already exists.');
  }

  return MaterialCategory.create({
    name: trimmed,
    createdBy: actorId,
  });
}

async function createExpenseCategory(name, actorId) {
  const trimmed = name.trim();
  const existing = await ExpenseCategory.findOne({
    name: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    isDeleted: false,
  });
  if (existing) {
    throw ApiError.conflict('An expense category with this name already exists.');
  }

  return ExpenseCategory.create({
    name: trimmed,
    createdBy: actorId,
  });
}

module.exports = {
  listProfessions,
  listMaterialCategories,
  listExpenseCategories,
  listSuppliers,
  findOrCreateSupplier,
  listActiveSites,
  createProfession,
  createMaterialCategory,
  createExpenseCategory,
};
