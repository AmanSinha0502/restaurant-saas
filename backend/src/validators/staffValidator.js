const Joi = require('joi');

/**
 * Create Manager Validation
 */
const createManagerSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters'
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
    }),
  
  assignedRestaurants: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(0)
    .messages({
      'array.base': 'Assigned restaurants must be an array',
      'string.pattern.base': 'Invalid restaurant ID format'
    }),
  
  permissions: Joi.object({
    canEditMenu: Joi.boolean(),
    canManageInventory: Joi.boolean(),
    canViewReports: Joi.boolean(),
    canManageStaff: Joi.boolean(),
    canEditSettings: Joi.boolean(),
    canManageReservations: Joi.boolean(),
    canProcessRefunds: Joi.boolean()
  })
});

/**
 * Update Manager Validation
 */
const updateManagerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim(),
  
  email: Joi.string().email().lowercase().trim(),
  
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
  
  assignedRestaurants: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(0),
  
  permissions: Joi.object({
    canEditMenu: Joi.boolean(),
    canManageInventory: Joi.boolean(),
    canViewReports: Joi.boolean(),
    canManageStaff: Joi.boolean(),
    canEditSettings: Joi.boolean(),
    canManageReservations: Joi.boolean(),
    canProcessRefunds: Joi.boolean()
  }),
  
  isActive: Joi.boolean()
}).min(1); // At least one field required

/**
 * Update Manager Restaurants Validation
 */
const updateManagerRestaurantsSchema = Joi.object({
  restaurantIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one restaurant ID is required',
      'string.pattern.base': 'Invalid restaurant ID format'
    }),
  
  action: Joi.string()
    .valid('assign', 'unassign')
    .required()
    .messages({
      'any.only': 'Action must be either "assign" or "unassign"'
    })
});

/**
 * Create Employee Validation
 */
const createEmployeeSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters'
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid restaurant ID format',
      'string.empty': 'Restaurant ID is required'
    }),
  
  employeeType: Joi.string()
    .valid('cashier', 'kitchen_staff', 'delivery_boy', 'waiter')
    .required()
    .messages({
      'any.only': 'Employee type must be one of: cashier, kitchen_staff, delivery_boy, waiter',
      'string.empty': 'Employee type is required'
    })
});

/**
 * Update Employee Validation
 */
const updateEmployeeSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim(),
  
  email: Joi.string().email().lowercase().trim(),
  
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
  
  employeeType: Joi.string()
    .valid('cashier', 'kitchen_staff', 'delivery_boy', 'waiter'),
  
  permissions: Joi.object({
    canAccessPOS: Joi.boolean(),
    canAccessKDS: Joi.boolean(),
    canViewOrders: Joi.boolean(),
    canEditOrders: Joi.boolean(),
    canManageDeliveries: Joi.boolean()
  }),
  
  isActive: Joi.boolean()
}).min(1); // At least one field required

module.exports = {
  createManagerSchema,
  updateManagerSchema,
  updateManagerRestaurantsSchema,
  createEmployeeSchema,
  updateEmployeeSchema
};