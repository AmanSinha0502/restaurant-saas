/**
 * Centralized Model Index
 * Exports all models and their getter functions for easy imports
 */

// Platform Database Models (Static - always use platform_main database)
const PlatformAdmin = require('./PlatformAdmin');
const Owner = require('./Owner');

// Owner Database Models (Dynamic - use owner-specific database)
const { restaurantSchema, getRestaurantModel } = require('./Restaurant');
const { managerSchema, getManagerModel } = require('./Manager');
const { employeeSchema, getEmployeeModel } = require('./Employee');
const { menuSchema, getMenuModel } = require('./Menu');
const { orderSchema, getOrderModel } = require('./Order');
const { customerSchema, getCustomerModel } = require('./Customer');
const { tableSchema, getTableModel } = require('./Table');
const { reservationSchema, getReservationModel } = require('./Reservation');
const { inventorySchema, getInventoryModel } = require('./Inventory');
const { couponSchema, getCouponModel } = require('./Coupon');
const { loyaltyPointSchema, getLoyaltyPointModel } = require('./LoyaltyPoint');
const { transactionSchema, getTransactionModel } = require('./Transaction');
const { notificationSchema, getNotificationModel } = require('./Notification');
const { auditLogSchema, getAuditLogModel } = require('./AuditLog');
/**
 * Get all models for a specific owner
 * This is the primary function to use when working with owner-specific data
 * 
 * @param {String} ownerId - The owner's ID
 * @returns {Object} - Object containing all model instances for this owner
 * 
 * @example
 * const models = getOwnerModels('owner_123');
 * const restaurants = await models.Restaurant.find();
 */
const getOwnerModels = (ownerId) => {
  if (!ownerId) {
    throw new Error('ownerId is required to get owner models');
  }
  return {
    Restaurant: getRestaurantModel(ownerId),
    Manager: getManagerModel(ownerId),
    Employee: getEmployeeModel(ownerId),
    Menu: getMenuModel(ownerId),
    Order: getOrderModel(ownerId),
    Customer: getCustomerModel(ownerId),
    Table: getTableModel(ownerId),
    Reservation: getReservationModel(ownerId),
    Inventory: getInventoryModel(ownerId),
    Coupon: getCouponModel(ownerId),
    LoyaltyPoint: getLoyaltyPointModel(ownerId),
    Transaction: getTransactionModel(ownerId),
    Notification: getNotificationModel(ownerId),
    AuditLog: getAuditLogModel(ownerId)
  };
};

/**
 * Get a specific model for an owner
 * Useful when you only need one model
 * 
 * @param {String} ownerId - The owner's ID
 * @param {String} modelName - Name of the model (e.g., 'Restaurant', 'Order')
 * @returns {Model} - Mongoose model instance
 * 
 * @example
 * const RestaurantModel = getOwnerModel('owner_123', 'Restaurant');
 * const restaurant = await RestaurantModel.findById(restaurantId);
 */
const getOwnerModel = (ownerId, modelName) => {
  if (!ownerId) throw new Error("ownerId is required");
  
  const models = getOwnerModels(ownerId);

  if (!models[modelName]) {
    throw new Error(`Model '${modelName}' not found`);
  }

  return models[modelName];
};


// Export Platform Models (direct access)
module.exports = {
  // Platform Database Models
  PlatformAdmin,
  Owner,
  
  // Owner Database Model Getters
  getOwnerModels,
  getOwnerModel,
  
  // Individual Model Getters (for flexibility)
  getRestaurantModel,
  getManagerModel,
  getEmployeeModel,
  getMenuModel,
  getOrderModel,
  getCustomerModel,
  getTableModel,
  getReservationModel,
  getInventoryModel,
  getCouponModel,
  getLoyaltyPointModel,
  getTransactionModel,
  getNotificationModel,
  getAuditLogModel,
  
  // Schemas (for reference or extending)
  schemas: {
    restaurantSchema,
    managerSchema,
    employeeSchema,
    menuSchema,
    orderSchema,
    customerSchema,
    tableSchema,
    reservationSchema,
    inventorySchema,
    couponSchema,
    loyaltyPointSchema,
    transactionSchema,
    notificationSchema,
    auditLogSchema
  }
};