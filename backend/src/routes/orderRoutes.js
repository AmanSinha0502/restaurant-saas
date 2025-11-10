// ============================================
// ORDER ROUTES
// ============================================
// Save as: backend/src/routes/orderRoutes.js

const express = require('express');
const router = express.Router();

const {
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  cancelOrder,
  verifyPayment,
  assignDeliveryBoy,
  getOrderStats
} = require('../controllers/orderController');

const {
  authenticate,
  optionalAuthenticate,
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
  createOrderSchema,
  updateOrderStatusSchema,
  assignDeliveryBoySchema,
  cancelOrderSchema,
  verifyPaymentSchema,
  filterOrdersSchema
} = require('../validators/orderValidator');

// ============================================
// PUBLIC / CUSTOMER ROUTES
// ============================================

// Create order (Customer - authenticated or guest)
router.post(
  '/',
  optionalAuthenticate,
  attachOwnerModels,
  sanitizeInput,
  validate(createOrderSchema),
  asyncHandler(createOrder)
);

// Verify payment (Customer)
router.post(
  '/:id/verify-payment',
  optionalAuthenticate,
  attachOwnerModels,
  validateObjectId('id'),
  validate(verifyPaymentSchema),
  asyncHandler(verifyPayment)
);

// Get my orders (Customer only)
router.get(
  '/my-orders',
  authenticate,
  requireCustomer,
  attachOwnerModels,
  asyncHandler(getMyOrders)
);

// Cancel order (Customer can cancel their own)
router.post(
  '/:id/cancel',
  authenticate,
  attachOwnerModels,
  validateObjectId('id'),
  validate(cancelOrderSchema),
  asyncHandler(cancelOrder)
);

// ============================================
// STAFF ROUTES (Manager/Employee)
// ============================================

// Get all orders (with filters)
router.get(
  '/',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validate(filterOrdersSchema, 'query'),
  asyncHandler(getAllOrders)
);

// Get single order
router.get(
  '/:id',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validateObjectId('id'),
  asyncHandler(getOrderById)
);

// Update order status
router.patch(
  '/:id/status',
  authenticate,
  requireStaff,
  attachOwnerModels,
  validateObjectId('id'),
  validate(updateOrderStatusSchema),
  asyncHandler(updateOrderStatus)
);

// Assign delivery boy
router.patch(
  '/:id/assign-delivery',
  authenticate,
  requireManager,
  attachOwnerModels,
  validateObjectId('id'),
  validate(assignDeliveryBoySchema),
  asyncHandler(assignDeliveryBoy)
);

// Get order statistics
router.get(
  '/stats',
  authenticate,
  requireStaff,
  attachOwnerModels,
  asyncHandler(getOrderStats)
);

module.exports = router;