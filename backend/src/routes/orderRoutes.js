const express = require('express');
const router = express.Router();

const {
  createOrder,
  listOrders,
  getOrder,
  updateStatus,
  cancelOrder
} = require('../controllers/orderController');

const {
  optionalAuthenticate,
  authenticate,
  validate,
  asyncHandler,
  attachOwnerModels,
  enforceRestaurantFilter,
  autoFilterByRestaurant,
  cleanupTenantFilter
} = require('../middlewares');

const { createOrderSchema, updateStatusSchema } = require('../validators/orderValidator');

/**
 * Public endpoint for customers (guests allowed)
 * Customers may pass ownerId in body when not authenticated
 */
router.post(
  '/',
  optionalAuthenticate,
  validate(createOrderSchema),
  asyncHandler(createOrder)
);

// Protected routes (owner/manager/staff)
router.get(
  '/',
  authenticate,
  attachOwnerModels,
  autoFilterByRestaurant,
  asyncHandler(listOrders),
  cleanupTenantFilter
);

router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(getOrder)
);

router.patch(
  '/:id/status',
  authenticate,
  attachOwnerModels,
  validate(updateStatusSchema),
  asyncHandler(updateStatus)
);

router.post(
  '/:id/cancel',
  optionalAuthenticate,
  asyncHandler(cancelOrder)
);

module.exports = router;
