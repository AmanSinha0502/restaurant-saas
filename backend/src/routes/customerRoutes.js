const express = require('express');
const router = express.Router();

const {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllCustomers,
  getCustomerById,
  blockCustomer,
  unblockCustomer,
  awardLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyHistory,
  getCustomerAnalytics
} = require('../controllers/customerController');

const {
  authenticate,
  requireManager,
  requireStaff,
  requireCustomer,
  attachOwnerModels,
  validate,
  validateObjectId,
  asyncHandler,
  sanitizeInput
} = require('../middlewares');

const {
  registerCustomerSchema,
  loginCustomerSchema,
  updateCustomerProfileSchema,
  changePasswordSchema,
  addAddressSchema,
  updateAddressSchema,
  blockCustomerSchema,
  filterCustomersSchema,
  awardPointsSchema,
  redeemPointsSchema
} = require('../validators/customerValidator');

// ============================================
// PUBLIC ROUTES (No Authentication)
// ============================================

router.post('/register', attachOwnerModels, sanitizeInput, validate(registerCustomerSchema), asyncHandler(registerCustomer));
router.post('/login', attachOwnerModels, validate(loginCustomerSchema), asyncHandler(loginCustomer));

// ============================================
// CUSTOMER ROUTES (Customer Authentication)
// ============================================

// Profile Management
router.get('/profile', authenticate, requireCustomer, attachOwnerModels, asyncHandler(getCustomerProfile));
router.put('/profile', authenticate, requireCustomer, attachOwnerModels, sanitizeInput, validate(updateCustomerProfileSchema), asyncHandler(updateCustomerProfile));
router.post('/change-password', authenticate, requireCustomer, attachOwnerModels, validate(changePasswordSchema), asyncHandler(changePassword));

// Address Management
router.post('/addresses', authenticate, requireCustomer, attachOwnerModels, sanitizeInput, validate(addAddressSchema), asyncHandler(addAddress));
router.put('/addresses/:addressId', authenticate, requireCustomer, attachOwnerModels, validateObjectId('addressId'), sanitizeInput, validate(updateAddressSchema), asyncHandler(updateAddress));
router.delete('/addresses/:addressId', authenticate, requireCustomer, attachOwnerModels, validateObjectId('addressId'), asyncHandler(deleteAddress));

// Loyalty
router.post('/loyalty/redeem', authenticate, requireCustomer, attachOwnerModels, validate(redeemPointsSchema), asyncHandler(redeemLoyaltyPoints));
router.get('/loyalty/history', authenticate, requireCustomer, attachOwnerModels, asyncHandler(getLoyaltyHistory));

// ============================================
// ADMIN ROUTES (Staff Authentication)
// ============================================

// Customer Management
router.get('/analytics', authenticate, requireStaff, attachOwnerModels, asyncHandler(getCustomerAnalytics));
router.get('/', authenticate, requireStaff, attachOwnerModels, validate(filterCustomersSchema, 'query'), asyncHandler(getAllCustomers));
router.get('/:id', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), asyncHandler(getCustomerById));

// Block/Unblock
router.post('/:id/block', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), validate(blockCustomerSchema), asyncHandler(blockCustomer));
router.post('/:id/unblock', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(unblockCustomer));

// Loyalty Management
router.post('/loyalty/award', authenticate, requireManager, attachOwnerModels, validate(awardPointsSchema), asyncHandler(awardLoyaltyPoints));

module.exports = router;