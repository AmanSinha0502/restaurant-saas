const ResponseHelper = require('../utils/responseHelper');
const { getOwnerModels } = require('../models');
const logger = require('../utils/logger');

/**
 * Attach owner-specific models to request
 * This middleware should be used after authentication middleware
 */
const attachOwnerModels = (req, res, next) => {
  try {
    // Check if ownerId is available from auth middleware
    if (!req.ownerId) {
      // For platform admin, they don't have ownerId
      if (req.user && req.user.role === 'superadmin') {
        return next();
      }
      
      return ResponseHelper.error(res, 400, 'Owner context is required');
    }
    
    // Attach all models for this owner
    req.models = getOwnerModels(req.ownerId);
    
    next();
  } catch (error) {
    logger.error('Error attaching owner models:', error);
    return ResponseHelper.error(res, 500, 'Failed to initialize data context');
  }
};

/**
 * Ensure restaurantId is set in query/body for filtering
 * Prevents data leakage between branches
 */
const enforceRestaurantFilter = (req, res, next) => {
  try {
    // Skip for owners (they can access all restaurants)
    if (req.user && req.user.role === 'owner') {
      return next();
    }
    
    // For managers, ensure they only access assigned restaurants
    if (req.user && req.user.role === 'manager') {
      const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
      
      if (requestedRestaurantId) {
        if (!req.assignedRestaurants.includes(requestedRestaurantId)) {
          return ResponseHelper.forbidden(res, 'Access to this restaurant is not allowed');
        }
      }
      
      return next();
    }
    
    // For employees and customers, enforce their specific restaurant
    if (req.user && (req.user.role === 'employee' || req.user.role === 'customer')) {
      // Automatically set restaurantId in query/body
      if (!req.body.restaurantId) {
        req.body.restaurantId = req.restaurantId;
      }
      
      if (!req.query.restaurantId) {
        req.query.restaurantId = req.restaurantId;
      }
      
      // Verify if trying to access different restaurant
      const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
      
      if (requestedRestaurantId && requestedRestaurantId !== req.restaurantId) {
        logger.warn(`${req.user.role} ${req.user.id} attempted to access unauthorized restaurant ${requestedRestaurantId}`);
        return ResponseHelper.forbidden(res, 'You can only access your assigned restaurant');
      }
      
      return next();
    }
    
    next();
  } catch (error) {
    logger.error('Error enforcing restaurant filter:', error);
    return ResponseHelper.error(res, 500, 'Failed to apply data filter');
  }
};

/**
 * Add restaurant filter to MongoDB queries automatically
 * Modifies the query object to include restaurantId
 */
const autoFilterByRestaurant = (req, res, next) => {
  try {
    // Skip for owners (they can query all restaurants)
    if (req.user && req.user.role === 'owner') {
      return next();
    }
    
    // For managers, they can query multiple assigned restaurants
    if (req.user && req.user.role === 'manager' && req.assignedRestaurants) {
      // If specific restaurant requested, use that
      const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
      
      if (requestedRestaurantId) {
        req.queryFilter = { restaurantId: requestedRestaurantId };
      } else {
        // Otherwise, filter by all assigned restaurants
        req.queryFilter = { restaurantId: { $in: req.assignedRestaurants } };
      }
      
      return next();
    }
    
    // For employees and customers, filter by their restaurant only
    if (req.user && (req.user.role === 'employee' || req.user.role === 'customer') && req.restaurantId) {
      req.queryFilter = { restaurantId: req.restaurantId };
      return next();
    }
    
    next();
  } catch (error) {
    logger.error('Error applying auto filter:', error);
    return ResponseHelper.error(res, 500, 'Failed to apply query filter');
  }
};

/**
 * Validate that ownerId in request matches authenticated user's ownerId
 * Prevents cross-owner data access
 */
const validateOwnerContext = (req, res, next) => {
  try {
    // Platform admin can access any owner's data
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }
    
    // Check if ownerId in request matches user's ownerId
    const requestedOwnerId = req.params.ownerId || req.body.ownerId || req.query.ownerId;
    
    if (requestedOwnerId && requestedOwnerId !== req.ownerId) {
      logger.warn(`User ${req.user.id} attempted to access data for different owner ${requestedOwnerId}`);
      return ResponseHelper.forbidden(res, 'Cannot access data for different owner');
    }
    
    next();
  } catch (error) {
    logger.error('Error validating owner context:', error);
    return ResponseHelper.error(res, 500, 'Failed to validate owner context');
  }
};

/**
 * Ensure query results are filtered by tenant
 * Use this for read operations
 */
const applyTenantFilter = (modelName) => {
  return async (req, res, next) => {
    try {
      if (!req.models || !req.models[modelName]) {
        return ResponseHelper.error(res, 500, 'Model not initialized');
      }
      
      // Store original find methods
      const Model = req.models[modelName];
      const originalFind = Model.find;
      const originalFindOne = Model.findOne;
      const originalFindById = Model.findById;
      
      // Override find to include filter
      Model.find = function(conditions = {}) {
        if (req.queryFilter) {
          conditions = { ...conditions, ...req.queryFilter };
        }
        return originalFind.call(this, conditions);
      };
      
      // Override findOne to include filter
      Model.findOne = function(conditions = {}) {
        if (req.queryFilter) {
          conditions = { ...conditions, ...req.queryFilter };
        }
        return originalFindOne.call(this, conditions);
      };
      
      // Store in request for cleanup
      req._tenantFilterApplied = {
        Model,
        originalFind,
        originalFindOne,
        originalFindById
      };
      
      next();
    } catch (error) {
      logger.error('Error applying tenant filter:', error);
      return ResponseHelper.error(res, 500, 'Failed to apply tenant filter');
    }
  };
};

/**
 * Cleanup tenant filter after request
 * Restores original methods
 */
const cleanupTenantFilter = (req, res, next) => {
  if (req._tenantFilterApplied) {
    const { Model, originalFind, originalFindOne, originalFindById } = req._tenantFilterApplied;
    Model.find = originalFind;
    Model.findOne = originalFindOne;
    Model.findById = originalFindById;
  }
  next();
};

module.exports = {
  attachOwnerModels,
  enforceRestaurantFilter,
  autoFilterByRestaurant,
  validateOwnerContext,
  applyTenantFilter,
  cleanupTenantFilter
};