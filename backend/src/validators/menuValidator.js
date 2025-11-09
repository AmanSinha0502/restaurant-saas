const Joi = require('joi');

/**
 * Multilingual Name/Description Schema
 */
const multilingualSchema = Joi.object({
  en: Joi.string().required().messages({
    'string.empty': 'English name is required'
  }),
  hi: Joi.string().allow(''),
  ar: Joi.string().allow('')
});

/**
 * Create Menu Item Validation
 */
const createMenuItemSchema = Joi.object({
  name: multilingualSchema.required(),
  
  description: multilingualSchema.required(),
  
  category: Joi.string()
    .valid('Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Salads', 'Sides', 'Combos')
    .required(),
  
  price: Joi.number()
    .min(0)
    .max(1000000)
    .required()
    .messages({
      'number.min': 'Price cannot be negative',
      'number.base': 'Price must be a number'
    }),
  
  currency: Joi.string().valid('INR', 'AED', 'USD', 'EUR', 'GBP'),
  
  dietaryType: Joi.string()
    .valid('veg', 'non-veg', 'vegan', 'egg')
    .default('veg'),
  
  preparationTime: Joi.number()
    .min(0)
    .max(300)
    .default(15),
  
  sharedAcrossBranches: Joi.boolean().default(true),
  
  specificBranches: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .when('sharedAcrossBranches', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  
  linkedInventoryItems: Joi.array().items(
    Joi.object({
      inventoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      quantityRequired: Joi.number().min(0).required(),
      unit: Joi.string().valid('grams', 'kg', 'ml', 'liters', 'pieces').required()
    })
  ),
  
  tags: Joi.array().items(Joi.string()),
  
  allergens: Joi.array().items(Joi.string()),
  
  calories: Joi.number().min(0),
  
  spiceLevel: Joi.string().valid('mild', 'medium', 'hot', 'extra-hot'),
  
  customizations: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      options: Joi.array().items(
        Joi.object({
          label: Joi.string().required(),
          priceModifier: Joi.number()
        })
      )
    })
  )
});

/**
 * Update Menu Item Validation
 */
const updateMenuItemSchema = Joi.object({
  name: multilingualSchema,
  description: multilingualSchema,
  category: Joi.string().valid('Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Salads', 'Sides', 'Combos'),
  price: Joi.number().min(0).max(1000000),
  currency: Joi.string().valid('INR', 'AED', 'USD', 'EUR', 'GBP'),
  dietaryType: Joi.string().valid('veg', 'non-veg', 'vegan', 'egg'),
  preparationTime: Joi.number().min(0).max(300),
  isActive: Joi.boolean(),
  sharedAcrossBranches: Joi.boolean(),
  specificBranches: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
  linkedInventoryItems: Joi.array().items(
    Joi.object({
      inventoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      quantityRequired: Joi.number().min(0).required(),
      unit: Joi.string().valid('grams', 'kg', 'ml', 'liters', 'pieces').required()
    })
  ),
  tags: Joi.array().items(Joi.string()),
  allergens: Joi.array().items(Joi.string()),
  calories: Joi.number().min(0),
  spiceLevel: Joi.string().valid('mild', 'medium', 'hot', 'extra-hot'),
  customizations: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      options: Joi.array().items(
        Joi.object({
          label: Joi.string().required(),
          priceModifier: Joi.number()
        })
      )
    })
  )
}).min(1); // At least one field required

/**
 * Toggle Availability Validation
 */
const toggleAvailabilitySchema = Joi.object({
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  
  isAvailable: Joi.boolean().required(),
  
  reason: Joi.string().allow('').max(200)
});

/**
 * Bulk Toggle Availability Validation
 */
const bulkToggleAvailabilitySchema = Joi.object({
  menuIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required(),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  
  isAvailable: Joi.boolean().required(),
  
  reason: Joi.string().allow('').max(200)
});

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema,
  toggleAvailabilitySchema,
  bulkToggleAvailabilitySchema
};