/**
 * Centralized Middleware Index
 * Export all middlewares for easy imports
 */

// Authentication & Authorization
const {
  authenticate,
  optionalAuthenticate,
  refreshToken
} = require('./authMiddleware');

const {
  requireRole,
  requirePlatformAdmin,
  requireOwner,
  requireManager,
  requireStaff,
  requireCustomer,
  requirePermission,
  requireRestaurantAccess,
  requireOwnership,
  requireEmployeeType
} = require('./roleMiddleware');

// Multi-tenant Data Filtering
const {
  attachOwnerModels,
  enforceRestaurantFilter,
  autoFilterByRestaurant,
  validateOwnerContext,
  applyTenantFilter,
  cleanupTenantFilter
} = require('./tenantMiddleware');

// Validation
const {
  validate,
  validateObjectId,
  validatePagination,
  validateDateRange,
  sanitizeInput,
  validateFileUpload,
  requireFields,
  commonSchemas
} = require('./validationMiddleware');

// Error Handling
const {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  gracefulShutdown,
  rateLimitErrorHandler
} = require('./errorMiddleware');

// Rate Limiting
const {
  apiLimiter,
  authLimiter,
  orderLimiter,
  passwordResetLimiter,
  otpLimiter,
  createRateLimiter,
  roleBasedLimiter,
  conditionalLimiter,
  bypassForWhitelist,
  RedisStore
} = require('./rateLimitMiddleware');

// File Upload
const {
  uploadImage,
  uploadImages,
  uploadDocument,
  createUploader,
  handleUploadError,
  deleteUploadedFile,
  deleteUploadedFiles,
  cleanupOldFiles,
  getFileUrl,
  validateImageDimensions,
  optimizeImages
} = require('./uploadMiddleware');

module.exports = {
  // Authentication
  authenticate,
  optionalAuthenticate,
  refreshToken,
  
  // Authorization
  requireRole,
  requirePlatformAdmin,
  requireOwner,
  requireManager,
  requireStaff,
  requireCustomer,
  requirePermission,
  requireRestaurantAccess,
  requireOwnership,
  requireEmployeeType,
  
  // Multi-tenant
  attachOwnerModels,
  enforceRestaurantFilter,
  autoFilterByRestaurant,
  validateOwnerContext,
  applyTenantFilter,
  cleanupTenantFilter,
  
  // Validation
  validate,
  validateObjectId,
  validatePagination,
  validateDateRange,
  sanitizeInput,
  validateFileUpload,
  requireFields,
  commonSchemas,
  
  // Error Handling
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  gracefulShutdown,
  rateLimitErrorHandler,
  
  // Rate Limiting
  apiLimiter,
  authLimiter,
  orderLimiter,
  passwordResetLimiter,
  otpLimiter,
  createRateLimiter,
  roleBasedLimiter,
  conditionalLimiter,
  bypassForWhitelist,
  RedisStore,
  
  // File Upload
  uploadImage,
  uploadImages,
  uploadDocument,
  createUploader,
  handleUploadError,
  deleteUploadedFile,
  deleteUploadedFiles,
  cleanupOldFiles,
  getFileUrl,
  validateImageDimensions,
  optimizeImages
};