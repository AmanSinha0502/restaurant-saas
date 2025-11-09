const Joi = require('joi');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {String} property - Property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Show all errors
      stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Validation error:', { errors, data: req[property] });
      
      return ResponseHelper.validationError(res, errors);
    }
    
    // Replace request data with validated and sanitized data
    req[property] = value;
    
    next();
  };
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return ResponseHelper.error(res, 400, `${paramName} is required`);
    }
    
    // MongoDB ObjectId is 24 hex characters
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    
    if (!objectIdPattern.test(id)) {
      return ResponseHelper.error(res, 400, `Invalid ${paramName} format`);
    }
    
    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });
  
  const { error, value } = schema.validate(req.query, { stripUnknown: true });
  
  if (error) {
    return ResponseHelper.validationError(res, error.details);
  }
  
  // Attach pagination params to request
  req.pagination = {
    page: value.page,
    limit: value.limit,
    skip: (value.page - 1) * value.limit,
    sortBy: value.sortBy,
    sortOrder: value.sortOrder === 'asc' ? 1 : -1
  };
  
  next();
};

/**
 * Validate date range
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return ResponseHelper.error(res, 400, 'Invalid startDate format. Use YYYY-MM-DD');
    }
    req.query.startDate = start;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return ResponseHelper.error(res, 400, 'Invalid endDate format. Use YYYY-MM-DD');
    }
    req.query.endDate = end;
  }
  
  if (startDate && endDate && req.query.startDate > req.query.endDate) {
    return ResponseHelper.error(res, 400, 'startDate must be before endDate');
  }
  
  next();
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove script tags and event handlers
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (let key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

/**
 * Common validation schemas
 */
const commonSchemas = {
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).required(),
  name: Joi.string().min(2).max(100).trim().required(),
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  price: Joi.number().min(0).max(1000000),
  quantity: Joi.number().integer().min(1).max(1000),
  date: Joi.date().iso(),
  url: Joi.string().uri(),
  enum: (values) => Joi.string().valid(...values)
};

/**
 * File upload validation
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    required = false
  } = options;
  
  return (req, res, next) => {
    if (!req.file && !req.files) {
      if (required) {
        return ResponseHelper.error(res, 400, 'File upload is required');
      }
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (let file of files) {
      // Check file size
      if (file.size > maxSize) {
        return ResponseHelper.error(res, 400, `File size must be less than ${maxSize / (1024 * 1024)}MB`);
      }
      
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return ResponseHelper.error(res, 400, `File type must be one of: ${allowedTypes.join(', ')}`);
      }
    }
    
    next();
  };
};

/**
 * Validate request contains required fields
 */
const requireFields = (...fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (let field of fields) {
      const value = req.body[field] || req.query[field] || req.params[field];
      
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return ResponseHelper.error(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
    }
    
    next();
  };
};

module.exports = {
  validate,
  validateObjectId,
  validatePagination,
  validateDateRange,
  sanitizeInput,
  validateFileUpload,
  requireFields,
  commonSchemas
};