// const mongoose = require('mongoose');

// const inventorySchema = new mongoose.Schema({
//   restaurantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Restaurant',
//     required: true,
//     index: true
//   },
  
//   itemName: {
//     en: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     hi: {
//       type: String,
//       trim: true
//     },
//     ar: {
//       type: String,
//       trim: true
//     }
//   },
  
//   category: {
//     type: String,
//     required: true,
//     enum: [
//       'Vegetables',
//       'Fruits',
//       'Meat & Poultry',
//       'Seafood',
//       'Dairy',
//       'Grains & Pulses',
//       'Spices',
//       'Oils & Fats',
//       'Beverages',
//       'Packaging',
//       'Cleaning Supplies',
//       'Other'
//     ]
//   },
  
//   currentStock: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 0
//   },
  
//   unit: {
//     type: String,
//     required: true,
//     enum: ['kg', 'grams', 'liters', 'ml', 'pieces', 'packets', 'boxes']
//   },
  
//   minimumStock: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 10
//   },
  
//   maximumStock: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 100
//   },
  
//   reorderPoint: {
//     type: Number,
//     required: true,
//     min: 0,
//     default: 20
//   },
  
//   unitPrice: {
//     type: Number,
//     required: true,
//     min: 0
//   },
  
//   currency: {
//     type: String,
//     default: 'INR'
//   },
  
//   supplier: {
//     name: {
//       type: String,
//       required: true
//     },
//     phone: String,
//     email: String,
//     address: String
//   },
  
//   expiryDate: Date,
  
//   stockHistory: [{
//     type: {
//       type: String,
//       enum: ['restock', 'deduction', 'wastage', 'adjustment', 'transfer'],
//       required: true
//     },
//     quantity: {
//       type: Number,
//       required: true
//     },
//     reason: String,
//     invoice: String,
//     relatedOrderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Order'
//     },
//     updatedBy: String, // userId
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     notes: String
//   }],
  
//   lastRestocked: Date,
  
//   isPerishable: {
//     type: Boolean,
//     default: false
//   },
  
//   status: {
//     type: String,
//     enum: ['in_stock', 'low_stock', 'out_of_stock', 'expired'],
//     default: 'in_stock',
//     index: true
//   },
  
//   // Automatic stock alerts sent
//   alertsSent: [{
//     type: {
//       type: String,
//       enum: ['low_stock', 'out_of_stock', 'expiry_warning']
//     },
//     sentAt: Date,
//     recipientIds: [String]
//   }],
  
//   // For inventory valuation
//   averageCost: {
//     type: Number,
//     default: 0
//   },
  
//   totalValue: {
//     type: Number,
//     default: 0
//   },
  
//   createdBy: String // ownerId or managerId
// }, {
//   timestamps: true
// });

// // Indexes
// inventorySchema.index({ restaurantId: 1, category: 1 });
// inventorySchema.index({ restaurantId: 1, status: 1 });
// inventorySchema.index({ expiryDate: 1 });

// // Pre-save: Update status based on stock levels
// inventorySchema.pre('save', function(next) {
//   if (this.currentStock === 0) {
//     this.status = 'out_of_stock';
//   } else if (this.currentStock <= this.minimumStock) {
//     this.status = 'low_stock';
//   } else {
//     this.status = 'in_stock';
//   }
  
//   // Check expiry
//   if (this.expiryDate && this.expiryDate < new Date()) {
//     this.status = 'expired';
//   }
  
//   // Update total value
//   this.totalValue = this.currentStock * this.unitPrice;
  
//   next();
// });

// // Method to add stock (restock)
// inventorySchema.methods.addStock = function(quantity, reason, updatedBy, invoice = null, notes = null) {
//   this.currentStock += quantity;
//   this.lastRestocked = new Date();
  
//   this.stockHistory.push({
//     type: 'restock',
//     quantity: quantity,
//     reason: reason || 'New stock purchase',
//     invoice,
//     updatedBy,
//     timestamp: new Date(),
//     notes
//   });
  
//   return this.save();
// };

// // Method to deduct stock
// inventorySchema.methods.deductStock = function(quantity, orderId = null, updatedBy = 'system') {
//   if (this.currentStock < quantity) {
//     throw new Error(`Insufficient stock. Available: ${this.currentStock}, Required: ${quantity}`);
//   }
  
//   this.currentStock -= quantity;
  
//   this.stockHistory.push({
//     type: 'deduction',
//     quantity: -quantity,
//     reason: orderId ? `Order #${orderId}` : 'Stock deduction',
//     relatedOrderId: orderId,
//     updatedBy,
//     timestamp: new Date()
//   });
  
//   return this.save();
// };

// // Method to record wastage
// inventorySchema.methods.recordWastage = function(quantity, reason, updatedBy) {
//   if (this.currentStock < quantity) {
//     throw new Error(`Cannot record wastage more than current stock`);
//   }
  
//   this.currentStock -= quantity;
  
//   this.stockHistory.push({
//     type: 'wastage',
//     quantity: -quantity,
//     reason: reason || 'Wastage/Spoilage',
//     updatedBy,
//     timestamp: new Date()
//   });
  
//   return this.save();
// };

// // Method to adjust stock manually
// inventorySchema.methods.adjustStock = function(newQuantity, reason, updatedBy) {
//   const difference = newQuantity - this.currentStock;
  
//   this.currentStock = newQuantity;
  
//   this.stockHistory.push({
//     type: 'adjustment',
//     quantity: difference,
//     reason: reason || 'Manual adjustment',
//     updatedBy,
//     timestamp: new Date()
//   });
  
//   return this.save();
// };

// // Method to check if stock is low
// inventorySchema.methods.isLowStock = function() {
//   return this.currentStock <= this.reorderPoint;
// };

// // Method to check if expiring soon (within 3 days)
// inventorySchema.methods.isExpiringSoon = function() {
//   if (!this.expiryDate || !this.isPerishable) return false;
  
//   const threeDaysFromNow = new Date();
//   threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
//   return this.expiryDate <= threeDaysFromNow;
// };

// // Static method to get low stock items
// inventorySchema.statics.getLowStockItems = function(restaurantId) {
//   return this.find({
//     restaurantId,
//     status: 'low_stock'
//   }).sort({ currentStock: 1 });
// };

// // Static method to get out of stock items
// inventorySchema.statics.getOutOfStockItems = function(restaurantId) {
//   return this.find({
//     restaurantId,
//     status: 'out_of_stock'
//   });
// };

// // Static method to get expiring items
// inventorySchema.statics.getExpiringItems = function(restaurantId) {
//   const threeDaysFromNow = new Date();
//   threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
//   return this.find({
//     restaurantId,
//     isPerishable: true,
//     expiryDate: { $lte: threeDaysFromNow, $gte: new Date() }
//   }).sort({ expiryDate: 1 });
// };

// // Method to get Inventory model with owner database connection
// const getInventoryModel = (ownerId) => {
//   const dbName = `owner_${ownerId}`;
//   const connection = mongoose.connection.useDb(dbName, { useCache: true });
//   return connection.model('Inventory', inventorySchema);
// };

// module.exports = { inventorySchema, getInventoryModel };




// ============================================
// INVENTORY MODEL
// ============================================
// Save as: backend/src/models/Inventory.js

const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  // Basic Info
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  // Item Details
  itemName: {
    en: {
      type: String,
      required: true
    },
    hi: String,
    ar: String
  },
  
  sku: {
    type: String,
    unique: true,
    sparse: true // Allows null values
  },
  
  category: {
    type: String,
    enum: [
      'vegetables',
      'fruits',
      'meat-poultry',
      'seafood',
      'dairy',
      'grains-pulses',
      'spices-condiments',
      'oils-fats',
      'beverages',
      'packaging',
      'cleaning-supplies',
      'other'
    ],
    required: true,
    index: true
  },
  
  // Stock Details
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  unit: {
    type: String,
    enum: ['kg', 'g', 'L', 'mL', 'pcs', 'dozen', 'box', 'packet', 'bottle', 'can'],
    required: true
  },
  
  // Stock Thresholds
  minimumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  maximumStock: {
    type: Number,
    min: 0
  },
  
  reorderPoint: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  reorderQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Pricing
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Supplier Details
  supplier: {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    name: String,
    phone: String,
    email: String,
    address: String
  },
  
  // Alternative Suppliers
  alternativeSuppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    name: String,
    unitPrice: Number,
    deliveryTime: Number, // days
    minimumOrderQuantity: Number
  }],
  
  // Storage Details
  storageLocation: {
    type: String,
    enum: ['cold-storage', 'freezer', 'dry-storage', 'pantry', 'refrigerator', 'counter'],
    default: 'dry-storage'
  },
  
  storageConditions: {
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    },
    humidity: String,
    specialInstructions: String
  },
  
  // Perishability
  isPerishable: {
    type: Boolean,
    default: false
  },
  
  shelfLife: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years']
    }
  },
  
  expiryDate: Date,
  
  // Stock History
  stockHistory: [{
    type: {
      type: String,
      enum: ['restock', 'deduction', 'wastage', 'adjustment', 'transfer', 'return'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousStock: Number,
    newStock: Number,
    reason: String,
    invoice: String,
    batchNumber: String,
    expiryDate: Date,
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    relatedMenuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu'
    },
    cost: Number,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'stockHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['Owner', 'Manager', 'Employee']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  // Linked Menu Items (Recipes)
  linkedMenuItems: [{
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu'
    },
    quantityRequired: {
      type: Number,
      required: true,
      min: 0
    },
    unit: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'discontinued'],
    default: 'in-stock',
    index: true
  },
  
  // Alerts
  alerts: {
    lowStockAlertSent: {
      type: Boolean,
      default: false
    },
    lastAlertDate: Date,
    alertRecipients: [String] // Email/phone numbers
  },
  
  // Cost Tracking
  averageCost: Number,
  lastPurchasePrice: Number,
  lastRestockDate: Date,
  lastRestockQuantity: Number,
  
  // Additional Info
  barcode: String,
  images: [String],
  description: String,
  notes: String,
  
  // Flags
  isActive: {
    type: Boolean,
    default: true
  },
  
  isAutoDeductEnabled: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['Owner', 'Manager']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================

inventorySchema.index({ restaurantId: 1, category: 1 });
inventorySchema.index({ restaurantId: 1, status: 1 });
inventorySchema.index({ 'itemName.en': 'text' });
inventorySchema.index({ currentStock: 1, minimumStock: 1 });

// ============================================
// VIRTUALS
// ============================================

// Stock status percentage
inventorySchema.virtual('stockPercentage').get(function() {
  if (!this.maximumStock || this.maximumStock === 0) return 100;
  return Math.round((this.currentStock / this.maximumStock) * 100);
});

// Value of current stock
inventorySchema.virtual('stockValue').get(function() {
  return Math.round(this.currentStock * this.unitPrice * 100) / 100;
});

// Days until expiry
inventorySchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Is expired
inventorySchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
});

// Is expiring soon (within 3 days)
inventorySchema.virtual('isExpiringSoon').get(function() {
  const days = this.daysUntilExpiry;
  return days !== null && days > 0 && days <= 3;
});

// ============================================
// METHODS
// ============================================

// Update stock status based on current level
inventorySchema.methods.updateStockStatus = function() {
  if (this.currentStock === 0) {
    this.status = 'out-of-stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
};

// Add stock (Restock)
inventorySchema.methods.addStock = async function(quantity, details = {}) {
  const previousStock = this.currentStock;
  this.currentStock += quantity;
  
  this.stockHistory.push({
    type: 'restock',
    quantity,
    previousStock,
    newStock: this.currentStock,
    reason: details.reason || 'Restock',
    invoice: details.invoice,
    batchNumber: details.batchNumber,
    expiryDate: details.expiryDate,
    cost: details.cost || (quantity * this.unitPrice),
    updatedBy: details.updatedBy,
    updatedByModel: details.updatedByModel,
    notes: details.notes
  });
  
  // Update pricing
  if (details.unitPrice) {
    this.lastPurchasePrice = details.unitPrice;
    // Calculate average cost
    if (this.averageCost) {
      this.averageCost = ((this.averageCost * previousStock) + (details.unitPrice * quantity)) / this.currentStock;
    } else {
      this.averageCost = details.unitPrice;
    }
  }
  
  this.lastRestockDate = new Date();
  this.lastRestockQuantity = quantity;
  this.updateStockStatus();
  
  // Reset alert flag
  this.alerts.lowStockAlertSent = false;
  
  await this.save();
  return this;
};

// Deduct stock (Order placed)
inventorySchema.methods.deductStock = async function(quantity, details = {}) {
  if (this.currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.currentStock}${this.unit}, Required: ${quantity}${this.unit}`);
  }
  
  const previousStock = this.currentStock;
  this.currentStock -= quantity;
  
  this.stockHistory.push({
    type: 'deduction',
    quantity: -quantity,
    previousStock,
    newStock: this.currentStock,
    reason: details.reason || 'Order placed',
    relatedOrderId: details.orderId,
    relatedMenuId: details.menuId,
    updatedBy: details.updatedBy,
    updatedByModel: details.updatedByModel,
    notes: details.notes
  });
  
  this.updateStockStatus();
  await this.save();
  return this;
};

// Record wastage
inventorySchema.methods.recordWastage = async function(quantity, reason, updatedBy, updatedByModel) {
  const previousStock = this.currentStock;
  this.currentStock -= quantity;
  
  this.stockHistory.push({
    type: 'wastage',
    quantity: -quantity,
    previousStock,
    newStock: this.currentStock,
    reason,
    updatedBy,
    updatedByModel,
    cost: quantity * this.unitPrice
  });
  
  this.updateStockStatus();
  await this.save();
  return this;
};

// Manual adjustment
inventorySchema.methods.adjustStock = async function(newQuantity, reason, updatedBy, updatedByModel) {
  const previousStock = this.currentStock;
  const difference = newQuantity - previousStock;
  
  this.currentStock = newQuantity;
  
  this.stockHistory.push({
    type: 'adjustment',
    quantity: difference,
    previousStock,
    newStock: this.currentStock,
    reason,
    updatedBy,
    updatedByModel
  });
  
  this.updateStockStatus();
  await this.save();
  return this;
};

// Check if reorder needed
inventorySchema.methods.needsReorder = function() {
  return this.currentStock <= this.reorderPoint && this.status !== 'discontinued';
};

// ============================================
// STATIC METHODS
// ============================================

// Generate SKU
inventorySchema.statics.generateSKU = async function(category) {
  const prefix = category.substring(0, 3).toUpperCase();
  const count = await this.countDocuments({ category });
  const sku = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  return sku;
};

// Get low stock items
inventorySchema.statics.getLowStockItems = async function(restaurantId) {
  return await this.find({
    restaurantId,
    status: 'low-stock',
    isActive: true
  }).sort({ currentStock: 1 });
};

// Get items needing reorder
inventorySchema.statics.getReorderList = async function(restaurantId) {
  return await this.find({
    restaurantId,
    isActive: true,
    status: { $ne: 'discontinued' }
  }).then(items => items.filter(item => item.needsReorder()));
};

// Get expiring items
inventorySchema.statics.getExpiringItems = async function(restaurantId, days = 3) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return await this.find({
    restaurantId,
    isPerishable: true,
    expiryDate: {
      $lte: futureDate,
      $gte: new Date()
    },
    isActive: true
  }).sort({ expiryDate: 1 });
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

inventorySchema.pre('save', function(next) {
  // Auto-update status
  this.updateStockStatus();
  
  // Generate SKU if not exists
  if (!this.sku && this.isNew) {
    this.constructor.generateSKU(this.category).then(sku => {
      this.sku = sku;
      next();
    });
  } else {
    next();
  }
});

// ============================================
// POST-SAVE HOOKS
// ============================================

inventorySchema.post('save', async function(doc) {
  // Check if low stock alert needed
  if (doc.status === 'low-stock' && !doc.alerts.lowStockAlertSent) {
    // TODO: Trigger low stock alert (SMS/Email)
    doc.alerts.lowStockAlertSent = true;
    doc.alerts.lastAlertDate = new Date();
    await doc.save();
  }
  
  // Check expiry alert
  if (doc.isExpiringSoon && doc.isPerishable) {
    // TODO: Trigger expiry alert
  }
});

// Getter to obtain the Inventory model bound to an owner-specific database
const getInventoryModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Inventory', inventorySchema);
};

module.exports = { inventorySchema, getInventoryModel };