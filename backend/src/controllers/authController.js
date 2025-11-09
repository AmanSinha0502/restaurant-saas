const { PlatformAdmin, Owner, getOwnerModel } = require('../models');
const { generateTokenPair } = require('../config/jwt');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * CUSTOMER AUTHENTICATION
 */

/**
 * Customer Registration
 * POST /api/auth/customer/register
 */
const customerRegister = async (req, res) => {
  try {
    const { fullName, email, phone, password, restaurantId } = req.body;
    
    // Get Customer model for specific restaurant
    const ownerId = req.body.ownerId; // Will be passed from frontend based on restaurant
    
    if (!ownerId) {
      return ResponseHelper.error(res, 400, 'Restaurant owner ID is required');
    }
    
    const Customer = getOwnerModel(ownerId, 'Customer');
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      restaurantId,
      $or: [{ email }, { phone }]
    });
    
    if (existingCustomer) {
      return ResponseHelper.error(res, 400, 'Customer with this email or phone already exists');
    }
    
    // Create customer
    const customer = await Customer.create({
      restaurantId,
      fullName,
      email,
      phone,
      password
    });
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: customer._id,
      role: 'customer',
      ownerId
    });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    logger.info(`Customer registered: ${customer._id}`);
    
    return ResponseHelper.created(res, 'Registration successful', {
      accessToken: tokens.accessToken,
      user: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        role: 'customer',
        restaurantId: customer.restaurantId
      }
    });
  } catch (error) {
    logger.error('Customer registration error:', error);
    return ResponseHelper.error(res, 500, 'Registration failed');
  }
};

/**
 * Customer Login
 * POST /api/auth/customer/login
 */
const customerLogin = async (req, res) => {
  try {
    const { email, password, restaurantId, ownerId } = req.body;
    
    if (!ownerId) {
      return ResponseHelper.error(res, 400, 'Restaurant owner ID is required');
    }
    
    const Customer = getOwnerModel(ownerId, 'Customer');
    
    // Find customer with password field
    const customer = await Customer.findOne({ email, restaurantId }).select('+password');
    
    if (!customer) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // Check if account is active
    if (!customer.isActive) {
      return ResponseHelper.forbidden(res, 'Your account has been deactivated');
    }
    
    // Check if account is blocked
    if (customer.isBlocked) {
      return ResponseHelper.forbidden(res, 'Your account has been blocked. Please contact support.');
    }
    
    // Verify password
    const isPasswordValid = await customer.comparePassword(password);
    
    if (!isPasswordValid) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: customer._id,
      role: 'customer',
      ownerId
    });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    logger.info(`Customer logged in: ${customer._id}`);
    
    return ResponseHelper.success(res, 200, 'Login successful', {
      accessToken: tokens.accessToken,
      user: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        role: 'customer',
        restaurantId: customer.restaurantId,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyTier: customer.loyaltyTier
      }
    });
  } catch (error) {
    logger.error('Customer login error:', error);
    return ResponseHelper.error(res, 500, 'Login failed');
  }
};

/**
 * ADMIN AUTHENTICATION (Owner, Manager, Employee)
 */

/**
 * Admin Login (Owner, Manager, Employee)
 * POST /api/auth/admin/login
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user;
    let role;
    let ownerId;
    let additionalData = {};
    
    // Try to find user in Owner collection first
    user = await Owner.findOne({ email }).select('+password');
    
    if (user) {
      role = 'owner';
      ownerId = user._id.toString();
    } else {
      // Search in all owner databases for manager/employee
      // This is a simplified approach - in production, you might want to optimize this
      return ResponseHelper.error(res, 400, 'Please provide owner ID for staff login');
    }
    
    if (!user) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // Check if account is active
    if (!user.isActive) {
      return ResponseHelper.forbidden(res, 'Your account has been deactivated');
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // For first-time owner login, mark as not first login after this
    if (role === 'owner' && user.isFirstLogin) {
      user.isFirstLogin = false;
      user.lastLogin = new Date();
      await user.save();
      
      additionalData.isFirstLogin = true;
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user._id,
      role,
      ownerId
    });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    logger.info(`${role} logged in: ${user._id}`);
    
    return ResponseHelper.success(res, 200, 'Login successful', {
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role,
        ...additionalData
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    return ResponseHelper.error(res, 500, 'Login failed');
  }
};

/**
 * Staff Login (Manager or Employee with ownerId)
 * POST /api/auth/staff/login
 */
const staffLogin = async (req, res) => {
  try {
    const { email, password, ownerId } = req.body;
    
    if (!ownerId) {
      return ResponseHelper.error(res, 400, 'Owner ID is required for staff login');
    }
    
    let user;
    let role;
    let additionalData = {};
    
    // Try Manager first
    const Manager = getOwnerModel(ownerId, 'Manager');
    user = await Manager.findOne({ email }).select('+password').populate('assignedRestaurants');
    
    if (user) {
      role = 'manager';
      additionalData.assignedRestaurants = user.assignedRestaurants;
    } else {
      // Try Employee
      const Employee = getOwnerModel(ownerId, 'Employee');
      user = await Employee.findOne({ email }).select('+password');
      
      if (user) {
        role = 'employee';
        additionalData.restaurantId = user.restaurantId;
        additionalData.employeeType = user.employeeType;
        additionalData.permissions = user.permissions;
      }
    }
    
    if (!user) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // Check if account is active
    if (!user.isActive) {
      return ResponseHelper.forbidden(res, 'Your account has been deactivated');
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate tokens
    const tokens = generateTokenPair({
      userId: user._id,
      role,
      ownerId
    });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    logger.info(`${role} logged in: ${user._id}`);
    
    return ResponseHelper.success(res, 200, 'Login successful', {
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role,
        ...additionalData
      }
    });
  } catch (error) {
    logger.error('Staff login error:', error);
    return ResponseHelper.error(res, 500, 'Login failed');
  }
};

/**
 * COMMON AUTHENTICATION
 */

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    logger.info(`User logged out: ${req.user?.id}`);
    
    return ResponseHelper.success(res, 200, 'Logout successful');
  } catch (error) {
    logger.error('Logout error:', error);
    return ResponseHelper.error(res, 500, 'Logout failed');
  }
};

/**
 * Get Current User
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // User is already attached by authenticate middleware
    return ResponseHelper.success(res, 200, 'User retrieved successfully', {
      user: req.user
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve user');
  }
};

/**
 * PASSWORD RESET
 */

/**
 * Forgot Password (Customer)
 * POST /api/auth/customer/forgot-password
 */
const customerForgotPassword = async (req, res) => {
  try {
    const { email, restaurantId, ownerId } = req.body;
    
    const Customer = getOwnerModel(ownerId, 'Customer');
    const customer = await Customer.findOne({ email, restaurantId });
    
    if (!customer) {
      // Don't reveal if user exists or not
      return ResponseHelper.success(res, 200, 'If an account exists, a reset link will be sent');
    }
    
    // Generate reset token
    const resetToken = customer.generateResetToken();
    await customer.save();
    
    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // await sendEmail(customer.email, 'Password Reset', resetUrl);
    
    logger.info(`Password reset requested for customer: ${customer._id}`);
    
    return ResponseHelper.success(res, 200, 'Password reset link sent to your email');
  } catch (error) {
    logger.error('Forgot password error:', error);
    return ResponseHelper.error(res, 500, 'Failed to process password reset');
  }
};

/**
 * Reset Password (Customer)
 * POST /api/auth/customer/reset-password
 */
const customerResetPassword = async (req, res) => {
  try {
    const { token, newPassword, ownerId, restaurantId } = req.body;
    
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const Customer = getOwnerModel(ownerId, 'Customer');
    const customer = await Customer.findOne({
      restaurantId,
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!customer) {
      return ResponseHelper.error(res, 400, 'Invalid or expired reset token');
    }
    
    // Set new password
    customer.password = newPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;
    await customer.save();
    
    logger.info(`Password reset successful for customer: ${customer._id}`);
    
    return ResponseHelper.success(res, 200, 'Password reset successful. Please login with your new password.');
  } catch (error) {
    logger.error('Reset password error:', error);
    return ResponseHelper.error(res, 500, 'Failed to reset password');
  }
};

/**
 * Change Password (Authenticated User)
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id: userId, role } = req.user;
    
    let user;
    
    // Get user based on role
    if (role === 'owner') {
      user = await Owner.findById(userId).select('+password');
    } else if (role === 'manager') {
      const Manager = getOwnerModel(req.ownerId, 'Manager');
      user = await Manager.findById(userId).select('+password');
    } else if (role === 'employee') {
      const Employee = getOwnerModel(req.ownerId, 'Employee');
      user = await Employee.findById(userId).select('+password');
    } else if (role === 'customer') {
      const Customer = getOwnerModel(req.ownerId, 'Customer');
      user = await Customer.findById(userId).select('+password');
    }
    
    if (!user) {
      return ResponseHelper.notFound(res, 'User not found');
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return ResponseHelper.error(res, 400, 'Current password is incorrect');
    }
    
    // Set new password
    user.password = newPassword;
    await user.save();
    
    logger.info(`Password changed for user: ${userId}`);
    
    return ResponseHelper.success(res, 200, 'Password changed successfully');
  } catch (error) {
    logger.error('Change password error:', error);
    return ResponseHelper.error(res, 500, 'Failed to change password');
  }
};

module.exports = {
  // Customer Auth
  customerRegister,
  customerLogin,
  
  // Admin Auth
  adminLogin,
  staffLogin,
  
  // Common
  logout,
  getCurrentUser,
  
  // Password Management
  customerForgotPassword,
  customerResetPassword,
  changePassword
};