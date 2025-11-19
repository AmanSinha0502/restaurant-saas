const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4 // Use IPv4
    };

    await mongoose.connect(process.env.MONGO_URI, options);

    logger.info('✅ MongoDB Connected Successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// Function to connect to owner-specific database
const connectOwnerDB = (ownerId) => {
  if (!ownerId) throw new Error('ownerId is required to connect owner DB');

  const dbName = `owner_${ownerId}`;
  // Always return a cached tenant connection
  return mongoose.connection.useDb(dbName, { useCache: true });
};



// Get platform main database connection
const getPlatformDB = () => {
  return mongoose.connection.useDb('platform_main', { useCache: true });
};



module.exports = {
  connectDB,
  connectOwnerDB,
  getPlatformDB,
};