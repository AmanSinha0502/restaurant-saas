// ============================================
// CUSTOMER & LOYALTY VALIDATORS
// ============================================
// Save as: backend/src/validators/customerValidator.js

const Joi = require('joi');

// ============================================
// CUSTOMER VALIDATORS
// ============================================

const registerCustomerSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  fullName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).required(),
  password: Joi.string().min(8).max(50).required(),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say'),
  referralCode: Joi.string().length(8).uppercase()
});

const loginCustomerSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
  password: Joi.string().required()
}).xor('email', 'phone'); // Must have either email or phone

const updateCustomerProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  alternatePhone: Joi.string().allow(''),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say'),
  preferences: Joi.object({
    dietaryRestrictions: Joi.array().items(
      Joi.string().valid('vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher')
    ),
    spiceLevel: Joi.string().valid('mild', 'medium', 'hot', 'extra-hot'),
    allergies: Joi.array().items(Joi.string()),
    specialRequests: Joi.string().max(500).allow(''),
    communicationPreference: Joi.string().valid('email', 'sms', 'whatsapp', 'none'),
    marketingConsent: Joi.boolean()
  })
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(50).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match'
  })
});

const addAddressSchema = Joi.object({
  label: Joi.string().valid('home', 'work', 'other').default('home'),
  street: Joi.string().required(),
  landmark: Joi.string().allow(''),
  city: Joi.string().required(),
  state: Joi.string().allow(''),
  postalCode: Joi.string().required(),
  coordinates: Joi.object({
    lat: Joi.number(),
    lng: Joi.number()
  }),
  isDefault: Joi.boolean().default(false)
});

const updateAddressSchema = Joi.object({
  label: Joi.string().valid('home', 'work', 'other'),
  street: Joi.string(),
  landmark: Joi.string().allow(''),
  city: Joi.string(),
  state: Joi.string().allow(''),
  postalCode: Joi.string(),
  isDefault: Joi.boolean()
}).min(1);

// ============================================
// ADMIN CUSTOMER MANAGEMENT VALIDATORS
// ============================================

const blockCustomerSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required()
});

const addCustomerNoteSchema = Joi.object({
  note: Joi.string().min(5).max(1000).required()
});

const addCustomerTagSchema = Joi.object({
  tag: Joi.string().min(2).max(50).required()
});

const filterCustomersSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  status: Joi.string().valid('active', 'inactive', 'blocked', 'suspended'),
  tier: Joi.string().valid('bronze', 'silver', 'gold', 'platinum'),
  segment: Joi.string().valid('champions', 'loyal', 'potential', 'at-risk', 'lost'),
  minSpent: Joi.number().min(0),
  maxSpent: Joi.number().min(0),
  minOrders: Joi.number().min(0),
  maxOrders: Joi.number().min(0),
  registeredAfter: Joi.date(),
  registeredBefore: Joi.date(),
  lastOrderAfter: Joi.date(),
  lastOrderBefore: Joi.date(),
  search: Joi.string().max(100),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'fullName', 'totalSpent', 'totalOrders', 'lastOrderDate').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// ============================================
// LOYALTY VALIDATORS
// ============================================

const awardPointsSchema = Joi.object({
  customerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  points: Joi.number().min(1).required(),
  reason: Joi.string().min(5).max(500).required(),
  source: Joi.string().valid('order', 'referral', 'birthday', 'signup', 'review', 'social-share', 'manual', 'promotion').default('manual')
});

const redeemPointsSchema = Joi.object({
  points: Joi.number().min(1).required()
});

const adjustPointsSchema = Joi.object({
  customerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  points: Joi.number().required(), // Can be negative
  reason: Joi.string().min(5).max(500).required()
});

// ============================================
// REFERRAL VALIDATORS
// ============================================

const applyReferralCodeSchema = Joi.object({
  referralCode: Joi.string().length(8).uppercase().required()
});

// ============================================
// FEEDBACK VALIDATORS
// ============================================

const submitFeedbackSchema = Joi.object({
  orderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  rating: {
    food: Joi.number().min(1).max(5).required(),
    service: Joi.number().min(1).max(5).required(),
    delivery: Joi.number().min(1).max(5),
    ambiance: Joi.number().min(1).max(5)
  },
  comment: Joi.string().max(1000).allow(''),
  isAnonymous: Joi.boolean().default(false)
});

module.exports = {
  registerCustomerSchema,
  loginCustomerSchema,
  updateCustomerProfileSchema,
  changePasswordSchema,
  addAddressSchema,
  updateAddressSchema,
  blockCustomerSchema,
  addCustomerNoteSchema,
  addCustomerTagSchema,
  filterCustomersSchema,
  awardPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
  applyReferralCodeSchema,
  submitFeedbackSchema
};