// ============================================
// SUPPLIER MODEL
// ============================================
// Save as: backend/src/models/Supplier.js

const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
ownerId: {
  type: String,
  required: true,
  index: true
},


  // Basic Info
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  supplierCode: {
    type: String,
    unique: true,
    required: true
  },
  
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  
  contactPerson: {
    name: {
      type: String,
      required: true
    },
    designation: String,
    phone: {
      type: String,
      required: true
    },
    email: String,
    alternatePhone: String
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Business Details
  businessType: {
    type: String,
    enum: ['manufacturer', 'wholesaler', 'distributor', 'retailer', 'farmer', 'other'],
    default: 'wholesaler'
  },
  
  taxId: String, // GST/VAT number
  
  categories: [{
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
    ]
  }],
  
  // Payment Terms
  paymentTerms: {
    method: {
      type: String,
      enum: ['cash', 'credit', 'bank-transfer', 'cheque'],
      default: 'credit'
    },
    creditPeriod: {
      type: Number, // days
      default: 30
    },
    advanceRequired: {
      type: Boolean,
      default: false
    },
    advancePercentage: Number
  },
  
  // Delivery Details
  deliveryDetails: {
    minimumOrderValue: Number,
    deliveryCharge: Number,
    freeDeliveryAbove: Number,
    averageDeliveryTime: Number, // days
    deliveryDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  
  // Banking Details
  bankingDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    upiId: String
  },
  
  // Rating & Performance
  rating: {
    overall: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    quality: Number,
    pricing: Number,
    delivery: Number,
    service: Number
  },
  
  // Statistics
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalPurchaseValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    onTimeDeliveryRate: Number, // percentage
    rejectionRate: Number // percentage
  },
  
  // Items Supplied
  itemsSupplied: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    },
    itemName: String,
    unitPrice: Number,
    unit: String,
    minimumOrderQuantity: Number,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted', 'on-hold'],
    default: 'active',
    index: true
  },
  
  // Notes & Documents
  notes: String,
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'license', 'certification', 'invoice', 'agreement', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
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
  timestamps: true
});

// ============================================
// INDEXES
// ============================================

supplierSchema.index({ restaurantId: 1, status: 1 });
supplierSchema.index({ companyName: 'text' });

// ============================================
// METHODS
// ============================================

// Update rating
supplierSchema.methods.updateRating = function(ratings) {
  this.rating.quality = ratings.quality || this.rating.quality;
  this.rating.pricing = ratings.pricing || this.rating.pricing;
  this.rating.delivery = ratings.delivery || this.rating.delivery;
  this.rating.service = ratings.service || this.rating.service;
  
  // Calculate overall rating
  const validRatings = [
    this.rating.quality,
    this.rating.pricing,
    this.rating.delivery,
    this.rating.service
  ].filter(r => r);
  
  if (validRatings.length > 0) {
    this.rating.overall = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
  }
};

// ============================================
// STATIC METHODS
// ============================================

// Generate supplier code
supplierSchema.statics.generateSupplierCode = async function() {
  const count = await this.countDocuments();
  const code = `SUP-${String(count + 1).padStart(5, '0')}`;
  return code;
};

// Get active suppliers
supplierSchema.statics.getActiveSuppliers = async function(restaurantId) {
  return await this.find({
    restaurantId,
    status: 'active'
  }).sort({ companyName: 1 });
};

// Get suppliers by category
supplierSchema.statics.getByCategory = async function(restaurantId, category) {
  return await this.find({
    restaurantId,
    categories: category,
    status: 'active'
  });
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

supplierSchema.pre('save', async function(next) {
  // Generate supplier code if new
  if (this.isNew && !this.supplierCode) {
    this.supplierCode = await this.constructor.generateSupplierCode();
  }
  next();
});

// Getter to obtain the Supplier model bound to an owner-specific database
const getSupplierModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Supplier', supplierSchema);
};

module.exports = { supplierSchema, getSupplierModel };