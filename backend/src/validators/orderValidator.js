const Joi = require('joi');

const createOrderSchema = Joi.object({
  ownerId: Joi.string().required(),
  restaurantId: Joi.string().required(),
  customer: Joi.object({
    userId: Joi.string().optional().allow(null),
    name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().optional().allow('', null)
  }).required(),
  orderType: Joi.string().valid('dine-in', 'takeaway', 'delivery').required(),
  orderSource: Joi.string().valid('website', 'pos').required(),
  items: Joi.array().items(
    Joi.object({
      menuId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required(),
      subtotal: Joi.number().min(0).required(),
      customizations: Joi.array().items(Joi.object({
        name: Joi.string(),
        selectedOption: Joi.string(),
        priceModifier: Joi.number().optional()
      })).optional(),
      specialInstructions: Joi.string().optional().allow('', null)
    })
  ).min(1).required(),
  pricing: Joi.object({
    subtotal: Joi.number().min(0).required(),
    tax: Joi.object({
      type: Joi.string().optional(),
      rate: Joi.number().min(0).max(100).optional(),
      amount: Joi.number().min(0).optional()
    }).optional(),
    deliveryCharge: Joi.number().min(0).optional(),
    discount: Joi.object({
      couponCode: Joi.string().optional(),
      amount: Joi.number().min(0).optional()
    }).optional(),
    total: Joi.number().min(0).required()
  }).required(),
  deliveryDetails: Joi.object().optional(),
  tableDetails: Joi.object().optional(),
  payment: Joi.object({
    method: Joi.string().valid('razorpay','stripe','paypal','cod','cash','card','upi').required(),
    status: Joi.string().valid('pending','paid','failed','refunded','partially-refunded').optional()
  }).required(),
  notes: Joi.string().optional().allow('', null)
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending','confirmed','preparing','ready','out-for-delivery','completed','cancelled').required(),
  note: Joi.string().optional().allow('', null)
});

module.exports = {
  createOrderSchema,
  updateStatusSchema
};
