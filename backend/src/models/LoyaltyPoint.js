const mongoose = require('mongoose');

const loyaltyPointSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  currentBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lifetimeEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lifetimeRedeemed: {
    type: Number,
    default: 0,
    min: 0
  },
  
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  transactions: [{
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'expired', 'bonus', 'adjusted'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    discountAmount: {
      type: Number, // Only for redemptions
      default: 0
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date // For points that expire
    },
    notes: String
  }],
  
  earningRules: {
    pointsPerRupee: {
      type: Number,
      default: 0.1 // 10 points per ₹100 spent
    },
    birthdayBonus: {
      type: Number,
      default: 100
    },
    referralBonus: {
      type: Number,
      default: 50
    },
    minimumOrderForPoints: {
      type: Number,
      default: 100 // Minimum order value to earn points
    }
  },
  
  redemptionRules: {
    pointsToRupeeRatio: {
      type: Number,
      default: 2 // 100 points = ₹50
    },
    minimumRedemption: {
      type: Number,
      default: 50 // Minimum points to redeem
    },
    maximumRedemptionPerOrder: {
      type: Number,
      default: null // null means unlimited
    }
  },
  
  expiryDate: {
    type: Date, // Points expire after 1 year
    default: function() {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date;
    }
  },
  
  lastEarned: Date,
  lastRedeemed: Date,
  
  // Special achievements
  achievements: [{
    name: String,
    description: String,
    achievedAt: Date,
    bonusPoints: Number
  }]
}, {
  timestamps: true
});

// Indexes
loyaltyPointSchema.index({ restaurantId: 1, userId: 1 }, { unique: true });
loyaltyPointSchema.index({ tier: 1 });

// Pre-save: Update tier based on lifetime earned points
loyaltyPointSchema.pre('save', function(next) {
  if (this.isModified('lifetimeEarned')) {
    if (this.lifetimeEarned >= 1000) {
      this.tier = 'platinum';
    } else if (this.lifetimeEarned >= 500) {
      this.tier = 'gold';
    } else if (this.lifetimeEarned >= 200) {
      this.tier = 'silver';
    } else {
      this.tier = 'bronze';
    }
  }
  next();
});

// Method to earn points
loyaltyPointSchema.methods.earnPoints = function(orderAmount, orderId, reason = 'Order purchase') {
  if (orderAmount < this.earningRules.minimumOrderForPoints) {
    return { success: false, message: 'Order amount below minimum for earning points' };
  }
  
  const pointsEarned = Math.floor(orderAmount * this.earningRules.pointsPerRupee);
  
  this.currentBalance += pointsEarned;
  this.lifetimeEarned += pointsEarned;
  this.lastEarned = new Date();
  
  // Set expiry for these points (1 year from now)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
  this.transactions.push({
    type: 'earned',
    points: pointsEarned,
    reason,
    relatedOrderId: orderId,
    timestamp: new Date(),
    expiryDate
  });
  
  return this.save().then(() => ({
    success: true,
    pointsEarned,
    newBalance: this.currentBalance
  }));
};

// Method to redeem points
loyaltyPointSchema.methods.redeemPoints = function(points, orderId) {
  // Validation
  if (points < this.redemptionRules.minimumRedemption) {
    throw new Error(`Minimum redemption is ${this.redemptionRules.minimumRedemption} points`);
  }
  
  if (points > this.currentBalance) {
    throw new Error('Insufficient loyalty points');
  }
  
  if (this.redemptionRules.maximumRedemptionPerOrder && points > this.redemptionRules.maximumRedemptionPerOrder) {
    throw new Error(`Maximum redemption per order is ${this.redemptionRules.maximumRedemptionPerOrder} points`);
  }
  
  // Calculate discount amount
  const discountAmount = points / this.redemptionRules.pointsToRupeeRatio;
  
  this.currentBalance -= points;
  this.lifetimeRedeemed += points;
  this.lastRedeemed = new Date();
  
  this.transactions.push({
    type: 'redeemed',
    points: -points,
    reason: `Redeemed in Order #${orderId}`,
    relatedOrderId: orderId,
    discountAmount,
    timestamp: new Date()
  });
  
  return this.save().then(() => ({
    success: true,
    pointsRedeemed: points,
    discountAmount,
    newBalance: this.currentBalance
  }));
};

// Method to add bonus points
loyaltyPointSchema.methods.addBonus = function(points, reason) {
  this.currentBalance += points;
  this.lifetimeEarned += points;
  
  this.transactions.push({
    type: 'bonus',
    points,
    reason,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to expire old points
loyaltyPointSchema.methods.expirePoints = function() {
  const now = new Date();
  let expiredPoints = 0;
  
  this.transactions.forEach(transaction => {
    if (transaction.type === 'earned' && 
        transaction.expiryDate && 
        transaction.expiryDate < now && 
        transaction.points > 0) {
      expiredPoints += transaction.points;
    }
  });
  
  if (expiredPoints > 0) {
    this.currentBalance = Math.max(0, this.currentBalance - expiredPoints);
    
    this.transactions.push({
      type: 'expired',
      points: -expiredPoints,
      reason: 'Points expired after 1 year',
      timestamp: now
    });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Static method to calculate points for order
loyaltyPointSchema.statics.calculatePointsForOrder = function(orderAmount) {
  const defaultPointsPerRupee = 0.1;
  return Math.floor(orderAmount * defaultPointsPerRupee);
};

// Static method to calculate discount for points
loyaltyPointSchema.statics.calculateDiscountForPoints = function(points) {
  const defaultRatio = 2; // 100 points = ₹50
  return points / defaultRatio;
};

// Method to get LoyaltyPoint model with owner database connection
const getLoyaltyPointModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('LoyaltyPoint', loyaltyPointSchema);
};

module.exports = { loyaltyPointSchema, getLoyaltyPointModel };