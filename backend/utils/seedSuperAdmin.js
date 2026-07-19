/**
 * Run with: npm run seed:admin
 * Creates the first Super Admin from env vars. Safe to re-run - it's a no-op
 * if a super_admin with that email already exists.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const logger = require('./logger');

async function seed() {
  const name = process.env.SEED_SUPER_ADMIN_NAME;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error('SEED_SUPER_ADMIN_NAME, _EMAIL, and _PASSWORD must be set in .env');
  }

  await mongoose.connect(env.mongoUri);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    logger.info(`Super Admin already exists for ${email}, skipping.`);
  } else {
    await User.create({ name, email, password, role: 'super_admin', status: 'active' });
    logger.info(`Super Admin created: ${email}`);
  }

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  });
