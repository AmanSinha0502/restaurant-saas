const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  transactionType: {
    type: String,
    enum: ['order', 'reservation', 'refund'],
    required: true,
    index: true
  },
  
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'transactionType'
  },
  
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    name: {
      type: String,
      required: true
    },
    email: String,
    phone: String
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'cash', 'card', 'upi'],
    required: true
  },
  
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'manual'],
    required: true
  },
  
  gatewayResponse: {
    transactionId: {
      type: String,
      index: true
    },
    orderId: String, // Gateway's order ID
    signature: String, // For verification
    status: String,
    errorCode: String,
    errorMessage: String,
    rawResponse: mongoose.Schema.Types.Mixed
  },
  
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded', 'partially-refunded'],
    default: 'pending',
    required: true,
    index: true
  },
  
  refund: {
    amount: {
      type: Number,
      default: 0
    },
    reason: String,
    refundedAt: Date,
    refundTransactionId: String,
    refundGatewayResponse: mongoose.Schema.Types.Mixed
  },
  
  fees: {
    gatewayFee: {
      type: Number,
      default: 0
    },
    gatewayFeePercentage: {
      type: Number,
      default: 2 // 2% gateway fee
    },
    netAmount: {
      type: Number,
      default: 0
    }
  },
  
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceType: String
  },
  
  // For reconciliation
  settledAt: Date,
  settlementId: String,
  
  // Retry information
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastRetryAt: Date
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ 'customer.userId': 1 });
transactionSchema.index({ 'gatewayResponse.transactionId': 1 });
transactionSchema.index({ referenceId: 1, transactionType: 1 });

// Pre-save: Calculate fees
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') && this.status === 'success') {
    this.fees.gatewayFee = (this.amount * this.fees.gatewayFeePercentage) / 100;
    this.fees.netAmount = this.amount - this.fees.gatewayFee;
  }
  next();
});

// Method to mark as success
transactionSchema.methods.markSuccess = function(gatewayResponse) {
  this.status = 'success';
  this.gatewayResponse = {
    ...this.gatewayResponse,
    ...gatewayResponse,
    status: 'success'
  };
  return this.save();
};

// Method to mark as failed
transactionSchema.methods.markFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.gatewayResponse.status = 'failed';
  this.gatewayResponse.errorCode = errorCode;
  this.gatewayResponse.errorMessage = errorMessage;
  return this.save();
};

// Method to process refund
transactionSchema.methods.processRefund = async function(refundAmount, reason) {
  if (this.status !== 'success') {
    throw new Error('Can only refund successful transactions');
  }
  
  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed transaction amount');
  }
  
  this.refund = {
    amount: refundAmount,
    reason,
    refundedAt: new Date()
  };
  
  if (refundAmount === this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially-refunded';
  }
  
  return this.save();
};

// Method to retry failed transaction
transactionSchema.methods.retry = function() {
  if (this.status === 'success') {
    throw new Error('Cannot retry successful transaction');
  }
  
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'pending';
  
  return this.save();
};

// Static method to get daily revenue
transactionSchema.statics.getDailyRevenue = async function(restaurantId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const result = await this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: 'success',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalFees: { $sum: '$fees.gatewayFee' },
        netRevenue: { $sum: '$fees.netAmount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || {
    totalRevenue: 0,
    totalFees: 0,
    netRevenue: 0,
    transactionCount: 0
  };
};

// Static method to get revenue breakdown by payment method
transactionSchema.statics.getRevenueByPaymentMethod = async function(restaurantId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: 'success',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Method to get Transaction model with owner database connection
const getTransactionModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Transaction', transactionSchema);
};

module.exports = { transactionSchema, getTransactionModel };