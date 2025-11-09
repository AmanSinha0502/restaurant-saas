const express = require('express');
const router = express.Router();

// Controllers
const {
  // Manager Management
  createManager,
  getAllManagers,
  getManagerById,
  updateManager,
  deleteManager,
  updateManagerRestaurants,
  
  // Employee Management
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  
  // Statistics
  getStaffStats
} = require('../controllers/staffController');

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
  createManagerSchema,
  updateManagerSchema,
  updateManagerRestaurantsSchema,
  createEmployeeSchema,
  updateEmployeeSchema
} = require('../validators/staffValidator');

/**
 * ========================================
 * MANAGER ROUTES
 * ========================================
 */

/**
 * @route   POST /api/staff/managers
 * @desc    Create new manager
 * @access  Private (Owner only)
 */
router.post(
  '/managers',
  authenticate,
  requireOwner,
  attachOwnerModels,
  sanitizeInput,
  validate(createManagerSchema),
  asyncHandler(createManager)
);

/**
 * @route   GET /api/staff/managers
 * @desc    Get all managers
 * @access  Private (Owner only)
 */
router.get(
  '/managers',
  authenticate,
  requireOwner,
  attachOwnerModels,
  asyncHandler(getAllManagers)
);

/**
 * @route   GET /api/staff/managers/:id
 * @desc    Get single manager details
 * @access  Private (Owner only)
 */
router.get(
  '/managers/:id',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getManagerById)
);

/**
 * @route   PUT /api/staff/managers/:id
 * @desc    Update manager
 * @access  Private (Owner only)
 */
router.put(
  '/managers/:id',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  sanitizeInput,
  validate(updateManagerSchema),
  asyncHandler(updateManager)
);

/**
 * @route   PATCH /api/staff/managers/:id/restaurants
 * @desc    Assign/Unassign restaurants to manager
 * @access  Private (Owner only)
 */
router.patch(
  '/managers/:id/restaurants',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  validate(updateManagerRestaurantsSchema),
  asyncHandler(updateManagerRestaurants)
);

/**
 * @route   DELETE /api/staff/managers/:id
 * @desc    Delete manager (soft delete)
 * @access  Private (Owner only)
 */
router.delete(
  '/managers/:id',
  authenticate,
  requireOwner,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(deleteManager)
);

/**
 * ========================================
 * EMPLOYEE ROUTES
 * ========================================
 */

/**
 * @route   POST /api/staff/employees
 * @desc    Create new employee
 * @access  Private (Owner/Manager)
 */
router.post(
  '/employees',
  authenticate,
  requireManager,
  attachOwnerModels,
  sanitizeInput,
  validate(createEmployeeSchema),
  asyncHandler(createEmployee)
);

/**
 * @route   GET /api/staff/employees
 * @desc    Get all employees
 * @access  Private (Owner/Manager)
 */
router.get(
  '/employees',
  authenticate,
  requireManager,
  attachOwnerModels,
  asyncHandler(getAllEmployees)
);

/**
 * @route   GET /api/staff/employees/:id
 * @desc    Get single employee details
 * @access  Private (Owner/Manager)
 */
router.get(
  '/employees/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getEmployeeById)
);

/**
 * @route   PUT /api/staff/employees/:id
 * @desc    Update employee
 * @access  Private (Owner/Manager)
 */
router.put(
  '/employees/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  sanitizeInput,
  validate(updateEmployeeSchema),
  asyncHandler(updateEmployee)
);

/**
 * @route   DELETE /api/staff/employees/:id
 * @desc    Delete employee (soft delete)
 * @access  Private (Owner/Manager)
 */
router.delete(
  '/employees/:id',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(deleteEmployee)
);

/**
 * ========================================
 * STATISTICS
 * ========================================
 */

/**
 * @route   GET /api/staff/stats
 * @desc    Get staff statistics
 * @access  Private (Owner/Manager)
 */
router.get(
  '/stats',
  authenticate,
  requireManager,
  attachOwnerModels,
  asyncHandler(getStaffStats)
);

module.exports = router;