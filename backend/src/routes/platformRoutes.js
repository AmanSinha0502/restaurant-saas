const express = require('express');
const router = express.Router();

// Controllers
const {
  platformAdminLogin,
  createOwner,
  getAllOwners,
  getOwnerById,
  updateOwner,
  toggleOwnerStatus,
  deleteOwner,
  resetOwnerPassword,
  getPlatformStats
} = require('../controllers/platformAdminController');

// Middlewares
const {
  authenticate,
  requirePlatformAdmin,
  validate,
  validateObjectId,
  validatePagination,
  asyncHandler,
  authLimiter,
  sanitizeInput
} = require('../middlewares');

// Validators
const {
  createOwnerSchema,
  updateOwnerSchema,
  toggleStatusSchema,
  resetOwnerPasswordSchema
} = require('../validators/platformAdminValidator');

const { adminLoginSchema } = require('../validators/authValidator');

/**
 * @route   POST /api/platform/login
 * @desc    Platform admin login
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  sanitizeInput,
  validate(adminLoginSchema),
  asyncHandler(platformAdminLogin)
);

/**
 * @route   GET /api/platform/stats
 * @desc    Get platform statistics
 * @access  Private (Platform Admin only)
 */
router.get(
  '/stats',
  authenticate,
  requirePlatformAdmin,
  asyncHandler(getPlatformStats)
);

/**
 * @route   POST /api/platform/owners
 * @desc    Create new restaurant owner
 * @access  Private (Platform Admin only)
 */
router.post(
  '/owners',
  authenticate,
  requirePlatformAdmin,
  sanitizeInput,
  validate(createOwnerSchema),
  asyncHandler(createOwner)
);

/**
 * @route   GET /api/platform/owners
 * @desc    Get all restaurant owners
 * @access  Private (Platform Admin only)
 */
router.get(
  '/owners',
  authenticate,
  requirePlatformAdmin,
  validatePagination,
  asyncHandler(getAllOwners)
);

/**
 * @route   GET /api/platform/owners/:id
 * @desc    Get single owner details
 * @access  Private (Platform Admin only)
 */
router.get(
  '/owners/:id',
  authenticate,
  requirePlatformAdmin,
  asyncHandler(getOwnerById)
);

/**
 * @route   PUT /api/platform/owners/:id
 * @desc    Update owner details
 * @access  Private (Platform Admin only)
 */
router.put(
  '/owners/:id',
  authenticate,
  requirePlatformAdmin,
  sanitizeInput,
  validate(updateOwnerSchema),
  asyncHandler(updateOwner)
);

/**
 * @route   PATCH /api/platform/owners/:id/status
 * @desc    Activate/Deactivate owner account
 * @access  Private (Platform Admin only)
 */
router.patch(
  '/owners/:id/status',
  authenticate,
  requirePlatformAdmin,
  validate(toggleStatusSchema),
  asyncHandler(toggleOwnerStatus)
);

/**
 * @route   DELETE /api/platform/owners/:id
 * @desc    Delete owner (soft delete)
 * @access  Private (Platform Admin only)
 */
router.delete(
  '/owners/:id',
  authenticate,
  requirePlatformAdmin,
  asyncHandler(deleteOwner)
);

/**
 * @route   POST /api/platform/owners/:id/reset-password
 * @desc    Reset owner password
 * @access  Private (Platform Admin only)
 */
router.post(
  '/owners/:id/reset-password',
  authenticate,
  requirePlatformAdmin,
  validate(resetOwnerPasswordSchema),
  asyncHandler(resetOwnerPassword)
);

module.exports = router;