const Joi = require('joi');

/**
 * Create Restaurant Validation
 */
const createRestaurantSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Restaurant name is required',
      'string.min': 'Restaurant name must be at least 2 characters'
    }),
  
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().valid('India', 'UAE', 'USA', 'UK').required()
  }).required(),
  
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .required(),
  
  email: Joi.string().email().lowercase().trim(),
  
  country: Joi.string().valid('India', 'UAE', 'USA', 'UK').required(),
  
  currency: Joi.string().valid('INR', 'AED', 'USD', 'EUR', 'GBP'),
  
  defaultLanguage: Joi.string().valid('en', 'hi', 'ar'),
  
  taxSettings: Joi.object({
    taxNumber: Joi.string().allow(''),
    taxRate: Joi.number().min(0).max(100),
    applyOnFood: Joi.boolean(),
    applyOnReservations: Joi.boolean(),
    applyOnDelivery: Joi.boolean()
  }),
  
  reservationSettings: Joi.object({
    advancePaymentType: Joi.string().valid('percentage', 'fixed'),
    advanceAmount: Joi.number().min(0),
    minimumAdvance: Joi.number().min(0),
    defaultDiningDuration: Joi.number().min(30).max(300)
  })
});

/**
 * Update Restaurant Validation
 */
const updateRestaurantSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim(),
  
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string().valid('India', 'UAE', 'USA', 'UK')
  }),
  
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
  
  email: Joi.string().email().lowercase().trim(),
  
  taxSettings: Joi.object({
    taxType: Joi.string().valid('GST', 'VAT', 'Sales Tax'),
    taxNumber: Joi.string().allow(''),
    taxRate: Joi.number().min(0).max(100),
    applyOnFood: Joi.boolean(),
    applyOnReservations: Joi.boolean(),
    applyOnDelivery: Joi.boolean()
  }),
  
  reservationSettings: Joi.object({
    advancePaymentType: Joi.string().valid('percentage', 'fixed'),
    advanceAmount: Joi.number().min(0),
    minimumAdvance: Joi.number().min(0),
    cancellationPolicy: Joi.string(),
    defaultDiningDuration: Joi.number().min(30).max(300)
  }),
  
  branding: Joi.object({
    logo: Joi.string().uri(),
    primaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
    secondaryColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i)
  }),
  
  paymentGateways: Joi.object({
    razorpay: Joi.object({
      enabled: Joi.boolean(),
      keyId: Joi.string().allow(''),
      keySecret: Joi.string().allow('')
    }),
    stripe: Joi.object({
      enabled: Joi.boolean(),
      publishableKey: Joi.string().allow(''),
      secretKey: Joi.string().allow('')
    }),
    paypal: Joi.object({
      enabled: Joi.boolean(),
      clientId: Joi.string().allow(''),
      secret: Joi.string().allow('')
    }),
    cod: Joi.object({
      enabled: Joi.boolean()
    })
  }),
  
  operatingHours: Joi.array().items(
    Joi.object({
      day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      isOpen: Joi.boolean(),
      openTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closeTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  )
}).min(1); // At least one field required

/**
 * Update Restaurant Status Validation
 */
const updateStatusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'suspended').required()
});

module.exports = {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateStatusSchema
};