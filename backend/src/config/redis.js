const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

// Handle Redis events
redis.on('connect', () => {
  logger.info('✅ Redis Connected Successfully');
});

redis.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err.message);
});

redis.on('reconnecting', () => {
  logger.warn('⚠️ Redis Reconnecting...');
});

// Helper functions for common operations
const cacheHelper = {
  // Get data from cache
  get: async (key) => {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  // Set data in cache with expiry
  set: async (key, value, expiryInSeconds = 3600) => {
    try {
      await redis.setex(key, expiryInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  // Delete from cache
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  // Delete multiple keys by pattern
  delPattern: async (pattern) => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis DEL pattern error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }
};

module.exports = {
  redis,
  cacheHelper
};