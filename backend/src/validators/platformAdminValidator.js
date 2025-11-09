const Joi = require('joi');

/**
 * Create Owner Validation
 */
const createOwnerSchema = Joi.object({
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
    })
});

/**
 * Update Owner Validation
 */
const updateOwnerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).trim(),
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/),
  isActive: Joi.boolean()
}).min(1); // At least one field required

/**
 * Toggle Owner Status Validation
 */
const toggleStatusSchema = Joi.object({
  isActive: Joi.boolean().required()
});

/**
 * Reset Owner Password Validation
 */
const resetOwnerPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
});

module.exports = {
  createOwnerSchema,
  updateOwnerSchema,
  toggleStatusSchema,
  resetOwnerPasswordSchema
};