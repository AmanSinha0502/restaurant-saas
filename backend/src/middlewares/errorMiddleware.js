const logger = require('../utils/logger');
const ResponseHelper = require('../utils/responseHelper');

/**
 * Custom Error Class with status code
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle specific MongoDB errors
 */
const handleMongoError = (error) => {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new AppError(`${field} already exists. Please use a different value.`, 400);
  }
  
  // Validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new AppError('Validation failed', 400, errors);
  }
  
  // Cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
  }
  
  return error;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please login again.', 401);
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expired. Please login again.', 401);
  }
  
  return error;
};

/**
 * Handle Mongoose connection errors
 */
const handleMongooseConnectionError = (error) => {
  if (error.name === 'MongoNetworkError') {
    return new AppError('Database connection failed. Please try again.', 503);
  }
  
  if (error.name === 'MongooseServerSelectionError') {
    return new AppError('Database server unavailable. Please try again later.', 503);
  }
  
  return error;
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;
  
  // Log error
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Handle different types of errors
  error = handleMongoError(error);
  error = handleJWTError(error);
  error = handleMongooseConnectionError(error);
  
  // Determine status code
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  // Send error response
  const response = {
    success: false,
    message
  };
  
  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  // Include validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! Shutting down gracefully...', err);
    
    // Close server gracefully
    server.close(() => {
      process.exit(1);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown...');
      process.exit(1);
    }, 10000);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = (server) => {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`${signal} received. Closing server gracefully...`);
      
      server.close(() => {
        logger.info('Server closed. Process terminating...');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout...');
        process.exit(1);
      }, 30000);
    });
  });
};

/**
 * Rate Limit Error Handler
 */
const rateLimitErrorHandler = (req, res, next) => {
  return ResponseHelper.error(res, 429, 'Too many requests. Please try again later.');
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  gracefulShutdown,
  rateLimitErrorHandler
};