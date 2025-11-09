const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  itemName: {
    en: {
      type: String,
      required: true,
      trim: true
    },
    hi: {
      type: String,
      trim: true
    },
    ar: {
      type: String,
      trim: true
    }
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'Vegetables',
      'Fruits',
      'Meat & Poultry',
      'Seafood',
      'Dairy',
      'Grains & Pulses',
      'Spices',
      'Oils & Fats',
      'Beverages',
      'Packaging',
      'Cleaning Supplies',
      'Other'
    ]
  },
  
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'grams', 'liters', 'ml', 'pieces', 'packets', 'boxes']
  },
  
  minimumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  
  maximumStock: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  
  reorderPoint: {
    type: Number,
    required: true,
    min: 0,
    default: 20
  },
  
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'INR'
  },
  
  supplier: {
    name: {
      type: String,
      required: true
    },
    phone: String,
    email: String,
    address: String
  },
  
  expiryDate: Date,
  
  stockHistory: [{
    type: {
      type: String,
      enum: ['restock', 'deduction', 'wastage', 'adjustment', 'transfer'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reason: String,
    invoice: String,
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    updatedBy: String, // userId
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  
  lastRestocked: Date,
  
  isPerishable: {
    type: Boolean,
    default: false
  },
  
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'expired'],
    default: 'in_stock',
    index: true
  },
  
  // Automatic stock alerts sent
  alertsSent: [{
    type: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'expiry_warning']
    },
    sentAt: Date,
    recipientIds: [String]
  }],
  
  // For inventory valuation
  averageCost: {
    type: Number,
    default: 0
  },
  
  totalValue: {
    type: Number,
    default: 0
  },
  
  createdBy: String // ownerId or managerId
}, {
  timestamps: true
});

// Indexes
inventorySchema.index({ restaurantId: 1, category: 1 });
inventorySchema.index({ restaurantId: 1, status: 1 });
inventorySchema.index({ expiryDate: 1 });

// Pre-save: Update status based on stock levels
inventorySchema.pre('save', function(next) {
  if (this.currentStock === 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  
  // Check expiry
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.status = 'expired';
  }
  
  // Update total value
  this.totalValue = this.currentStock * this.unitPrice;
  
  next();
});

// Method to add stock (restock)
inventorySchema.methods.addStock = function(quantity, reason, updatedBy, invoice = null, notes = null) {
  this.currentStock += quantity;
  this.lastRestocked = new Date();
  
  this.stockHistory.push({
    type: 'restock',
    quantity: quantity,
    reason: reason || 'New stock purchase',
    invoice,
    updatedBy,
    timestamp: new Date(),
    notes
  });
  
  return this.save();
};

// Method to deduct stock
inventorySchema.methods.deductStock = function(quantity, orderId = null, updatedBy = 'system') {
  if (this.currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.currentStock}, Required: ${quantity}`);
  }
  
  this.currentStock -= quantity;
  
  this.stockHistory.push({
    type: 'deduction',
    quantity: -quantity,
    reason: orderId ? `Order #${orderId}` : 'Stock deduction',
    relatedOrderId: orderId,
    updatedBy,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to record wastage
inventorySchema.methods.recordWastage = function(quantity, reason, updatedBy) {
  if (this.currentStock < quantity) {
    throw new Error(`Cannot record wastage more than current stock`);
  }
  
  this.currentStock -= quantity;
  
  this.stockHistory.push({
    type: 'wastage',
    quantity: -quantity,
    reason: reason || 'Wastage/Spoilage',
    updatedBy,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to adjust stock manually
inventorySchema.methods.adjustStock = function(newQuantity, reason, updatedBy) {
  const difference = newQuantity - this.currentStock;
  
  this.currentStock = newQuantity;
  
  this.stockHistory.push({
    type: 'adjustment',
    quantity: difference,
    reason: reason || 'Manual adjustment',
    updatedBy,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to check if stock is low
inventorySchema.methods.isLowStock = function() {
  return this.currentStock <= this.reorderPoint;
};

// Method to check if expiring soon (within 3 days)
inventorySchema.methods.isExpiringSoon = function() {
  if (!this.expiryDate || !this.isPerishable) return false;
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  return this.expiryDate <= threeDaysFromNow;
};

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function(restaurantId) {
  return this.find({
    restaurantId,
    status: 'low_stock'
  }).sort({ currentStock: 1 });
};

// Static method to get out of stock items
inventorySchema.statics.getOutOfStockItems = function(restaurantId) {
  return this.find({
    restaurantId,
    status: 'out_of_stock'
  });
};

// Static method to get expiring items
inventorySchema.statics.getExpiringItems = function(restaurantId) {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  return this.find({
    restaurantId,
    isPerishable: true,
    expiryDate: { $lte: threeDaysFromNow, $gte: new Date() }
  }).sort({ expiryDate: 1 });
};

// Method to get Inventory model with owner database connection
const getInventoryModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Inventory', inventorySchema);
};

module.exports = { inventorySchema, getInventoryModel };