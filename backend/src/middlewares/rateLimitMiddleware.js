const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Redis Store for Rate Limiting (distributed rate limiting)
 */
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
    // windowMs in milliseconds; default to 60s
    this.windowMs = options.windowMs || 60 * 1000;
    this.expirySeconds = Math.max(1, Math.ceil(this.windowMs / 1000));
  }

  async increment(key) {
    const redisKey = this.prefix + key;

    try {
      const current = await redis.incr(redisKey);

      if (current === 1) {
        // First request, set expiry according to configured window
        await redis.expire(redisKey, this.expirySeconds);
      }

      let ttl = await redis.ttl(redisKey);
      // if ttl is -1 (no expiry) or -2 (key doesn't exist), fallback to expirySeconds
      if (typeof ttl !== 'number' || ttl < 0) ttl = this.expirySeconds;

      return {
        totalHits: current,
        resetTime: new Date(Date.now() + ttl * 1000)
      };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      // Fallback to allowing request if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + 60000)
      };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    try {
      await redis.decr(redisKey);
    } catch (error) {
      logger.error('Redis decrement error:', error);
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    try {
      await redis.del(redisKey);
    } catch (error) {
      logger.error('Redis reset error:', error);
    }
  }
}

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis if available
  store: process.env.REDIS_HOST
    ? new RedisStore({ prefix: 'rl:api:', windowMs: 15 * 60 * 1000 })
    : undefined,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
    });
  }
});

/**
 * Strict Rate Limiter for Authentication Routes
 * 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: 'rl:auth:' }) : undefined,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
    });
  }
});

/**
 * Rate Limiter for Order Creation
 * 10 orders per 5 minutes per user
 */
const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req)}`;
  },
  message: {
    success: false,
    message: 'Too many orders placed. Please try again in a few minutes.'
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: 'rl:order:', windowMs: 5 * 60 * 1000 }) : undefined
});

/**
 * Rate Limiter for Password Reset
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after an hour.'
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: 'rl:reset:' }) : undefined
});

/**
 * Rate Limiter for OTP Requests
 * 5 OTP requests per 10 minutes per phone number
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  keyGenerator: (req) => {
    return req.body.phone || ipKeyGenerator(req);
  },
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.'
  },
  store: process.env.REDIS_HOST ? new RedisStore({ prefix: 'rl:otp:' }) : undefined
});

/**
 * Dynamic Rate Limiter
 * Creates custom rate limiter with specific settings
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests. Please try again later.',
    keyGenerator = null,
    skipSuccessfulRequests = false,
    prefix = 'rl:custom:'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
  keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req)),
    skipSuccessfulRequests,
  store: process.env.REDIS_HOST ? new RedisStore({ prefix, windowMs }) : undefined,
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Rate Limiter by User Role
 * Different limits for different user types
 */
const roleBasedLimiter = (limits = {}) => {
  const defaultLimits = {
    customer: { windowMs: 15 * 60 * 1000, max: 50 },
    employee: { windowMs: 15 * 60 * 1000, max: 200 },
    manager: { windowMs: 15 * 60 * 1000, max: 500 },
    owner: { windowMs: 15 * 60 * 1000, max: 1000 },
    superadmin: { windowMs: 15 * 60 * 1000, max: 10000 }
  };

  const mergedLimits = { ...defaultLimits, ...limits };

  return (req, res, next) => {
    const userRole = req.user?.role || 'customer';
    const roleLimit = mergedLimits[userRole];

    const limiter = rateLimit({
      windowMs: roleLimit.windowMs,
      max: roleLimit.max,
      // keyGenerator: (req) => `${req.user?.id || req.ip}:${userRole}`,
      keyGenerator: (req) => {
        const ip = ipKeyGenerator(req);
        return `${req.user?.id || ip}:${userRole}`;
      },
      message: {
        success: false,
        message: `Rate limit exceeded for ${userRole}. Please try again later.`
      },
      store: process.env.REDIS_HOST ? new RedisStore({ prefix: `rl:role:${userRole}:`, windowMs: roleLimit.windowMs }) : undefined
    });

    return limiter(req, res, next);
  };
};

/**
 * Conditional Rate Limiter
 * Apply rate limiting only if condition is met
 */
const conditionalLimiter = (condition, limiter) => {
  return (req, res, next) => {
    if (condition(req)) {
      return limiter(req, res, next);
    }
    next();
  };
};

/**
 * Bypass Rate Limit for Specific IPs (whitelist)
 */
const bypassForWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    const remoteIp = ipKeyGenerator(req);
    if (whitelist.includes(remoteIp)) {
      return next();
    }
    return next();
  };
};

module.exports = {
  apiLimiter,
  authLimiter,
  orderLimiter,
  passwordResetLimiter,
  otpLimiter,
  createRateLimiter,
  roleBasedLimiter,
  conditionalLimiter,
  bypassForWhitelist,
  RedisStore
};