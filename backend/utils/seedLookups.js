const Profession = require('../models/Profession');
const MaterialCategory = require('../models/MaterialCategory');
const ExpenseCategory = require('../models/ExpenseCategory');
const logger = require('./logger');

const PROFESSIONS = [
  'Mason', 'Carpenter', 'Electrician', 'Painter', 'Welder',
  'Steel Fixer', 'Tile Worker', 'Labour', 'Plumber', 'Helper',
];

const MATERIAL_CATEGORIES = [
  'Cement', 'Steel', 'Sand', 'Aggregate', 'Bricks', 'Tiles',
  'Paint', 'Plumbing', 'Electrical', 'Hardware', 'Miscellaneous',
];

const EXPENSE_CATEGORIES = [
  'Fuel', 'Machinery', 'Accommodation', 'Electricity', 'Food',
  'Transport', 'Office', 'Repair', 'Miscellaneous',
];

async function seedLookups() {
  for (const name of PROFESSIONS) {
    await Profession.findOneAndUpdate(
      { name },
      { name, isActive: true, isDeleted: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const name of MATERIAL_CATEGORIES) {
    await MaterialCategory.findOneAndUpdate(
      { name },
      { name, isActive: true, isDeleted: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const name of EXPENSE_CATEGORIES) {
    await ExpenseCategory.findOneAndUpdate(
      { name },
      { name, isActive: true, isDeleted: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  logger.info('Lookup data (professions, categories) seeded');
}

module.exports = { seedLookups };
