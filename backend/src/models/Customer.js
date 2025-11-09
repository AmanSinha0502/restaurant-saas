const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  savedAddresses: [{
    label: {
      type: String,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home'
    },
    street: {
      type: String,
      required: true
    },
    landmark: String,
    city: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  totalOrders: {
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
  
  preferences: {
    favoriteItems: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu'
    }],
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']
    }],
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot'],
      default: 'medium'
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'ar'],
      default: 'en'
    }
  },
  
  lastOrderDate: Date,
  
  registeredAt: {
    type: Date,
    default: Date.now
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isBlocked: {
    type: Boolean,
    default: false
  },
  
  blockedReason: String,
  
  // Email/Phone verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Marketing preferences
  marketingConsent: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    whatsapp: {
      type: Boolean,
      default: true
    }
  },
  
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // OTP for phone verification
  phoneOTP: String,
  phoneOTPExpire: Date
}, {
  timestamps: true
});

// Indexes
customerSchema.index({ restaurantId: 1, email: 1 }, { unique: true });
customerSchema.index({ restaurantId: 1, phone: 1 });
customerSchema.index({ loyaltyPoints: -1 });

// Hash password before saving
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update loyalty tier based on points
customerSchema.pre('save', function(next) {
  if (this.isModified('loyaltyPoints')) {
    if (this.loyaltyPoints >= 1000) {
      this.loyaltyTier = 'platinum';
    } else if (this.loyaltyPoints >= 500) {
      this.loyaltyTier = 'gold';
    } else if (this.loyaltyPoints >= 200) {
      this.loyaltyTier = 'silver';
    } else {
      this.loyaltyTier = 'bronze';
    }
  }
  next();
});

// Method to add order to customer stats
customerSchema.methods.addOrder = function(orderTotal) {
  this.totalOrders += 1;
  this.totalSpent += orderTotal;
  this.averageOrderValue = this.totalSpent / this.totalOrders;
  this.lastOrderDate = new Date();
  return this.save();
};

// Method to add loyalty points
customerSchema.methods.addLoyaltyPoints = function(points) {
  this.loyaltyPoints += points;
  return this.save();
};

// Method to redeem loyalty points
customerSchema.methods.redeemLoyaltyPoints = function(points) {
  if (this.loyaltyPoints < points) {
    throw new Error('Insufficient loyalty points');
  }
  this.loyaltyPoints -= points;
  return this.save();
};

// Generate password reset token
customerSchema.methods.generateResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  
  return resetToken;
};

// Generate phone OTP
customerSchema.methods.generatePhoneOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.phoneOTP = otp;
  this.phoneOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Method to get Customer model with owner database connection
const getCustomerModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Customer', customerSchema);
};

module.exports = { customerSchema, getCustomerModel };