const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { PlatformAdmin, Owner, getOwnerModel, getOwnerModels } = require('../models');
const { generateTokenPair } = require('../config/jwt');
const crypto = require('crypto');
/**
 * Create Restaurant/Branch (First-time setup or add new branch)
 * POST /api/restaurants
 */
const createRestaurant = async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      country,
      taxSettings,
      reservationSettings,
      currency,
      defaultLanguage
    } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    
    // Auto-generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if slug already exists
    const existingRestaurant = await Restaurant.findOne({ slug });
    if (existingRestaurant) {
      return ResponseHelper.error(res, 400, 'A restaurant with similar name already exists. Please choose a different name.');
    }
    
    // Set currency and currency symbol based on country
    let restaurantCurrency = currency;
    let currencySymbol = '₹';
    let defaultLang = defaultLanguage || 'en';
    
    if (!restaurantCurrency) {
      if (country === 'India') {
        restaurantCurrency = 'INR';
        currencySymbol = '₹';
        defaultLang = 'en';
      } else if (country === 'UAE' || country === 'Dubai') {
        restaurantCurrency = 'AED';
        currencySymbol = 'د.إ';
        defaultLang = 'ar';
      } else {
        restaurantCurrency = 'USD';
        currencySymbol = '$';
      }
    }
    
    // Create restaurant
    const restaurant = await Restaurant.create({
      ownerId: req.ownerId,
      // Tenant-unique subdomain required by schema — use ownerId + slug
      subdomain: `${req.ownerId}-${slug}`,
      name,
      slug,
      address,
      phone,
      email,
      currency: restaurantCurrency,
      currencySymbol,
      defaultLanguage: defaultLang,
      taxSettings: {
        taxType: country === 'India' ? 'GST' : country === 'UAE' ? 'VAT' : 'Sales Tax',
        taxNumber: taxSettings?.taxNumber || '',
        taxRate: taxSettings?.taxRate || (country === 'India' ? 5 : country === 'UAE' ? 5 : 0),
        applyOnFood: taxSettings?.applyOnFood !== false,
        applyOnReservations: taxSettings?.applyOnReservations !== false,
        applyOnDelivery: taxSettings?.applyOnDelivery || false
      },
      reservationSettings: {
        advancePaymentType: reservationSettings?.advancePaymentType || 'percentage',
        advanceAmount: reservationSettings?.advanceAmount || 20,
        minimumAdvance: reservationSettings?.minimumAdvance || 100,
        cancellationPolicy: 'non-refundable',
        defaultDiningDuration: reservationSettings?.defaultDiningDuration || 90
      },
      status: 'active'
    });
    
    logger.info(`Restaurant created: ${restaurant._id} by owner: ${req.ownerId}`);
    
    return ResponseHelper.created(res, 'Restaurant created successfully', {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        currency: restaurant.currency,
        currencySymbol: restaurant.currencySymbol,
        defaultLanguage: restaurant.defaultLanguage,
        taxSettings: restaurant.taxSettings,
        reservationSettings: restaurant.reservationSettings,
        createdAt: restaurant.createdAt
      }
    });
  } catch (error) {
    logger.error('Create restaurant error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create restaurant');
  }
};

/**
 * Get All Restaurants (Owner's branches)
 * GET /api/restaurants
 */
const getAllRestaurants = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    
    // Build query
    const query = { ownerId: req.ownerId };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const restaurants = await Restaurant.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Get basic stats for each restaurant (simplified)
    const restaurantsWithStats = restaurants.map(restaurant => ({
      ...restaurant,
      stats: {
        totalOrders: 0, // TODO: Calculate from orders
        totalRevenue: 0, // TODO: Calculate from transactions
        totalCustomers: 0 // TODO: Calculate from customers
      }
    }));
    
    return ResponseHelper.success(res, 200, 'Restaurants retrieved successfully', {
      restaurants: restaurantsWithStats,
      total: restaurantsWithStats.length
    });
  } catch (error) {
    logger.error('Get all restaurants error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve restaurants');
  }
};

/**
 * Get Single Restaurant Details
 * GET /api/restaurants/:id
 */
const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Get detailed stats
    const Order = models.Order;
    const Customer = models.Customer;
    const Table = models.Table;
    
    const [totalOrders, totalCustomers, totalTables] = await Promise.all([
      Order.countDocuments({ restaurantId: id }),
      Customer.countDocuments({ restaurantId: id }),
      Table.countDocuments({ restaurantId: id })
    ]);
    
    return ResponseHelper.success(res, 200, 'Restaurant retrieved successfully', {
      restaurant: {
        ...restaurant.toObject(),
        stats: {
          totalOrders,
          totalCustomers,
          totalTables,
          totalRevenue: 0 // TODO: Calculate from transactions
        }
      }
    });
  } catch (error) {
    logger.error('Get restaurant by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve restaurant');
  }
};

/**
 * Update Restaurant
 * PUT /api/restaurants/:id
 */
const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Update allowed fields
    const allowedFields = [
      'name',
      'address',
      'phone',
      'email',
      'taxSettings',
      'reservationSettings',
      'branding',
      'paymentGateways',
      'operatingHours'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
          // Merge nested objects
          restaurant[field] = { ...restaurant[field], ...updateData[field] };
        } else {
          restaurant[field] = updateData[field];
        }
      }
    });
    
    // If name is changed, update slug
    if (updateData.name && updateData.name !== restaurant.name) {
      restaurant.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    await restaurant.save();
    
    logger.info(`Restaurant updated: ${restaurant._id} by owner: ${req.ownerId}`);
    
    return ResponseHelper.success(res, 200, 'Restaurant updated successfully', {
      restaurant
    });
  } catch (error) {
    logger.error('Update restaurant error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update restaurant');
  }
};

/**
 * Update Restaurant Status
 * PATCH /api/restaurants/:id/status
 */
const updateRestaurantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    restaurant.status = status;
    await restaurant.save();
    
    logger.info(`Restaurant status updated: ${restaurant._id} to ${status}`);
    
    return ResponseHelper.success(res, 200, 'Restaurant status updated successfully', {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        status: restaurant.status
      }
    });
  } catch (error) {
    logger.error('Update restaurant status error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update restaurant status');
  }
};

/**
 * Delete Restaurant (Soft Delete)
 * DELETE /api/restaurants/:id
 */
const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModel(req.ownerId);
    const Restaurant = models.Restaurant;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Soft delete - change status to inactive
    restaurant.status = 'inactive';
    await restaurant.save();
    
    logger.warn(`Restaurant soft deleted: ${restaurant._id} by owner: ${req.ownerId}`);
    
    return ResponseHelper.success(res, 200, 'Restaurant deactivated successfully');
  } catch (error) {
    logger.error('Delete restaurant error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete restaurant');
  }
};

/**
 * Get Restaurant Dashboard Stats
 * GET /api/restaurants/:id/dashboard
 */
const getRestaurantDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'today' } = req.query; // today, week, month, year
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    const Order = models.Order;
    const Reservation = models.Reservation;
    const Customer = models.Customer;
    
    const restaurant = await Restaurant.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Calculate date range based on period
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    // Get stats
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      activeReservations,
      newCustomers
    ] = await Promise.all([
      Order.countDocuments({
        restaurantId: id,
        createdAt: { $gte: startDate }
      }),
      Order.countDocuments({
        restaurantId: id,
        status: { $in: ['pending', 'confirmed', 'preparing'] },
        createdAt: { $gte: startDate }
      }),
      Order.countDocuments({
        restaurantId: id,
        status: 'completed',
        createdAt: { $gte: startDate }
      }),
      Order.aggregate([
        {
          $match: {
            restaurantId: id,
            status: 'completed',
            'payment.status': 'paid',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' }
          }
        }
      ]),
      Reservation.countDocuments({
        restaurantId: id,
        status: 'confirmed',
        reservationDate: { $gte: startDate.toISOString().split('T')[0] }
      }),
      Customer.countDocuments({
        restaurantId: id,
        createdAt: { $gte: startDate }
      })
    ]);
    
    return ResponseHelper.success(res, 200, 'Dashboard stats retrieved successfully', {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name
      },
      period,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        activeReservations,
        newCustomers
      }
    });
  } catch (error) {
    logger.error('Get restaurant dashboard error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve dashboard stats');
  }
};

/**
 * Get Owner's Cumulative Dashboard (All Restaurants)
 * GET /api/restaurants/dashboard/cumulative
 */
const getCumulativeDashboard = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Restaurant = models.Restaurant;
    const Order = models.Order;
    const Customer = models.Customer;
    
    // Get all active restaurants
    const restaurants = await Restaurant.find({
      ownerId: req.ownerId,
      status: 'active'
    }).select('_id name');
    
    const restaurantIds = restaurants.map(r => r._id);
    
    // Calculate date range
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Get cumulative stats
    const [
      totalOrders,
      totalRevenue,
      totalCustomers
    ] = await Promise.all([
      Order.countDocuments({
        restaurantId: { $in: restaurantIds },
        createdAt: { $gte: startDate }
      }),
      Order.aggregate([
        {
          $match: {
            restaurantId: { $in: restaurantIds },
            status: 'completed',
            'payment.status': 'paid',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$pricing.total' }
          }
        }
      ]),
      Customer.countDocuments({
        restaurantId: { $in: restaurantIds }
      })
    ]);
    
    // Get per-restaurant breakdown
    const revenueByRestaurant = await Order.aggregate([
      {
        $match: {
          restaurantId: { $in: restaurantIds },
          status: 'completed',
          'payment.status': 'paid',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      }
    ]);
    
    const breakdown = restaurants.map(restaurant => {
      const stats = revenueByRestaurant.find(r => r._id.toString() === restaurant._id.toString());
      return {
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        revenue: stats?.revenue || 0,
        orders: stats?.orders || 0
      };
    });
    
    return ResponseHelper.success(res, 200, 'Cumulative dashboard retrieved successfully', {
      period,
      totalRestaurants: restaurants.length,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCustomers
      },
      breakdown
    });
  } catch (error) {
    logger.error('Get cumulative dashboard error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve cumulative dashboard');
  }
};




// ===============================
// AUTH CONTROLLER (PATCHED)
// ===============================

/**
 * ===============================
 * CUSTOMER AUTH
 * ===============================
 */

// REGISTER CUSTOMER
const customerRegister = async (req, res) => {
  try {
    const { fullName, email, phone, password, restaurantId } = req.body;

    const ownerId = req.ownerId;   // PATCH ✔
    if (!ownerId) {
      return ResponseHelper.error(res, 400, "Tenant not detected");
    }

    const Customer = getOwnerModel(ownerId, "Customer");

    const existingCustomer = await Customer.findOne({
      restaurantId,
      $or: [{ email }, { phone }]
    });

    if (existingCustomer) {
      return ResponseHelper.error(res, 400, "Customer already exists");
    }

    const customer = await Customer.create({
      restaurantId,
      fullName,
      email,
      phone,
      password
    });

    const tokens = generateTokenPair({
      userId: customer._id,
      role: "customer",
      ownerId
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ResponseHelper.created(res, "Registration successful", {
      accessToken: tokens.accessToken,
      user: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        role: "customer",
        restaurantId: customer.restaurantId
      }
    });

  } catch (error) {
    logger.error("Customer registration error:", error);
    return ResponseHelper.error(res, 500, "Registration failed");
  }
};


// CUSTOMER LOGIN
const customerLogin = async (req, res) => {
  try {
    const { email, password, restaurantId } = req.body;

    const ownerId = req.ownerId;   // PATCH ✔
    if (!ownerId) {
      return ResponseHelper.error(res, 400, "Tenant not detected");
    }

    const Customer = getOwnerModel(ownerId, "Customer");

    const customer = await Customer.findOne({ email, restaurantId }).select("+password");
    if (!customer) return ResponseHelper.unauthorized(res, "Invalid email or password");

    if (!customer.isActive)
      return ResponseHelper.forbidden(res, "Your account has been deactivated");

    if (customer.isBlocked)
      return ResponseHelper.forbidden(res, "Your account has been blocked");

    const valid = await customer.comparePassword(password);
    if (!valid) return ResponseHelper.unauthorized(res, "Invalid email or password");

    const tokens = generateTokenPair({
      userId: customer._id,
      role: "customer",
      ownerId
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ResponseHelper.success(res, 200, "Login successful", {
      accessToken: tokens.accessToken,
      user: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        role: "customer",
        restaurantId: customer.restaurantId,
        loyaltyPoints: customer.loyaltyPoints,
        loyaltyTier: customer.loyaltyTier
      }
    });

  } catch (error) {
    logger.error("Customer login error:", error);
    return ResponseHelper.error(res, 500, "Login failed");
  }
};


/**
 * ===============================
 * OWNER LOGIN (Platform Admin)
 * ===============================
 */

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Owner.findOne({ email }).select("+password");
    if (!user) return ResponseHelper.unauthorized(res, "Invalid email or password");

    const valid = await user.comparePassword(password);
    if (!valid) return ResponseHelper.unauthorized(res, "Invalid email or password");

    const ownerId = user._id.toString();

    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      user.lastLogin = new Date();
      await user.save();
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    const tokens = generateTokenPair({
      userId: user._id,
      role: "owner",
      ownerId
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ResponseHelper.success(res, 200, "Login successful", {
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: "owner"
      }
    });

  } catch (error) {
    logger.error("Admin login error:", error);
    return ResponseHelper.error(res, 500, "Login failed");
  }
};


/**
 * ===============================
 * STAFF LOGIN (PATCHED)
 * ===============================
 */

const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const ownerId = req.ownerId;   // PATCH ✔
    if (!ownerId) return ResponseHelper.error(res, 400, "Tenant not detected");

    let user;
    let role;

    const Manager = getOwnerModel(ownerId, "Manager");
    const Employee = getOwnerModel(ownerId, "Employee");

    // Try manager first
    user = await Manager.findOne({ email })
      .select("+password")
      .populate({
        path: "assignedRestaurants",
        model: getOwnerModel(ownerId, "Restaurant") // PATCH ✔
      });

    if (user) {
      role = "manager";
    } else {
      user = await Employee.findOne({ email }).select("+password");
      if (user) role = "employee";
    }

    if (!user) return ResponseHelper.unauthorized(res, "Invalid email or password");

    if (!user.isActive)
      return ResponseHelper.forbidden(res, "Your account has been deactivated");

    const valid = await user.comparePassword(password);
    if (!valid) return ResponseHelper.unauthorized(res, "Invalid email or password");

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokenPair({
      userId: user._id,
      role,
      ownerId
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return ResponseHelper.success(res, 200, "Login successful", {
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role,
        ...(role === "manager"
          ? { assignedRestaurants: user.assignedRestaurants }
          : {
              restaurantId: user.restaurantId,
              employeeType: user.employeeType,
              permissions: user.permissions
            })
      }
    });

  } catch (error) {
    logger.error("Staff login error:", error);
    return ResponseHelper.error(res, 500, "Login failed");
  }
};


/**
 * ===============================
 * LOGOUT
 * ===============================
 */

const logout = async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    return ResponseHelper.success(res, 200, "Logout successful");
  } catch (error) {
    return ResponseHelper.error(res, 500, "Failed to logout");
  }
};


/**
 * ===============================
 * CUSTOMER PASSWORD RESET (PATCHED)
 * ===============================
 */

const customerForgotPassword = async (req, res) => {
  try {
    const { email, restaurantId } = req.body;

    const ownerId = req.ownerId;  // PATCH ✔

    const Customer = getOwnerModel(ownerId, "Customer");

    const customer = await Customer.findOne({ email, restaurantId });

    if (!customer) {
      return ResponseHelper.success(res, 200, "If account exists, reset mail sent");
    }

    const resetToken = customer.generateResetToken();
    await customer.save();

    return ResponseHelper.success(res, 200, "Password reset link sent");

  } catch (error) {
    logger.error("Forgot password error:", error);
    return ResponseHelper.error(res, 500, "Failed process");
  }
};


const customerResetPassword = async (req, res) => {
  try {
    const { token, newPassword, restaurantId } = req.body;

    const ownerId = req.ownerId; // PATCH ✔

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const Customer = getOwnerModel(ownerId, "Customer");

    const customer = await Customer.findOne({
      restaurantId,
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!customer) {
      return ResponseHelper.error(res, 400, "Invalid or expired token");
    }

    customer.password = newPassword;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpire = undefined;
    await customer.save();

    return ResponseHelper.success(res, 200, "Password reset successful");

  } catch (error) {
    logger.error("Reset password error:", error);
    return ResponseHelper.error(res, 500, "Reset failed");
  }
};


/**
 * ===============================
 * CHANGE PASSWORD
 * ===============================
 */

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    let Model;

    if (role === "owner") Model = Owner;
    else Model = getOwnerModel(req.ownerId, role.charAt(0).toUpperCase() + role.slice(1));

    const user = await Model.findById(id).select("+password");
    if (!user) return ResponseHelper.notFound(res, "User not found");

    const valid = await user.comparePassword(currentPassword);
    if (!valid)
      return ResponseHelper.error(res, 400, "Current password incorrect");

    user.password = newPassword;
    await user.save();

    return ResponseHelper.success(res, 200, "Password changed");

  } catch (error) {
    logger.error("Change password error:", error);
    return ResponseHelper.error(res, 500, "Failed to change password");
  }
};


module.exports = {
  customerRegister,
  customerLogin,
  adminLogin,
  staffLogin,
  logout,
  customerForgotPassword,
  customerResetPassword,
  changePassword,
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  getRestaurantDashboard,
  getCumulativeDashboard
};
