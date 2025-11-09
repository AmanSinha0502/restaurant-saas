const express = require('express');
const router = express.Router();

// Controllers
const {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  bulkToggleAvailability,
  getCategories,
  duplicateMenuItem,
  getPopularItems,
  checkAvailability
} = require('../controllers/menuController');

// Middlewares
const {
  authenticate,
  requireManager,
  requireStaff,
  optionalAuthenticate,
  attachOwnerModels,
  validate,
  validateObjectId,
  asyncHandler,
  sanitizeInput,
  uploadImages,
  handleUploadError
} = require('../middlewares');

// Validators
const {
  createMenuItemSchema,
  updateMenuItemSchema,
  toggleAvailabilitySchema,
  bulkToggleAvailabilitySchema
} = require('../validators/menuValidator');

/**
 * ========================================
 * PUBLIC ROUTES (Customer Access)
 * ========================================
 */

/**
 * @route   GET /api/menu/public/:ownerId/:restaurantId
 * @desc    Get menu items for customers (public)
 * @access  Public
 */
router.get(
  '/public/:ownerId/:restaurantId',
  asyncHandler(async (req, res) => {
    const { ownerId, restaurantId } = req.params;
    const { category, dietaryType, search } = req.query;
    
    req.ownerId = ownerId;
    
    const { getOwnerModels } = require('../models');
    const models = getOwnerModels(ownerId);
    const Menu = models.Menu;
    
    // Build query for public menu
    const query = {
      ownerId,
      isActive: true,
      $or: [
        { sharedAcrossBranches: true },
        { specificBranches: restaurantId }
      ]
    };
    
    if (category) query.category = category;
    if (dietaryType) query.dietaryType = dietaryType;
    if (search) {
      query['name.en'] = { $regex: search, $options: 'i' };
    }
    
    // Get available items only
    const menuItems = await Menu.find(query)
      .select('-linkedInventoryItems -createdBy -__v')
      .sort({ category: 1, name: 1 })
      .lean();
    
    // Filter by availability at this restaurant
    const availableItems = menuItems.filter(item => {
      if (!item.availabilityByBranch) return true;
      
      const branchAvailability = item.availabilityByBranch.get(restaurantId);
      return !branchAvailability || branchAvailability.isAvailable;
    });
    
    const ResponseHelper = require('../utils/responseHelper');
    return ResponseHelper.success(res, 200, 'Menu retrieved successfully', {
      menuItems: availableItems,
      total: availableItems.length
    });
  })
);

/**
 * @route   GET /api/menu/public/:ownerId/:restaurantId/categories
 * @desc    Get menu categories for customers (public)
 * @access  Public
 */
router.get(
  '/public/:ownerId/:restaurantId/categories',
  asyncHandler(async (req, res) => {
    const { ownerId, restaurantId } = req.params;
    
    const { getOwnerModels } = require('../models');
    const models = getOwnerModels(ownerId);
    const Menu = models.Menu;
    
    const categories = await Menu.aggregate([
      {
        $match: {
          ownerId,
          isActive: true,
          $or: [
            { sharedAcrossBranches: true },
            { specificBranches: { $in: [restaurantId] } }
          ]
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    const ResponseHelper = require('../utils/responseHelper');
    return ResponseHelper.success(res, 200, 'Categories retrieved successfully', {
      categories: categories.map(c => ({ name: c._id, count: c.count }))
    });
  })
);

/**
 * ========================================
 * ADMIN ROUTES (Owner/Manager/Staff)
 * ========================================
 */

/**
 * @route   POST /api/menu
 * @desc    Create menu item
 * @access  Private (Owner/Manager)
 */
router.post(
  '/',
  authenticate,
  requireManager,
  attachOwnerModels,
  uploadImages,
  handleUploadError,
  sanitizeInput,
  validate(createMenuItemSchema),
  asyncHandler(createMenuItem)
);

/**
 * @route   GET /api/menu
 * @desc    Get all menu items (admin)
 * @access  Private (Owner/Manager/Staff)
 */
router.get(
  '/',
  authenticate,
  requireStaff,
  attachOwnerModels,
  asyncHandler(getAllMenuItems)
);

/**
 * @route   GET /api/menu/categories
 * @desc    Get menu categories
 * @access  Private (Owner/Manager/Staff)
 */
router.get(
  '/categories',
  authenticate,
  requireStaff,
  attachOwnerModels,
  asyncHandler(getCategories)
);

/**
 * @route   GET /api/menu/popular
 * @desc    Get popular menu items
 * @access  Private (Owner/Manager)
 */
router.get(
  '/popular',
  authenticate,
  requireManager,
  attachOwnerModels,
  asyncHandler(getPopularItems)
);

/**
 * @route   PATCH /api/menu/bulk/availability
 * @desc    Bulk toggle availability
 * @access  Private (Manager/Kitchen Staff)
 */
router.patch(
  '/bulk/availability',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validate(bulkToggleAvailabilitySchema),
  asyncHandler(bulkToggleAvailability)
);

/**
 * @route   GET /api/menu/:id
 * @desc    Get single menu item
 * @access  Private (Owner/Manager/Staff)
 */
router.get(
  '/:id',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getMenuItemById)
);

/**
 * @route   PUT /api/menu/:id
 * @desc    Update menu item
 * @access  Private (Owner/Manager)
 */
router.put(
  '/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  uploadImages,
  handleUploadError,
  sanitizeInput,
  validate(updateMenuItemSchema),
  asyncHandler(updateMenuItem)
);

/**
 * @route   DELETE /api/menu/:id
 * @desc    Delete menu item
 * @access  Private (Owner/Manager)
 */
router.delete(
  '/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(deleteMenuItem)
);

/**
 * @route   PATCH /api/menu/:id/availability
 * @desc    Toggle menu item availability
 * @access  Private (Manager/Kitchen Staff)
 */
router.patch(
  '/:id/availability',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validateObjectId('id'),
  validate(toggleAvailabilitySchema),
  asyncHandler(toggleAvailability)
);

/**
 * @route   POST /api/menu/:id/duplicate
 * @desc    Duplicate menu item
 * @access  Private (Owner/Manager)
 */
router.post(
  '/:id/duplicate',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(duplicateMenuItem)
);

/**
 * @route   GET /api/menu/:id/check-availability/:restaurantId
 * @desc    Check menu item availability at restaurant
 * @access  Private (Staff)
 */
router.get(
  '/:id/check-availability/:restaurantId',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validateObjectId('id'),
  validateObjectId('restaurantId'),
  asyncHandler(checkAvailability)
);

module.exports = router;