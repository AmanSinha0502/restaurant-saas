const express = require('express');
const router = express.Router();

// Controllers
const {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  getRestaurantDashboard,
  getCumulativeDashboard
} = require('../controllers/restaurantController');

// Middlewares
const {
  authenticate,
  requireOwner,
  requireManager,
  attachOwnerModels,
  validate,
  validateObjectId,
  asyncHandler,
  sanitizeInput
} = require('../middlewares');

// Validators
const {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateStatusSchema
} = require('../validators/restaurantValidator');

/**
 * @route   GET /api/restaurants/dashboard/cumulative
 * @desc    Get cumulative dashboard for all restaurants (Owner only)
 * @access  Private (Owner only)
 */
router.get(
  '/dashboard/cumulative',
  authenticate,
  requireOwner,
  attachOwnerModels,
  asyncHandler(getCumulativeDashboard)
);

/**
 * @route   POST /api/restaurants
 * @desc    Create new restaurant/branch
 * @access  Private (Owner only)
 */
router.post(
  '/',
  authenticate,
  requireOwner,
  attachOwnerModels,
  sanitizeInput,
  validate(createRestaurantSchema),
  asyncHandler(createRestaurant)
);

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants/branches
 * @access  Private (Owner/Manager)
 */
router.get(
  '/',
  authenticate,
  requireManager,
  attachOwnerModels,
  asyncHandler(getAllRestaurants)
);

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get single restaurant details
 * @access  Private (Owner/Manager)
 */
router.get(
  '/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getRestaurantById)
);

/**
 * @route   GET /api/restaurants/:id/dashboard
 * @desc    Get restaurant dashboard stats
 * @access  Private (Owner/Manager)
 */
router.get(
  '/:id/dashboard',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getRestaurantDashboard)
);

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update restaurant details
 * @access  Private (Owner only)
 */
router.put(
  '/:id',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  sanitizeInput,
  validate(updateRestaurantSchema),
  asyncHandler(updateRestaurant)
);

/**
 * @route   PATCH /api/restaurants/:id/status
 * @desc    Update restaurant status
 * @access  Private (Owner only)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  validate(updateStatusSchema),
  asyncHandler(updateRestaurantStatus)
);

/**
 * @route   DELETE /api/restaurants/:id
 * @desc    Delete restaurant (soft delete)
 * @access  Private (Owner only)
 */
router.delete(
  '/:id',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(deleteRestaurant)
);

module.exports = router;