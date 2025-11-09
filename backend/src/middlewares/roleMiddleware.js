const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Check if user has one of the required roles
 * @param {Array} roles - Array of allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHelper.unauthorized(res, 'Authentication required');
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required: ${roles.join(', ')}`);
      return ResponseHelper.forbidden(res, 'You do not have permission to perform this action');
    }
    
    next();
  };
};

/**
 * Platform Admin Only
 */
const requirePlatformAdmin = requireRole('superadmin');

/**
 * Owner Only
 */
const requireOwner = requireRole('owner');

/**
 * Manager Only (includes Owner)
 */
const requireManager = requireRole('owner', 'manager');

/**
 * Staff Only (Manager + Employee)
 */
const requireStaff = requireRole('owner', 'manager', 'employee');

/**
 * Customer Only
 */
const requireCustomer = requireRole('customer');

/**
 * Check if user has specific permission (for employees)
 * @param {String} permission - Permission key to check
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHelper.unauthorized(res, 'Authentication required');
    }
    
    // Owners and managers have all permissions
    if (req.user.role === 'owner' || req.user.role === 'manager') {
      return next();
    }
    
    // Check employee permissions
    if (req.user.role === 'employee') {
      if (!req.permissions || !req.permissions[permission]) {
        logger.warn(`Permission denied for employee ${req.user.id}. Required: ${permission}`);
        return ResponseHelper.forbidden(res, 'You do not have permission to perform this action');
      }
      return next();
    }
    
    return ResponseHelper.forbidden(res, 'Invalid role for this operation');
  };
};

/**
 * Check if manager/employee can access specific restaurant
 */
const requireRestaurantAccess = (req, res, next) => {
  if (!req.user) {
    return ResponseHelper.unauthorized(res, 'Authentication required');
  }
  
  // Owners have access to all their restaurants
  if (req.user.role === 'owner') {
    return next();
  }
  
  // Get restaurant ID from request (params, body, or query)
  const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
  
  if (!requestedRestaurantId) {
    return ResponseHelper.error(res, 400, 'Restaurant ID is required');
  }
  
  // Check if manager has access to this restaurant
  if (req.user.role === 'manager') {
    if (!req.assignedRestaurants || !req.assignedRestaurants.includes(requestedRestaurantId)) {
      logger.warn(`Manager ${req.user.id} attempted to access unauthorized restaurant ${requestedRestaurantId}`);
      return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
    }
    return next();
  }
  
  // Check if employee belongs to this restaurant
  if (req.user.role === 'employee') {
    if (req.restaurantId !== requestedRestaurantId) {
      logger.warn(`Employee ${req.user.id} attempted to access unauthorized restaurant ${requestedRestaurantId}`);
      return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
    }
    return next();
  }
  
  // Customer access (only their registered restaurant)
  if (req.user.role === 'customer') {
    if (req.restaurantId !== requestedRestaurantId) {
      return ResponseHelper.forbidden(res, 'You can only access your registered restaurant');
    }
    return next();
  }
  
  return ResponseHelper.forbidden(res, 'Invalid role for restaurant access');
};

/**
 * Check if user owns the resource (for customer-facing endpoints)
 * Used for orders, reservations, etc.
 */
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ResponseHelper.unauthorized(res, 'Authentication required');
    }
    
    // Admin roles can access all resources
    if (['owner', 'manager', 'employee'].includes(req.user.role)) {
      return next();
    }
    
    // For customers, check ownership
    if (req.user.role === 'customer') {
      const resourceId = req.params.id;
      
      if (!resourceId) {
        return ResponseHelper.error(res, 400, 'Resource ID is required');
      }
      
      try {
        const { getOwnerModel } = require('../models');
        const Model = getOwnerModel(req.ownerId, resourceType);
        
        const resource = await Model.findById(resourceId);
        
        if (!resource) {
          return ResponseHelper.notFound(res, `${resourceType} not found`);
        }
        
        // Check if customer owns this resource
        const customerIdField = resource.customer?.userId || resource.userId;
        
        if (customerIdField?.toString() !== req.user.id) {
          logger.warn(`Customer ${req.user.id} attempted to access unauthorized ${resourceType} ${resourceId}`);
          return ResponseHelper.forbidden(res, 'You do not have access to this resource');
        }
        
        // Attach resource to request for later use
        req.resource = resource;
        next();
        
      } catch (error) {
        logger.error(`Ownership check error for ${resourceType}:`, error);
        return ResponseHelper.error(res, 500, 'Failed to verify resource ownership');
      }
    } else {
      return ResponseHelper.forbidden(res, 'Invalid role');
    }
  };
};

/**
 * Check if employee has specific employee type
 */
const requireEmployeeType = (...types) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseHelper.unauthorized(res, 'Authentication required');
    }
    
    // Owner and manager have all access
    if (req.user.role === 'owner' || req.user.role === 'manager') {
      return next();
    }
    
    if (req.user.role === 'employee') {
      if (!types.includes(req.employeeType)) {
        logger.warn(`Employee type mismatch for ${req.user.id}. Required: ${types.join(', ')}, Has: ${req.employeeType}`);
        return ResponseHelper.forbidden(res, 'This action is not allowed for your employee type');
      }
      return next();
    }
    
    return ResponseHelper.forbidden(res, 'Invalid role');
  };
};

module.exports = {
  requireRole,
  requirePlatformAdmin,
  requireOwner,
  requireManager,
  requireStaff,
  requireCustomer,
  requirePermission,
  requireRestaurantAccess,
  requireOwnership,
  requireEmployeeType
};