const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    default: null, // null means owner-wide coupon
    index: true
  },
  
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    uppercase: true,
    trim: true,
    unique: true,
    index: true
  },
  
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  
  minimumOrderValue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  maximumDiscount: {
    type: Number,
    default: null, // Only for percentage discounts
    min: 0
  },
  
  applicableOn: {
    type: String,
    enum: ['all', 'specific_items', 'specific_categories'],
    default: 'all'
  },
  
  applicableItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu'
  }],
  
  applicableCategories: [{
    type: String
  }],
  
  usageLimit: {
    totalUses: {
      type: Number,
      default: null // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0
    },
    perUserLimit: {
      type: Number,
      default: 1
    }
  },
  
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  validUntil: {
    type: Date,
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  description: {
    en: {
      type: String,
      required: true
    },
    hi: String,
    ar: String
  },
  
  // Usage tracking
  usageHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    discountAmount: Number,
    usedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // For promotional campaigns
  campaignName: String,
  
  // Restrictions
  applicableOrderTypes: [{
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery']
  }], // Empty array means all types
  
  daysOfWeek: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }], // Empty array means all days
  
  timeSlots: [{
    start: String, // "09:00"
    end: String    // "17:00"
  }],
  
  // First-time user only
  isFirstOrderOnly: {
    type: Boolean,
    default: false
  },
  
  createdBy: String // ownerId or managerId
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ ownerId: 1, isActive: 1 });
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ validFrom: 1, validUntil: 1 });

// Method to validate coupon
couponSchema.methods.validate = function(orderData, userId) {
  const errors = [];
  
  // Check if active
  if (!this.isActive) {
    errors.push('Coupon is not active');
  }
  
  // Check validity period
  const now = new Date();
  if (now < this.validFrom || now > this.validUntil) {
    errors.push('Coupon is not valid at this time');
  }
  
  // Check usage limit
  if (this.usageLimit.totalUses !== null && this.usageLimit.usedCount >= this.usageLimit.totalUses) {
    errors.push('Coupon usage limit reached');
  }
  
  // Check per-user limit
  if (userId) {
    const userUsage = this.usageHistory.filter(usage => 
      usage.userId && usage.userId.toString() === userId.toString()
    ).length;
    
    if (userUsage >= this.usageLimit.perUserLimit) {
      errors.push(`Coupon can only be used ${this.usageLimit.perUserLimit} time(s) per user`);
    }
  }
  
  // Check minimum order value
  if (orderData.subtotal < this.minimumOrderValue) {
    errors.push(`Minimum order value is ${this.minimumOrderValue}`);
  }
  
  // Check restaurant match
  if (this.restaurantId && this.restaurantId.toString() !== orderData.restaurantId.toString()) {
    errors.push('Coupon is not valid for this restaurant');
  }
  
  // Check order type
  if (this.applicableOrderTypes.length > 0 && !this.applicableOrderTypes.includes(orderData.orderType)) {
    errors.push(`Coupon is only valid for ${this.applicableOrderTypes.join(', ')} orders`);
  }
  
  // Check day of week
  if (this.daysOfWeek.length > 0) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[new Date().getDay()];
    if (!this.daysOfWeek.includes(today)) {
      errors.push('Coupon is not valid on this day');
    }
  }
  
  // Check time slot
  if (this.timeSlots.length > 0) {
    const currentTime = new Date().toTimeString().slice(0, 5); // "HH:MM"
    const isInTimeSlot = this.timeSlots.some(slot => 
      currentTime >= slot.start && currentTime <= slot.end
    );
    if (!isInTimeSlot) {
      errors.push('Coupon is not valid at this time');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function(orderSubtotal) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = (orderSubtotal * this.discountValue) / 100;
    
    // Apply maximum discount cap if set
    if (this.maximumDiscount && discount > this.maximumDiscount) {
      discount = this.maximumDiscount;
    }
  } else {
    // Fixed discount
    discount = this.discountValue;
  }
  
  // Discount cannot exceed order subtotal
  discount = Math.min(discount, orderSubtotal);
  
  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

// Method to apply coupon (record usage)
couponSchema.methods.apply = function(userId, orderId, discountAmount) {
  this.usageLimit.usedCount += 1;
  
  this.usageHistory.push({
    userId,
    orderId,
    discountAmount,
    usedAt: new Date()
  });
  
  return this.save();
};

// Static method to find valid coupons for customer
couponSchema.statics.findValidCoupons = function(restaurantId, ownerId) {
  const now = new Date();
  
  return this.find({
    $or: [
      { restaurantId },
      { restaurantId: null, ownerId }
    ],
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  });
};

// Method to get Coupon model with owner database connection
const getCouponModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Coupon', couponSchema);
};

module.exports = { couponSchema, getCouponModel };