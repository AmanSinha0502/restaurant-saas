const Joi = require('joi');

/**
 * Customer Registration Validation
 */
const customerRegisterSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 100 characters'
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
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.empty': 'Password is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid restaurant ID',
      'string.empty': 'Restaurant ID is required'
    }),
  
  ownerId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Owner ID is required'
    })
});

/**
 * Customer Login Validation
 */
const customerLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid restaurant ID',
      'string.empty': 'Restaurant ID is required'
    }),
  
  ownerId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Owner ID is required'
    })
});

/**
 * Admin Login Validation (Owner)
 */
const adminLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

/**
 * Staff Login Validation (Manager/Employee)
 */
const staffLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    }),
  
  ownerId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Owner ID is required'
    })
});

/**
 * Forgot Password Validation
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid restaurant ID',
      'string.empty': 'Restaurant ID is required'
    }),
  
  ownerId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Owner ID is required'
    })
});

/**
 * Reset Password Validation
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.empty': 'New password is required'
    }),
  
  ownerId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Owner ID is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid restaurant ID',
      'string.empty': 'Restaurant ID is required'
    })
});

/**
 * Change Password Validation
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'string.empty': 'New password is required',
      'any.invalid': 'New password must be different from current password'
    })
});

/**
 * OTP Request Validation (for future phone verification)
 */
const requestOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  
  ownerId: Joi.string()
    .required()
});

/**
 * OTP Verification Validation
 */
const verifyOTPSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required'
    }),
  
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only numbers',
      'string.empty': 'OTP is required'
    }),
  
  restaurantId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  
  ownerId: Joi.string()
    .required()
});

module.exports = {
  customerRegisterSchema,
  customerLoginSchema,
  adminLoginSchema,
  staffLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  requestOTPSchema,
  verifyOTPSchema
};