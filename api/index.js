const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('../backend/config/db');
const app = require('../backend/app');

// Load backend .env when running locally from the monorepo root.
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

let dbConnection;

async function ensureDbConnection() {
  if (!dbConnection) {
    dbConnection = connectDB().catch((err) => {
      dbConnection = null;
      throw err;
    });
  }
  return dbConnection;
}

module.exports = async (req, res) => {
  try {
    await ensureDbConnection();
    app(req, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Database initialization failed.' });
  }
};
