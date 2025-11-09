const { verifyAccessToken } = require('../config/jwt');
const ResponseHelper = require('../utils/responseHelper');
const { PlatformAdmin, Owner, getOwnerModel } = require('../models');
// const { PlatformAdmin, Owner, getOwnerModel } = require('../models/Index');
const logger = require('../utils/logger');

/**
 * Verify JWT Token and attach user to request
 * Works for all user types: PlatformAdmin, Owner, Manager, Employee, Customer
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return ResponseHelper.unauthorized(res, 'Authentication required. Please login.');
    }
    
    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.message.includes('expired')) {
        return ResponseHelper.unauthorized(res, 'Token expired. Please login again.');
      }
      return ResponseHelper.unauthorized(res, 'Invalid token. Please login again.');
    }
    
    // Extract user info from token
    const { userId, role, ownerId } = decoded;
    
    let user;
    
    // Fetch user based on role
    switch (role) {
      case 'superadmin':
        user = await PlatformAdmin.findById(userId).select('-password');
        if (!user || !user.isActive) {
          return ResponseHelper.unauthorized(res, 'User not found or inactive');
        }
        break;
        
      case 'owner':
        user = await Owner.findById(userId).select('-password');
        if (!user || !user.isActive) {
          return ResponseHelper.unauthorized(res, 'User not found or inactive');
        }
        req.ownerId = userId; // Owner's ID is their own ID
        break;
        
      case 'manager':
        if (!ownerId) {
          return ResponseHelper.unauthorized(res, 'Invalid token data');
        }
        const ManagerModel = getOwnerModel(ownerId, 'Manager');
        user = await ManagerModel.findById(userId).select('-password').populate('assignedRestaurants');
        if (!user || !user.isActive) {
          return ResponseHelper.unauthorized(res, 'User not found or inactive');
        }
        req.ownerId = ownerId;
        req.assignedRestaurants = user.assignedRestaurants.map(r => r._id.toString());
        break;
        
      case 'employee':
        if (!ownerId) {
          return ResponseHelper.unauthorized(res, 'Invalid token data');
        }
        const EmployeeModel = getOwnerModel(ownerId, 'Employee');
        user = await EmployeeModel.findById(userId).select('-password');
        if (!user || !user.isActive) {
          return ResponseHelper.unauthorized(res, 'User not found or inactive');
        }
        req.ownerId = ownerId;
        req.restaurantId = user.restaurantId.toString();
        req.employeeType = user.employeeType;
        req.permissions = user.permissions;
        break;
        
      case 'customer':
        if (!ownerId) {
          return ResponseHelper.unauthorized(res, 'Invalid token data');
        }
        const CustomerModel = getOwnerModel(ownerId, 'Customer');
        user = await CustomerModel.findById(userId).select('-password');
        if (!user || !user.isActive) {
          return ResponseHelper.unauthorized(res, 'User not found or inactive');
        }
        if (user.isBlocked) {
          return ResponseHelper.forbidden(res, 'Your account has been blocked. Please contact support.');
        }
        req.ownerId = ownerId;
        req.restaurantId = user.restaurantId.toString();
        break;
        
      default:
        return ResponseHelper.unauthorized(res, 'Invalid user role');
    }
    
    // Attach user to request
    req.user = {
      id: userId,
      role,
      email: user.email,
      fullName: user.fullName,
      ...user.toObject()
    };
    
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    return ResponseHelper.error(res, 500, 'Authentication failed');
  }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both authenticated and guest users
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      // No token provided, continue as guest
      req.user = null;
      return next();
    }
    
    // Token provided, try to authenticate
    return authenticate(req, res, next);
    
  } catch (error) {
    // If authentication fails, continue as guest
    req.user = null;
    next();
  }
};

/**
 * Refresh Token Handler
 * Generates new access token from refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return ResponseHelper.unauthorized(res, 'Refresh token required');
    }
    
    const { verifyRefreshToken, generateAccessToken } = require('../config/jwt');
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return ResponseHelper.unauthorized(res, 'Invalid refresh token');
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      role: decoded.role,
      ownerId: decoded.ownerId
    });
    
    return ResponseHelper.success(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });
    
  } catch (error) {
    logger.error('Refresh token error:', error);
    return ResponseHelper.error(res, 500, 'Token refresh failed');
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  refreshToken
};