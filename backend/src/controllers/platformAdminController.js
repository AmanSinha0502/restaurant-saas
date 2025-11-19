const { PlatformAdmin, Owner } = require('../models');
const mongoose = require('mongoose');
const { generateTokenPair } = require('../config/jwt');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Platform Admin Login
 * POST /api/platform/login
 */
const platformAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find platform admin
    const admin = await PlatformAdmin.findOne({ email }).select('+password');

    if (!admin) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Check if account is active
    if (!admin.isActive) {
      return ResponseHelper.forbidden(res, 'Your account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return ResponseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate tokens
    const tokens = generateTokenPair({
      userId: admin._id,
      role: 'superadmin'
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`Platform admin logged in: ${admin._id}`);

    return ResponseHelper.success(res, 200, 'Login successful', {
      accessToken: tokens.accessToken,
      user: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: 'superadmin'
      }
    });
  } catch (error) {
    logger.error('Platform admin login error:', error);
    return ResponseHelper.error(res, 500, 'Login failed');
  }
};

/**
 * Create Restaurant Owner
 * POST /api/platform/owners
 */
// const createOwner = async (req, res) => {
//   try {
//     const { fullName, email, phone, password } = req.body;

//     // Check if owner already exists
//     const existingOwner = await Owner.findOne({ email });
//     if (existingOwner) {
//       return ResponseHelper.error(res, 400, 'Owner with this email already exists');
//     }

//     // Create owner document (let mongoose generate _id)
//     const owner = await Owner.create({
//       // Do NOT create a custom ownerId string here
//       fullName,
//       email,
//       phone,
//       password,
//       isFirstLogin: true,
//       createdBy: req.user.id,
//       ownedDatabases: []
//     });

//     // Use the Owner's ObjectId string as  ownerId
//     const canonicalOwnerId = owner._id.toString(); // <-- important

//     // Build DB name using single `owner_` prefix and the ObjectId
//     const dbName = `owner_${canonicalOwnerId}`;

//     // Save dbName into ownedDatabases
//     owner.ownerId = canonicalOwnerId; // optional: store canonical ownerId field
//     owner.ownedDatabases = [dbName];
//     await owner.save();

//     // OPTIONAL: create/initialize owner DB and seed default documents
//     const { connectOwnerDB } = require('../config/database');
//     const ownerDb = connectOwnerDB(canonicalOwnerId); // returns a Db connection (useDb)
//     // create default collections/documents if desired:
//     try {
//       // Example: create a default "Settings" doc for the owner
//       const SettingsSchema = new mongoose.Schema({
//         key: String, value: mongoose.Schema.Types.Mixed
//       }, { collection: 'settings' });
//       // Register model on owner DB
//       ownerDb.model('Settings', SettingsSchema);
//       // Insert default settings if not present
//       const Settings = ownerDb.model('Settings');
//       const existing = await Settings.findOne({ key: 'default' }).lean();
//       if (!existing) {
//         await Settings.create({ key: 'default', value: { currency: 'INR', language: 'en' } });
//       }
//     } catch (err) {
//       // don't crash owner creation if seeding fails; just log
//       logger.warn('Owner DB seed warning:', err.message);
//     }

//     logger.info(`Owner created by platform admin: ${owner._id}`);

//     return ResponseHelper.created(res, 'Restaurant owner created successfully', {
//       owner: {
//         id: owner._id,
//         ownerId: canonicalOwnerId,
//         fullName: owner.fullName,
//         email: owner.email,
//         phone: owner.phone,
//         isFirstLogin: owner.isFirstLogin,
//         createdAt: owner.createdAt
//       },
//       loginCredentials: {
//         email: owner.email,
//         temporaryPassword: 'Please share the password securely',
//         loginUrl: `${process.env.FRONTEND_URL}/admin/login`
//       }
//     });
//   } catch (error) {
//     logger.error('Create owner error:', error);
//     return ResponseHelper.error(res, 500, 'Failed to create owner');
//   }
// };



// /**
//  * Create Restaurant Owner
//  * POST /api/platform/owners
//  */
// const createOwner = async (req, res) => {
//   try {
//     const { fullName, email, phone, password } = req.body;

//     // Check if owner already exists
//     const existingOwner = await Owner.findOne({ email });
//     if (existingOwner) {
//       return ResponseHelper.error(res, 400, 'Owner with this email already exists');
//     }

//     // Create owner document (let mongoose generate _id)
//     const owner = new Owner({
//       fullName,
//       email,
//       phone,
//       password,
//       isFirstLogin: true,
//       createdBy: req.user.id,
//       ownedDatabases: []
//     });
//     await owner.save();

//     // Build tenant DB name using automatically assigned ownerId
//     const dbName = `owner_${owner.ownerId}`;
//     owner.ownedDatabases = [dbName];
//     await owner.save();



//     // -------------------------------------------
//     // CONNECT TO TENANT DB (OWNER DB)
//     // -------------------------------------------
//     const { connectOwnerDB } = require('../config/database');
//     const ownerDb = connectOwnerDB(OwnerId);


//     // -------------------------------------------
//     // SEED DEFAULT SETTINGS (your existing code)
//     // -------------------------------------------
//     try {
//       const SettingsSchema = new mongoose.Schema(
//         {
//           key: String,
//           value: mongoose.Schema.Types.Mixed
//         },
//         { collection: 'settings' }
//       );

//       ownerDb.model('Settings', SettingsSchema);

//       const Settings = ownerDb.model('Settings');
//       const existing = await Settings.findOne({ key: 'default' }).lean();

//       if (!existing) {
//         await Settings.create({
//           key: 'default',
//           value: { currency: 'INR', language: 'en' }
//         });
//       }
//     } catch (err) {
//       logger.warn('Owner DB seed warning:', err.message);
//     }


//     // -------------------------------------------
//     // PATCH 2 — INITIALIZE ALL TENANT MODELS & INDEXES
//     // -------------------------------------------
//     try {
//       const { getOwnerModels } = require('../models');
//       const models = getOwnerModels(OwnerId);

//       for (const key in models) {
//         if (models[key] && typeof models[key].createIndexes === 'function') {
//           try {
//             await models[key].createIndexes();
//           } catch (e) {
//             console.warn(`Index creation failed for model ${key}:`, e.message);
//           }
//         }
//       }
//       logger.info(`Tenant DB initialized for owner ${OwnerId}`);
//     } catch (err) {
//       logger.warn('Tenant model initialization warning:', err.message);
//     }
//     // -------------------------------------------
//     // END PATCH 2
//     // -------------------------------------------


//     logger.info(`Owner created by platform admin: ${owner._id}`);

//     return ResponseHelper.created(res, 'Restaurant owner created successfully', {
//       owner: {
//         id: owner._id,
//         ownerId: OwnerId,
//         fullName: owner.fullName,
//         email: owner.email,
//         phone: owner.phone,
//         isFirstLogin: owner.isFirstLogin,
//         createdAt: owner.createdAt
//       },
//       loginCredentials: {
//         email: owner.email,
//         temporaryPassword: 'Please share the password securely',
//         loginUrl: `${process.env.FRONTEND_URL}/admin/login`
//       }
//     });
//   } catch (error) {
//     logger.error('Create owner error:', error);
//     return ResponseHelper.error(res, 500, 'Failed to create owner');
//   }
// };

/**
 * Create Restaurant Owner
 * POST /api/platform/owners
 */
const createOwner = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // 1️⃣ Check if owner already exists in platform_main
    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return ResponseHelper.error(res, 400, 'Owner with this email already exists');
    }

    // 2️⃣ Create owner in platform_main (platform DB)
    const owner = new Owner({
      fullName,
      email,
      phone,
      password,
      isFirstLogin: true,
      createdBy: req.user.id,
      ownedDatabases: [] // tenant DBs will be added after creation
    });
    await owner.save(); // ownerId is automatically assigned via pre-save hook

    // 3️⃣ Build tenant DB name using ownerId
    const tenantDbName = `owner_${owner.ownerId}`;
    owner.ownedDatabases = [tenantDbName];
    await owner.save(); // save the tenant DB info in platform_main

    // 4️⃣ Connect to tenant DB (owner's own database)
    const { connectOwnerDB } = require('../config/database');
    const tenantDb = connectOwnerDB(owner.ownerId);

    // 5️⃣ Seed default settings in tenant DB
    try {
      const SettingsSchema = new mongoose.Schema(
        { key: String, value: mongoose.Schema.Types.Mixed },
        { collection: 'settings' }
      );

      tenantDb.model('Settings', SettingsSchema);
      const Settings = tenantDb.model('Settings');

      const existing = await Settings.findOne({ key: 'default' }).lean();
      if (!existing) {
        await Settings.create({ key: 'default', value: { currency: 'INR', language: 'en' } });
      }
    } catch (err) {
      logger.warn('Owner tenant DB seed warning:', err.message);
    }

    // 6️⃣ Initialize tenant models & indexes
    try {
      const { getOwnerModels } = require('../models');
      const models = getOwnerModels(owner.ownerId);

      for (const key in models) {
        if (models[key]?.createIndexes) {
          try {
            await models[key].createIndexes();
          } catch (e) {
            console.warn(`Index creation failed for model ${key}:`, e.message);
          }
        }
      }

      logger.info(`Tenant DB initialized for owner ${owner.ownerId}`);
    } catch (err) {
      logger.warn('Tenant model initialization warning:', err.message);
    }

    logger.info(`Owner created in platform_main: ${owner._id}`);

    // 7️⃣ Return response
    return ResponseHelper.created(res, 'Restaurant owner created successfully', {
      owner: {
        id: owner._id,
        ownerId: owner.ownerId,
        fullName: owner.fullName,
        email: owner.email,
        phone: owner.phone,
        isFirstLogin: owner.isFirstLogin,
        createdAt: owner.createdAt,
      },
      loginCredentials: {
        email: owner.email,
        temporaryPassword: owner.password,
        loginUrl: `${process.env.FRONTEND_URL}/admin/login`
      }
    });
  } catch (error) {
    logger.error('Create owner error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create owner');
  }
};




/**
 * Get All Restaurant Owners
 * GET /api/platform/owners
 */
const getAllOwners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query
    const [owners, total] = await Promise.all([
      Owner.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Owner.countDocuments(query)
    ]);

    // Get restaurant count for each owner (simplified - actual implementation would query each owner's DB)
    const ownersWithStats = owners.map(owner => ({
      ...owner,
      restaurantCount: owner.ownedDatabases?.length || 0,
      lastLogin: owner.lastLogin || null
    }));

    return ResponseHelper.paginated(
      res,
      ownersWithStats,
      parseInt(page),
      parseInt(limit),
      total
    );
  } catch (error) {
    logger.error('Get all owners error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve owners');
  }
};

/**
 * Get Single Owner Details
 * GET /api/platform/owners/:id
 */
const getOwnerById = async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await Owner.findById(id).select('-password');

    if (!owner) {
      return ResponseHelper.notFound(res, 'Owner not found');
    }

    // Get additional stats (simplified)
    const stats = {
      totalRestaurants: owner.ownedDatabases?.length || 0,
      accountAge: Math.floor((Date.now() - owner.createdAt) / (1000 * 60 * 60 * 24)), // days
      lastLogin: owner.lastLogin,
      isFirstLogin: owner.isFirstLogin
    };

    return ResponseHelper.success(res, 200, 'Owner retrieved successfully', {
      owner: {
        ...owner.toObject(),
        stats
      }
    });
  } catch (error) {
    logger.error('Get owner by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve owner');
  }
};

/**
 * Update Owner
 * PUT /api/platform/owners/:id
 */
const updateOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, isActive } = req.body;

    const owner = await Owner.findById(id);

    if (!owner) {
      return ResponseHelper.notFound(res, 'Owner not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== owner.email) {
      const existingOwner = await Owner.findOne({ email });
      if (existingOwner) {
        return ResponseHelper.error(res, 400, 'Email already in use');
      }
    }

    // Update fields
    if (fullName) owner.fullName = fullName;
    if (email) owner.email = email;
    if (phone) owner.phone = phone;
    if (isActive !== undefined) owner.isActive = isActive;

    await owner.save();

    logger.info(`Owner updated by platform admin: ${owner._id}`);

    return ResponseHelper.success(res, 200, 'Owner updated successfully', {
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        email: owner.email,
        phone: owner.phone,
        isActive: owner.isActive
      }
    });
  } catch (error) {
    logger.error('Update owner error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update owner');
  }
};

/**
 * Deactivate/Activate Owner Account
 * PATCH /api/platform/owners/:id/status
 */
const toggleOwnerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const owner = await Owner.findById(id);

    if (!owner) {
      return ResponseHelper.notFound(res, 'Owner not found');
    }

    owner.isActive = isActive;
    await owner.save();

    logger.info(`Owner ${isActive ? 'activated' : 'deactivated'} by platform admin: ${owner._id}`);

    return ResponseHelper.success(res, 200, `Owner account ${isActive ? 'activated' : 'deactivated'} successfully`, {
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        email: owner.email,
        isActive: owner.isActive
      }
    });
  } catch (error) {
    logger.error('Toggle owner status error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update owner status');
  }
};

/**
 * Delete Owner (Soft Delete - deactivate instead)
 * DELETE /api/platform/owners/:id
 */
const deleteOwner = async (req, res) => {
  try {
    const { id } = req.params;

    const owner = await Owner.findById(id);

    if (!owner) {
      return ResponseHelper.notFound(res, 'Owner not found');
    }

    // Soft delete - just deactivate
    owner.isActive = false;
    await owner.save();

    logger.warn(`Owner soft deleted by platform admin: ${owner._id}`);

    return ResponseHelper.success(res, 200, 'Owner account deactivated successfully');
  } catch (error) {
    logger.error('Delete owner error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete owner');
  }
};

/**
 * Reset Owner Password
 * POST /api/platform/owners/:id/reset-password
 */
const resetOwnerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const owner = await Owner.findById(id);

    if (!owner) {
      return ResponseHelper.notFound(res, 'Owner not found');
    }

    // Set new password
    owner.password = newPassword;
    owner.isFirstLogin = true; // Force password change on next login
    await owner.save();

    logger.info(`Owner password reset by platform admin: ${owner._id}`);

    return ResponseHelper.success(res, 200, 'Password reset successfully. Owner will be required to change it on next login.');
  } catch (error) {
    logger.error('Reset owner password error:', error);
    return ResponseHelper.error(res, 500, 'Failed to reset password');
  }
};

/**
 * Get Platform Statistics
 * GET /api/platform/stats
 */
const getPlatformStats = async (req, res) => {
  try {
    // Get basic stats
    const [
      totalOwners,
      activeOwners,
      inactiveOwners,
      newOwnersThisMonth
    ] = await Promise.all([
      Owner.countDocuments(),
      Owner.countDocuments({ isActive: true }),
      Owner.countDocuments({ isActive: false }),
      Owner.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    // Get recent owners
    const recentOwners = await Owner.find()
      .select('fullName email createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return ResponseHelper.success(res, 200, 'Platform statistics retrieved successfully', {
      stats: {
        totalOwners,
        activeOwners,
        inactiveOwners,
        newOwnersThisMonth,
        // Additional stats can be added here
        totalRestaurants: 0, // TODO: Aggregate from all owner databases
        totalOrders: 0, // TODO: Aggregate from all owner databases
        totalRevenue: 0 // TODO: Aggregate from all owner databases
      },
      recentOwners
    });
  } catch (error) {
    logger.error('Get platform stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve statistics');
  }
};

module.exports = {
  platformAdminLogin,
  createOwner,
  getAllOwners,
  getOwnerById,
  updateOwner,
  toggleOwnerStatus,
  deleteOwner,
  resetOwnerPassword,
  getPlatformStats
};