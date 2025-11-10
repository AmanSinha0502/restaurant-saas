// ============================================
// ORDER VALIDATORS
// ============================================
// Save as: backend/src/validators/orderValidator.js

const Joi = require('joi');

// ============================================
// CREATE ORDER SCHEMA (Customer/POS)
// ============================================

const createOrderSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  customer: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).required(),
    email: Joi.string().email()
  }).required(),
  
  orderType: Joi.string().valid('dine-in', 'takeaway', 'delivery').required(),
  orderSource: Joi.string().valid('website', 'pos', 'phone', 'walkin').default('website'),
  
  items: Joi.array().min(1).items(
    Joi.object({
      menuId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().min(1).max(50).required(),
      price: Joi.number().min(0).required(),
      specialInstructions: Joi.string().max(500).allow(''),
      customizations: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          value: Joi.string().required(),
          price: Joi.number().min(0).default(0)
        })
      )
    })
  ).required(),
  
  deliveryDetails: Joi.object({
    address: Joi.object({
      street: Joi.string().required(),
      landmark: Joi.string().allow(''),
      city: Joi.string().required(),
      state: Joi.string(),
      postalCode: Joi.string().required(),
      coordinates: Joi.object({
        lat: Joi.number(),
        lng: Joi.number()
      })
    }).required(),
    deliveryInstructions: Joi.string().max(500).allow('')
  }).when('orderType', {
    is: 'delivery',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  tableDetails: Joi.object({
    tableId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    tableNumber: Joi.string(),
    numberOfGuests: Joi.number().min(1).max(50)
  }).when('orderType', {
    is: 'dine-in',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  payment: Joi.object({
    method: Joi.string().valid('razorpay', 'stripe', 'paypal', 'cod', 'cash', 'card', 'upi').required()
  }).required(),
  
  couponCode: Joi.string().allow(''),
  tip: Joi.number().min(0).default(0),
  notes: Joi.string().max(500).allow('')
});

// ============================================
// UPDATE ORDER STATUS SCHEMA
// ============================================

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled').required(),
  note: Joi.string().max(500).allow('')
});

// ============================================
// ASSIGN DELIVERY BOY SCHEMA
// ============================================

const assignDeliveryBoySchema = Joi.object({
  deliveryBoyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  estimatedDeliveryTime: Joi.date().min('now')
});

// ============================================
// CANCEL ORDER SCHEMA
// ============================================

const cancelOrderSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required(),
  requestRefund: Joi.boolean().default(true)
});

// ============================================
// VERIFY PAYMENT SCHEMA
// ============================================

const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});

// ============================================
// ADD RATING SCHEMA
// ============================================

const addRatingSchema = Joi.object({
  food: Joi.number().min(1).max(5).required(),
  service: Joi.number().min(1).max(5).required(),
  delivery: Joi.number().min(1).max(5).when('orderType', {
    is: 'delivery',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  comment: Joi.string().max(1000).allow('')
});

// ============================================
// FILTER ORDERS SCHEMA (Query Params)
// ============================================

const filterOrdersSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'),
  orderType: Joi.string().valid('dine-in', 'takeaway', 'delivery'),
  orderSource: Joi.string().valid('website', 'pos', 'phone', 'walkin'),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
  startDate: Joi.date(),
  endDate: Joi.date(),
  search: Joi.string().max(100),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'status', 'total', 'orderNumber').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// ============================================
// POS ORDER SCHEMA (Simplified for staff)
// ============================================

const createPOSOrderSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  customer: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).required()
  }).required(),
  
  orderType: Joi.string().valid('dine-in', 'takeaway', 'delivery').required(),
  
  items: Joi.array().min(1).items(
    Joi.object({
      menuId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().min(1).max(50).required()
    })
  ).required(),
  
  tableId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).when('orderType', {
    is: 'dine-in',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  
  payment: Joi.object({
    method: Joi.string().valid('cash', 'card', 'upi').required(),
    amountReceived: Joi.number().min(0).when('method', {
      is: 'cash',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).required(),
  
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed').required(),
    value: Joi.number().min(0).required(),
    reason: Joi.string().required()
  }),
  
  notes: Joi.string().max(500).allow('')
});

// ============================================
// REFUND REQUEST SCHEMA
// ============================================

const refundOrderSchema = Joi.object({
  amount: Joi.number().min(0).required(),
  reason: Joi.string().min(10).max(500).required()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  assignDeliveryBoySchema,
  cancelOrderSchema,
  verifyPaymentSchema,
  addRatingSchema,
  filterOrdersSchema,
  createPOSOrderSchema,
  refundOrderSchema
};