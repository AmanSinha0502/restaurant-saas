// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const customerSchema = new mongoose.Schema({
//   restaurantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Restaurant',
//     required: true,
//     index: true
//   },
  
//   fullName: {
//     type: String,
//     required: [true, 'Full name is required'],
//     trim: true
//   },
  
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     lowercase: true,
//     trim: true,
//     match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
//   },
  
//   phone: {
//     type: String,
//     required: [true, 'Phone number is required'],
//     trim: true
//   },
  
//   password: {
//     type: String,
//     required: [true, 'Password is required'],
//     minlength: [8, 'Password must be at least 8 characters'],
//     select: false
//   },
  
//   savedAddresses: [{
//     label: {
//       type: String,
//       enum: ['Home', 'Office', 'Other'],
//       default: 'Home'
//     },
//     street: {
//       type: String,
//       required: true
//     },
//     landmark: String,
//     city: {
//       type: String,
//       required: true
//     },
//     postalCode: {
//       type: String,
//       required: true
//     },
//     isDefault: {
//       type: Boolean,
//       default: false
//     }
//   }],
  
//   loyaltyPoints: {
//     type: Number,
//     default: 0,
//     min: 0
//   },
  
//   loyaltyTier: {
//     type: String,
//     enum: ['bronze', 'silver', 'gold', 'platinum'],
//     default: 'bronze'
//   },
  
//   totalOrders: {
//     type: Number,
//     default: 0
//   },
  
//   totalSpent: {
//     type: Number,
//     default: 0
//   },
  
//   averageOrderValue: {
//     type: Number,
//     default: 0
//   },
  
//   preferences: {
//     favoriteItems: [{
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Menu'
//     }],
//     dietaryRestrictions: [{
//       type: String,
//       enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']
//     }],
//     spiceLevel: {
//       type: String,
//       enum: ['mild', 'medium', 'hot'],
//       default: 'medium'
//     },
//     preferredLanguage: {
//       type: String,
//       enum: ['en', 'hi', 'ar'],
//       default: 'en'
//     }
//   },
  
//   lastOrderDate: Date,
  
//   registeredAt: {
//     type: Date,
//     default: Date.now
//   },
  
//   isActive: {
//     type: Boolean,
//     default: true
//   },
  
//   isBlocked: {
//     type: Boolean,
//     default: false
//   },
  
//   blockedReason: String,
  
//   // Email/Phone verification
//   isEmailVerified: {
//     type: Boolean,
//     default: false
//   },
  
//   isPhoneVerified: {
//     type: Boolean,
//     default: false
//   },
  
//   // Marketing preferences
//   marketingConsent: {
//     email: {
//       type: Boolean,
//       default: true
//     },
//     sms: {
//       type: Boolean,
//       default: true
//     },
//     whatsapp: {
//       type: Boolean,
//       default: true
//     }
//   },
  
//   // Password reset
//   resetPasswordToken: String,
//   resetPasswordExpire: Date,
  
//   // OTP for phone verification
//   phoneOTP: String,
//   phoneOTPExpire: Date
// }, {
//   timestamps: true
// });

// // Indexes
// customerSchema.index({ restaurantId: 1, email: 1 }, { unique: true });
// customerSchema.index({ restaurantId: 1, phone: 1 });
// customerSchema.index({ loyaltyPoints: -1 });

// // Hash password before saving
// customerSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// // Compare password method
// customerSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Update loyalty tier based on points
// customerSchema.pre('save', function(next) {
//   if (this.isModified('loyaltyPoints')) {
//     if (this.loyaltyPoints >= 1000) {
//       this.loyaltyTier = 'platinum';
//     } else if (this.loyaltyPoints >= 500) {
//       this.loyaltyTier = 'gold';
//     } else if (this.loyaltyPoints >= 200) {
//       this.loyaltyTier = 'silver';
//     } else {
//       this.loyaltyTier = 'bronze';
//     }
//   }
//   next();
// });

// // Method to add order to customer stats
// customerSchema.methods.addOrder = function(orderTotal) {
//   this.totalOrders += 1;
//   this.totalSpent += orderTotal;
//   this.averageOrderValue = this.totalSpent / this.totalOrders;
//   this.lastOrderDate = new Date();
//   return this.save();
// };

// // Method to add loyalty points
// customerSchema.methods.addLoyaltyPoints = function(points) {
//   this.loyaltyPoints += points;
//   return this.save();
// };

// // Method to redeem loyalty points
// customerSchema.methods.redeemLoyaltyPoints = function(points) {
//   if (this.loyaltyPoints < points) {
//     throw new Error('Insufficient loyalty points');
//   }
//   this.loyaltyPoints -= points;
//   return this.save();
// };

// // Generate password reset token
// customerSchema.methods.generateResetToken = function() {
//   const crypto = require('crypto');
//   const resetToken = crypto.randomBytes(32).toString('hex');
  
//   this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//   this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  
//   return resetToken;
// };

// // Generate phone OTP
// customerSchema.methods.generatePhoneOTP = function() {
//   const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
//   this.phoneOTP = otp;
//   this.phoneOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
//   return otp;
// };

// // Method to get Customer model with owner database connection
// const getCustomerModel = (ownerId) => {
//   const dbName = `owner_${ownerId}`;
//   const connection = mongoose.connection.useDb(dbName, { useCache: true });
//   return connection.model('Customer', customerSchema);
// };

// module.exports = { customerSchema, getCustomerModel };



// ============================================
// CUSTOMER MODEL (ENHANCED)
// ============================================
// Save as: backend/src/models/Customer.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  // Basic Info
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  customerCode: {
    type: String,
    unique: true,
    required: true
  },
  
  // Personal Details
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  alternatePhone: String,
  
  dateOfBirth: Date,
  
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  
  // Authentication
  password: {
    type: String,
    required: true,
    select: false
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Addresses
  addresses: [{
    label: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    landmark: String,
    city: String,
    state: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // Loyalty & Rewards
  loyalty: {
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    tierProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lifetimePoints: {
      type: Number,
      default: 0
    },
    pointsExpiry: Date,
    lastTierUpgrade: Date
  },
  
  // Purchase Statistics
  statistics: {
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    cancelledOrders: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    firstOrderDate: Date,
    daysSinceLastOrder: Number,
    favoriteItems: [{
      menuId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      },
      orderCount: Number
    }],
    preferredOrderType: {
      type: String,
      enum: ['dine-in', 'takeaway', 'delivery']
    }
  },
  
  // RFM Analysis (Recency, Frequency, Monetary)
  rfmScore: {
    recency: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    frequency: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    monetary: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    },
    overall: {
      type: Number,
      min: 3,
      max: 15,
      default: 3
    },
    segment: {
      type: String,
      enum: ['champions', 'loyal', 'potential', 'at-risk', 'lost'],
      default: 'potential'
    },
    lastCalculated: Date
  },
  
  // Preferences
  preferences: {
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher']
    }],
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot']
    },
    cuisinePreferences: [String],
    allergies: [String],
    specialRequests: String,
    communicationPreference: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'none'],
      default: 'sms'
    },
    marketingConsent: {
      type: Boolean,
      default: true
    }
  },
  
  // Referral System
  referral: {
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    referredCustomers: [{
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
      },
      registeredAt: Date,
      rewardGiven: Boolean
    }],
    totalReferrals: {
      type: Number,
      default: 0
    },
    referralEarnings: {
      type: Number,
      default: 0
    }
  },
  
  // Birthday & Special Occasions
  specialOccasions: [{
    type: {
      type: String,
      enum: ['birthday', 'anniversary', 'other']
    },
    date: Date,
    reminderSent: Boolean,
    rewardGiven: Boolean
  }],
  
  // Feedback & Ratings
  averageRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  totalReviews: {
    type: Number,
    default: 0
  },
  
  // Account Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'suspended'],
    default: 'active',
    index: true
  },
  
  blockReason: String,
  blockedAt: Date,
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'blockedByModel'
  },
  blockedByModel: {
    type: String,
    enum: ['Owner', 'Manager']
  },
  
  // Support & Queries
  supportTickets: {
    type: Number,
    default: 0
  },
  
  lastSupportQuery: Date,
  
  // Metadata
  registrationSource: {
    type: String,
    enum: ['website', 'pos', 'mobile-app', 'social'],
    default: 'website'
  },
  
  tags: [String], // For segmentation (e.g., 'vip', 'regular', 'inactive')
  
  notes: String, // Internal staff notes
  
  lastActive: Date,
  
  // Deletion
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================

customerSchema.index({ restaurantId: 1, email: 1 });
customerSchema.index({ restaurantId: 1, phone: 1 });
customerSchema.index({ 'loyalty.tier': 1 });
customerSchema.index({ 'loyalty.points': -1 });
customerSchema.index({ 'statistics.totalSpent': -1 });
customerSchema.index({ fullName: 'text' });

// ============================================
// VIRTUALS
// ============================================

// Customer Lifetime Value (CLV)
customerSchema.virtual('lifetimeValue').get(function() {
  return this.statistics.totalSpent;
});

// Is VIP (top tier + high spending)
customerSchema.virtual('isVIP').get(function() {
  return this.loyalty.tier === 'platinum' || this.statistics.totalSpent > 50000;
});

// Account Age (in days)
customerSchema.virtual('accountAge').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
});

// Is Birthday Month
customerSchema.virtual('isBirthdayMonth').get(function() {
  if (!this.dateOfBirth) return false;
  const now = new Date();
  const birthday = new Date(this.dateOfBirth);
  return now.getMonth() === birthday.getMonth();
});

// ============================================
// METHODS
// ============================================

// Generate customer code
customerSchema.statics.generateCustomerCode = async function() {
  const count = await this.countDocuments();
  const code = `CUST-${String(count + 1).padStart(6, '0')}`;
  return code;
};

// Generate referral code
customerSchema.methods.generateReferralCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Hash password
customerSchema.methods.hashPassword = async function() {
  this.password = await bcrypt.hash(this.password, 12);
};

// Compare password
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update loyalty tier based on total spent
customerSchema.methods.updateLoyaltyTier = function() {
  const spent = this.statistics.totalSpent;
  let newTier = 'bronze';
  let tierProgress = 0;
  
  if (spent >= 100000) {
    newTier = 'platinum';
    tierProgress = 100;
  } else if (spent >= 50000) {
    newTier = 'gold';
    tierProgress = ((spent - 50000) / 50000) * 100;
  } else if (spent >= 20000) {
    newTier = 'silver';
    tierProgress = ((spent - 20000) / 30000) * 100;
  } else {
    newTier = 'bronze';
    tierProgress = (spent / 20000) * 100;
  }
  
  if (this.loyalty.tier !== newTier) {
    this.loyalty.lastTierUpgrade = new Date();
  }
  
  this.loyalty.tier = newTier;
  this.loyalty.tierProgress = Math.min(tierProgress, 100);
};

// Award loyalty points
customerSchema.methods.awardPoints = async function(points, reason) {
  this.loyalty.points += points;
  this.loyalty.lifetimePoints += points;
  
  // Update tier
  this.updateLoyaltyTier();
  
  // Log transaction (to be created in LoyaltyTransaction model)
  await this.save();
  return this.loyalty.points;
};

// Redeem loyalty points
customerSchema.methods.redeemPoints = async function(points) {
  if (this.loyalty.points < points) {
    throw new Error('Insufficient loyalty points');
  }
  
  this.loyalty.points -= points;
  await this.save();
  return this.loyalty.points;
};

// Calculate RFM score
customerSchema.methods.calculateRFMScore = function() {
  const now = new Date();
  
  // Recency (1-5, lower is better)
  const daysSinceLastOrder = this.statistics.daysSinceLastOrder || 999;
  let recency = 5;
  if (daysSinceLastOrder <= 7) recency = 5;
  else if (daysSinceLastOrder <= 30) recency = 4;
  else if (daysSinceLastOrder <= 90) recency = 3;
  else if (daysSinceLastOrder <= 180) recency = 2;
  else recency = 1;
  
  // Frequency (1-5, higher is better)
  const orderCount = this.statistics.completedOrders;
  let frequency = 1;
  if (orderCount >= 50) frequency = 5;
  else if (orderCount >= 20) frequency = 4;
  else if (orderCount >= 10) frequency = 3;
  else if (orderCount >= 5) frequency = 2;
  else frequency = 1;
  
  // Monetary (1-5, higher is better)
  const totalSpent = this.statistics.totalSpent;
  let monetary = 1;
  if (totalSpent >= 50000) monetary = 5;
  else if (totalSpent >= 20000) monetary = 4;
  else if (totalSpent >= 10000) monetary = 3;
  else if (totalSpent >= 5000) monetary = 2;
  else monetary = 1;
  
  // Overall score
  const overall = recency + frequency + monetary;
  
  // Segment
  let segment = 'potential';
  if (overall >= 13) segment = 'champions';
  else if (overall >= 10) segment = 'loyal';
  else if (overall >= 7) segment = 'potential';
  else if (overall >= 5) segment = 'at-risk';
  else segment = 'lost';
  
  this.rfmScore = {
    recency,
    frequency,
    monetary,
    overall,
    segment,
    lastCalculated: new Date()
  };
};

// Block customer
customerSchema.methods.blockCustomer = async function(reason, blockedBy, blockedByModel) {
  this.status = 'blocked';
  this.blockReason = reason;
  this.blockedAt = new Date();
  this.blockedBy = blockedBy;
  this.blockedByModel = blockedByModel;
  await this.save();
};

// Unblock customer
customerSchema.methods.unblockCustomer = async function() {
  this.status = 'active';
  this.blockReason = null;
  this.blockedAt = null;
  this.blockedBy = null;
  this.blockedByModel = null;
  await this.save();
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

customerSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    await this.hashPassword();
  }
  
  // Generate customer code if new
  if (this.isNew && !this.customerCode) {
    this.customerCode = await this.constructor.generateCustomerCode();
  }
  
  // Generate referral code if new
  if (this.isNew && !this.referral.referralCode) {
    this.referral.referralCode = this.generateReferralCode();
  }
  
  // Update last active
  this.lastActive = new Date();
  
  next();
});

// ============================================
// QUERY HELPERS
// ============================================

customerSchema.query.active = function() {
  return this.where('status').equals('active');
};

customerSchema.query.byRestaurant = function(restaurantId) {
  return this.where('restaurantId').equals(restaurantId);
};

customerSchema.query.vip = function() {
  return this.where('loyalty.tier').in(['gold', 'platinum']);
};

// Getter to obtain the Customer model bound to an owner-specific database
const getCustomerModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Customer', customerSchema);
};

module.exports = { customerSchema, getCustomerModel };