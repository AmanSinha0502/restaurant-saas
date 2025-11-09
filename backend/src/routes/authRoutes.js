const express = require('express');
const router = express.Router();

// Controllers
const {
  customerRegister,
  customerLogin,
  adminLogin,
  staffLogin,
  logout,
  getCurrentUser,
  customerForgotPassword,
  customerResetPassword,
  changePassword
} = require('../controllers/authController');

// Middlewares
const {
  authenticate,
  validate,
  asyncHandler,
  authLimiter,
  passwordResetLimiter,
  sanitizeInput
} = require('../middlewares');

// Validators
const {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
  staffLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('../validators/authValidator');

/**
 * @route   POST /api/auth/customer/register
 * @desc    Register new customer
 * @access  Public
 */
router.post(
  '/customer/register',
  sanitizeInput,
  validate(customerRegisterSchema),
  asyncHandler(customerRegister)
);

/**
 * @route   POST /api/auth/customer/login
 * @desc    Customer login
 * @access  Public
 */
router.post(
  '/customer/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  sanitizeInput,
  validate(customerLoginSchema),
  asyncHandler(customerLogin)
);

/**
 * @route   POST /api/auth/admin/login
 * @desc    Owner login
 * @access  Public
 */
router.post(
  '/admin/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  sanitizeInput,
  validate(adminLoginSchema),
  asyncHandler(adminLogin)
);

/**
 * @route   POST /api/auth/staff/login
 * @desc    Manager/Employee login
 * @access  Public
 */
router.post(
  '/staff/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  sanitizeInput,
  validate(staffLoginSchema),
  asyncHandler(staffLogin)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear cookies)
 * @access  Private (all authenticated users)
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(logout)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user
 * @access  Private (all authenticated users)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(getCurrentUser)
);

/**
 * @route   POST /api/auth/customer/forgot-password
 * @desc    Request password reset (customer)
 * @access  Public
 */
router.post(
  '/customer/forgot-password',
  passwordResetLimiter, // Rate limit: 3 attempts per hour
  sanitizeInput,
  validate(forgotPasswordSchema),
  asyncHandler(customerForgotPassword)
);

/**
 * @route   POST /api/auth/customer/reset-password
 * @desc    Reset password using token (customer)
 * @access  Public
 */
router.post(
  '/customer/reset-password',
  sanitizeInput,
  validate(resetPasswordSchema),
  asyncHandler(customerResetPassword)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated users)
 * @access  Private (all authenticated users)
 */
router.post(
  '/change-password',
  authenticate,
  sanitizeInput,
  validate(changePasswordSchema),
  asyncHandler(changePassword)
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token in cookie)
 */
router.post(
  '/refresh-token',
  asyncHandler(async (req, res) => {
    const { refreshToken: refreshTokenHandler } = require('../middlewares/authMiddleware');
    return refreshTokenHandler(req, res);
  })
);

module.exports = router;