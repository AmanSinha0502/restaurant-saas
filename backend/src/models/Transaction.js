// const mongoose = require('mongoose');

// const transactionSchema = new mongoose.Schema({
//   restaurantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Restaurant',
//     required: true,
//     index: true
//   },
  
//   transactionType: {
//     type: String,
//     enum: ['order', 'reservation', 'refund'],
//     required: true,
//     index: true
//   },
  
//   referenceId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//     refPath: 'transactionType'
//   },
  
//   customer: {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Customer'
//     },
//     name: {
//       type: String,
//       required: true
//     },
//     email: String,
//     phone: String
//   },
  
//   amount: {
//     type: Number,
//     required: true,
//     min: 0
//   },
  
//   currency: {
//     type: String,
//     required: true,
//     default: 'INR'
//   },
  
//   paymentMethod: {
//     type: String,
//     enum: ['razorpay', 'stripe', 'paypal', 'cash', 'card', 'upi'],
//     required: true
//   },
  
//   paymentGateway: {
//     type: String,
//     enum: ['razorpay', 'stripe', 'paypal', 'manual'],
//     required: true
//   },
  
//   gatewayResponse: {
//     transactionId: {
//       type: String,
//       index: true
//     },
//     orderId: String, // Gateway's order ID
//     signature: String, // For verification
//     status: String,
//     errorCode: String,
//     errorMessage: String,
//     rawResponse: mongoose.Schema.Types.Mixed
//   },
  
//   status: {
//     type: String,
//     enum: ['pending', 'success', 'failed', 'refunded', 'partially-refunded'],
//     default: 'pending',
//     required: true,
//     index: true
//   },
  
//   refund: {
//     amount: {
//       type: Number,
//       default: 0
//     },
//     reason: String,
//     refundedAt: Date,
//     refundTransactionId: String,
//     refundGatewayResponse: mongoose.Schema.Types.Mixed
//   },
  
//   fees: {
//     gatewayFee: {
//       type: Number,
//       default: 0
//     },
//     gatewayFeePercentage: {
//       type: Number,
//       default: 2 // 2% gateway fee
//     },
//     netAmount: {
//       type: Number,
//       default: 0
//     }
//   },
  
//   metadata: {
//     ipAddress: String,
//     userAgent: String,
//     deviceType: String
//   },
  
//   // For reconciliation
//   settledAt: Date,
//   settlementId: String,
  
//   // Retry information
//   retryCount: {
//     type: Number,
//     default: 0
//   },
  
//   lastRetryAt: Date
// }, {
//   timestamps: true
// });

// // Indexes
// transactionSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
// transactionSchema.index({ 'customer.userId': 1 });
// transactionSchema.index({ 'gatewayResponse.transactionId': 1 });
// transactionSchema.index({ referenceId: 1, transactionType: 1 });

// // Pre-save: Calculate fees
// transactionSchema.pre('save', function(next) {
//   if (this.isModified('amount') && this.status === 'success') {
//     this.fees.gatewayFee = (this.amount * this.fees.gatewayFeePercentage) / 100;
//     this.fees.netAmount = this.amount - this.fees.gatewayFee;
//   }
//   next();
// });

// // Method to mark as success
// transactionSchema.methods.markSuccess = function(gatewayResponse) {
//   this.status = 'success';
//   this.gatewayResponse = {
//     ...this.gatewayResponse,
//     ...gatewayResponse,
//     status: 'success'
//   };
//   return this.save();
// };

// // Method to mark as failed
// transactionSchema.methods.markFailed = function(errorCode, errorMessage) {
//   this.status = 'failed';
//   this.gatewayResponse.status = 'failed';
//   this.gatewayResponse.errorCode = errorCode;
//   this.gatewayResponse.errorMessage = errorMessage;
//   return this.save();
// };

// // Method to process refund
// transactionSchema.methods.processRefund = async function(refundAmount, reason) {
//   if (this.status !== 'success') {
//     throw new Error('Can only refund successful transactions');
//   }
  
//   if (refundAmount > this.amount) {
//     throw new Error('Refund amount cannot exceed transaction amount');
//   }
  
//   this.refund = {
//     amount: refundAmount,
//     reason,
//     refundedAt: new Date()
//   };
  
//   if (refundAmount === this.amount) {
//     this.status = 'refunded';
//   } else {
//     this.status = 'partially-refunded';
//   }
  
//   return this.save();
// };

// // Method to retry failed transaction
// transactionSchema.methods.retry = function() {
//   if (this.status === 'success') {
//     throw new Error('Cannot retry successful transaction');
//   }
  
//   this.retryCount += 1;
//   this.lastRetryAt = new Date();
//   this.status = 'pending';
  
//   return this.save();
// };

// // Static method to get daily revenue
// transactionSchema.statics.getDailyRevenue = async function(restaurantId, date) {
//   const startOfDay = new Date(date);
//   startOfDay.setHours(0, 0, 0, 0);
  
//   const endOfDay = new Date(date);
//   endOfDay.setHours(23, 59, 59, 999);
  
//   const result = await this.aggregate([
//     {
//       $match: {
//         restaurantId: new mongoose.Types.ObjectId(restaurantId),
//         status: 'success',
//         createdAt: { $gte: startOfDay, $lte: endOfDay }
//       }
//     },
//     {
//       $group: {
//         _id: null,
//         totalRevenue: { $sum: '$amount' },
//         totalFees: { $sum: '$fees.gatewayFee' },
//         netRevenue: { $sum: '$fees.netAmount' },
//         transactionCount: { $sum: 1 }
//       }
//     }
//   ]);
  
//   return result[0] || {
//     totalRevenue: 0,
//     totalFees: 0,
//     netRevenue: 0,
//     transactionCount: 0
//   };
// };

// // Static method to get revenue breakdown by payment method
// transactionSchema.statics.getRevenueByPaymentMethod = async function(restaurantId, startDate, endDate) {
//   return await this.aggregate([
//     {
//       $match: {
//         restaurantId: new mongoose.Types.ObjectId(restaurantId),
//         status: 'success',
//         createdAt: { $gte: startDate, $lte: endDate }
//       }
//     },
//     {
//       $group: {
//         _id: '$paymentMethod',
//         totalAmount: { $sum: '$amount' },
//         count: { $sum: 1 }
//       }
//     },
//     {
//       $sort: { totalAmount: -1 }
//     }
//   ]);
// };

// // Method to get Transaction model with owner database connection
// const getTransactionModel = (ownerId) => {
//   const dbName = `owner_${ownerId}`;
//   const connection = mongoose.connection.useDb(dbName, { useCache: true });
//   return connection.model('Transaction', transactionSchema);
// };

// module.exports = { transactionSchema, getTransactionModel };


// ============================================
// LOYALTY TRANSACTION MODEL
// ============================================
// Save as: backend/src/models/Transaction.js

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({

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
  
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  
  // Transaction Details
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'adjusted', 'bonus', 'refund'],
    required: true,
    index: true
  },
  
  points: {
    type: Number,
    required: true
  },
  
  // Balance Tracking
  previousBalance: {
    type: Number,
    required: true
  },
  
  newBalance: {
    type: Number,
    required: true
  },
  
  // Source/Reason
  source: {
    type: String,
    enum: ['order', 'referral', 'birthday', 'signup', 'review', 'social-share', 'manual', 'promotion'],
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  // Related Records
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  
  relatedReferral: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  
  // Redemption Details (if type is 'redeemed')
  redemption: {
    discountAmount: Number, // Actual discount given
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  },
  
  // Expiry (for earned points)
  expiresAt: Date,
  
  isExpired: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['Owner', 'Manager', 'Employee', 'System', 'Customer']
  },
  
  notes: String
  
}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================

TransactionSchema.index({ restaurantId: 1, customerId: 1, createdAt: -1 });
TransactionSchema.index({ expiresAt: 1 });

// ============================================
// STATIC METHODS
// ============================================

// Get customer's transaction history
TransactionSchema.statics.getCustomerHistory = async function(customerId, limit = 20) {
  return await this.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Get points earned in date range
TransactionSchema.statics.getPointsEarned = async function(customerId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        customerId: mongoose.Types.ObjectId(customerId),
        type: 'earned',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$points' }
      }
    }
  ]);
  
  return result[0]?.totalPoints || 0;
};

// Get points redeemed in date range
TransactionSchema.statics.getPointsRedeemed = async function(customerId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        customerId: mongoose.Types.ObjectId(customerId),
        type: 'redeemed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: { $abs: '$points' } }
      }
    }
  ]);
  
  return result[0]?.totalPoints || 0;
};

// Expire old points
TransactionSchema.statics.expirePoints = async function() {
  const now = new Date();
  
  const expiredTransactions = await this.find({
    type: 'earned',
    expiresAt: { $lte: now },
    isExpired: false
  });
  
  for (const transaction of expiredTransactions) {
    // Mark as expired
    transaction.isExpired = true;
    await transaction.save();
    
    // Create expiry transaction
  // Resolve Customer model from the same owner DB connection as Transaction
  const Customer = this.db.model('Customer');
  const customer = await Customer.findById(transaction.customerId);
    
    if (customer && customer.loyalty.points >= transaction.points) {
      await this.create({
        restaurantId: transaction.restaurantId,
        customerId: transaction.customerId,
        type: 'expired',
        points: -transaction.points,
        previousBalance: customer.loyalty.points,
        newBalance: customer.loyalty.points - transaction.points,
        source: 'manual',
        description: `Points expired from transaction on ${transaction.createdAt.toLocaleDateString()}`,
        createdBy: null,
        createdByModel: 'System'
      });
      
      // Update customer balance
      customer.loyalty.points -= transaction.points;
      await customer.save();
    }
  }
  
  return expiredTransactions.length;
};

// Getter to obtain the Transaction model bound to an owner-specific database
const getTransactionModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Transaction', TransactionSchema);
};

module.exports = { transactionSchema: TransactionSchema, getTransactionModel };