const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production', // build indexes automatically only outside prod
  });

  try {
    const collections = await mongoose.connection.db.listCollections({ name: 'attendances' }).toArray();
    if (collections.length > 0) {
      const attendanceCol = mongoose.connection.db.collection('attendances');
      const indexes = await attendanceCol.indexes();
      const hasWorkerDateUnique = indexes.some((idx) => idx.name === 'worker_1_date_1');
      if (hasWorkerDateUnique) {
        await attendanceCol.dropIndex('worker_1_date_1');
        logger.info('Dropped legacy worker_1_date_1 unique index from attendances collection');
      }
    }
  } catch (err) {
    logger.warn(`Index cleanup note: ${err.message}`);
  }

  return mongoose.connection;
}

module.exports = connectDB;
