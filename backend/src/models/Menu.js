const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null, // null means shared across all branches
    index: true
  },
  
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  
  sharedAcrossBranches: {
    type: Boolean,
    default: true
  },
  
  specificBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  
  name: {
    en: {
      type: String,
      required: [true, 'English name is required'],
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
  
  description: {
    en: {
      type: String,
      required: [true, 'English description is required']
    },
    hi: {
      type: String
    },
    ar: {
      type: String
    }
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Appetizers', 'Salads', 'Sides', 'Combos'],
    index: true
  },
  
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  
  images: [{
    type: String // URLs
  }],
  
  dietaryType: {
    type: String,
    enum: ['veg', 'non-veg', 'vegan', 'egg'],
    required: true,
    default: 'veg'
  },
  
  preparationTime: {
    type: Number, // in minutes
    default: 15,
    min: 0
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Real-time availability per branch
  availabilityByBranch: {
    type: Map,
    of: new mongoose.Schema({
      isAvailable: {
        type: Boolean,
        default: true
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      reason: {
        type: String // "out_of_stock", "kitchen_closed", etc.
      }
    }, { _id: false })
  },
  
  // Linked inventory items for auto-deduction
  linkedInventoryItems: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    quantityRequired: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      enum: ['grams', 'kg', 'ml', 'liters', 'pieces'],
      required: true
    }
  }],
  
  tags: [{
    type: String,
    lowercase: true
  }], // "spicy", "popular", "chef-special", "new"
  
  allergens: [{
    type: String
  }], // "nuts", "dairy", "gluten", etc.
  
  calories: {
    type: Number,
    min: 0
  },
  
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot'],
    default: 'medium'
  },
  
  customizations: [{
    name: String, // "Size", "Spice Level"
    options: [{
      label: String, // "Regular", "Large"
      priceModifier: Number // +50, -20, etc.
    }]
  }],
  
  // Analytics
  totalOrders: {
    type: Number,
    default: 0
  },
  
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  createdBy: {
    type: String // ownerId or managerId
  }
}, {
  timestamps: true
});

// Indexes
menuSchema.index({ ownerId: 1, category: 1, isActive: 1 });
menuSchema.index({ restaurantId: 1, isActive: 1 });
menuSchema.index({ 'name.en': 'text', 'description.en': 'text' });
menuSchema.index({ tags: 1 });

// Virtual for checking overall availability
menuSchema.virtual('isAvailableAnywhere').get(function() {
  if (!this.availabilityByBranch || this.availabilityByBranch.size === 0) {
    return this.isActive;
  }
  
  for (let [branchId, availability] of this.availabilityByBranch) {
    if (availability.isAvailable) return true;
  }
  return false;
});

// Method to toggle availability for specific branch
menuSchema.methods.toggleAvailability = function(branchId, isAvailable, reason = null) {
  if (!this.availabilityByBranch) {
    this.availabilityByBranch = new Map();
  }
  
  this.availabilityByBranch.set(branchId.toString(), {
    isAvailable,
    lastUpdated: new Date(),
    reason
  });
  
  return this.save();
};

// Method to check if available at specific branch
menuSchema.methods.isAvailableAt = function(branchId) {
  if (!this.isActive) return false;
  if (!this.availabilityByBranch) return true;
  
  const availability = this.availabilityByBranch.get(branchId.toString());
  return availability ? availability.isAvailable : true;
};

// Method to get Menu model with owner database connection
const getMenuModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Menu', menuSchema);
};

module.exports = { menuSchema, getMenuModel };