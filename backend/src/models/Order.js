// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   restaurantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Restaurant',
//     required: true,
//     index: true
//   },
  
//   orderNumber: {
//     type: String,
//     required: true,
//     unique: true
//   },
  
//   customer: {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Customer',
//       default: null // null for guest checkout
//     },
//     name: {
//       type: String,
//       required: true
//     },
//     phone: {
//       type: String,
//       required: true
//     },
//     email: {
//       type: String
//     }
//   },
  
//   orderType: {
//     type: String,
//     enum: ['dine-in', 'takeaway', 'delivery'],
//     required: true,
//     index: true
//   },
  
//   orderSource: {
//     type: String,
//     enum: ['website', 'pos'],
//     required: true,
//     index: true
//   },
  
//   items: [{
//     menuId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Menu',
//       required: true
//     },
//     name: {
//       en: String,
//       hi: String,
//       ar: String
//     },
//     quantity: {
//       type: Number,
//       required: true,
//       min: 1
//     },
//     price: {
//       type: Number,
//       required: true
//     },
//     subtotal: {
//       type: Number,
//       required: true
//     },
//     customizations: [{
//       name: String,
//       selectedOption: String,
//       priceModifier: Number
//     }],
//     specialInstructions: {
//       type: String
//     }
//   }],
  
//   pricing: {
//     subtotal: {
//       type: Number,
//       required: true,
//       min: 0
//     },
//     tax: {
//       type: {
//         type: String, // GST, VAT
//         enum: ['GST', 'VAT', 'Sales Tax']
//       },
//       rate: {
//         type: Number,
//         min: 0,
//         max: 100
//       },
//       amount: {
//         type: Number,
//         default: 0
//       }
//     },
//     deliveryCharge: {
//       type: Number,
//       default: 0
//     },
//     discount: {
//       couponCode: String,
//       amount: {
//         type: Number,
//         default: 0
//       }
//     },
//     total: {
//       type: Number,
//       required: true,
//       min: 0
//     }
//   },
  
//   deliveryDetails: {
//     address: {
//       street: String,
//       landmark: String,
//       city: String,
//       postalCode: String
//     },
//     deliveryBoyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Employee'
//     },
//     deliveryBoyName: String,
//     deliveryBoyPhone: String,
//     deliveryInstructions: String
//   },
  
//   tableDetails: {
//     tableId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Table'
//     },
//     tableNumber: String,
//     numberOfGuests: Number
//   },
  
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'],
//     default: 'pending',
//     index: true
//   },
  
//   statusHistory: [{
//     status: {
//       type: String,
//       required: true
//     },
//     timestamp: {
//       type: Date,
//       default: Date.now
//     },
//     updatedBy: {
//       type: String // userId or "system"
//     },
//     note: String
//   }],
  
//   payment: {
//     method: {
//       type: String,
//       enum: ['razorpay', 'stripe', 'paypal', 'cod', 'cash', 'card', 'upi'],
//       required: true
//     },
//     status: {
//       type: String,
//       enum: ['pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
//       default: 'pending'
//     },
//     transactionId: String,
//     paymentTimestamp: Date,
//     refundDetails: {
//       amount: Number,
//       reason: String,
//       refundedAt: Date,
//       refundTransactionId: String
//     }
//   },
  
//   kitchenTimings: {
//     receivedAt: {
//       type: Date,
//       default: Date.now
//     },
//     startedAt: Date,
//     completedAt: Date,
//     estimatedReadyTime: Date
//   },
  
//   priority: {
//     type: Number,
//     default: 2 // 1=Dine-in (highest), 2=Takeaway, 3=Delivery (lowest)
//   },
  
//   invoiceUrl: String,
  
//   notes: String,
  
//   feedback: {
//     rating: {
//       type: Number,
//       min: 1,
//       max: 5
//     },
//     comment: String,
//     submittedAt: Date
//   },
  
//   // For delivery tracking
//   estimatedDeliveryTime: Date,
//   actualDeliveryTime: Date
// }, {
//   timestamps: true
// });

// // Indexes
// orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
// orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
// orderSchema.index({ orderNumber: 1 }, { unique: true });
// orderSchema.index({ orderSource: 1, orderType: 1 });
// orderSchema.index({ 'payment.status': 1 });

// // Pre-save: Generate order number
// orderSchema.pre('save', async function(next) {
//   if (this.isNew && !this.orderNumber) {
//     const date = new Date();
//     const timestamp = date.getTime().toString().slice(-6);
//     const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//     this.orderNumber = `ORD-${timestamp}${random}`;
//   }
  
//   // Set priority based on order type
//   if (this.isNew) {
//     switch (this.orderType) {
//       case 'dine-in':
//         this.priority = 1;
//         break;
//       case 'takeaway':
//         this.priority = 2;
//         break;
//       case 'delivery':
//         this.priority = 3;
//         break;
//     }
//   }
  
//   next();
// });

// // Method to update status with history
// orderSchema.methods.updateStatus = function(newStatus, updatedBy, note = null) {
//   this.status = newStatus;
//   this.statusHistory.push({
//     status: newStatus,
//     timestamp: new Date(),
//     updatedBy,
//     note
//   });
  
//   // Update kitchen timings
//   if (newStatus === 'preparing' && !this.kitchenTimings.startedAt) {
//     this.kitchenTimings.startedAt = new Date();
//     this.kitchenTimings.estimatedReadyTime = new Date(Date.now() + 25 * 60 * 1000); // +25 min
//   }
  
//   if (newStatus === 'ready' && !this.kitchenTimings.completedAt) {
//     this.kitchenTimings.completedAt = new Date();
//   }
  
//   return this.save();
// };

// // Method to calculate estimated ready time based on items
// orderSchema.methods.calculateEstimatedTime = function() {
//   let maxPrepTime = 15; // default 15 minutes
  
//   this.items.forEach(item => {
//     // We'll need to populate menu items to get prep time
//     // For now, use a default
//     maxPrepTime = Math.max(maxPrepTime, 20);
//   });
  
//   this.kitchenTimings.estimatedReadyTime = new Date(Date.now() + maxPrepTime * 60 * 1000);
//   return maxPrepTime;
// };

// // Virtual for elapsed time since order placed
// orderSchema.virtual('elapsedMinutes').get(function() {
//   if (!this.kitchenTimings.receivedAt) return 0;
//   const elapsed = Date.now() - this.kitchenTimings.receivedAt.getTime();
//   return Math.floor(elapsed / (1000 * 60));
// });

// // Method to get Order model with owner database connection
// const getOrderModel = (ownerId) => {
//   const dbName = `owner_${ownerId}`;
//   const connection = mongoose.connection.useDb(dbName, { useCache: true });
//   return connection.model('Order', orderSchema);
// };

// module.exports = { orderSchema, getOrderModel };



// ============================================
// ORDER MODEL (ENHANCED)
// ============================================
// Save as: backend/src/models/Order.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Basic Info
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Customer Details
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  
  // Order Classification
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    required: true,
    index: true
  },
  orderSource: {
    type: String,
    enum: ['website', 'pos', 'phone', 'walkin'],
    default: 'website',
    index: true
  },
  
  // Order Items
  items: [{
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    name: {
      en: String,
      hi: String,
      ar: String
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true
    },
    specialInstructions: String,
    customizations: [{
      name: String,
      value: String,
      price: Number
    }]
  }],
  
  // Pricing Breakdown
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: {
        type: String,
        enum: ['GST', 'VAT', 'None'],
        default: 'GST'
      },
      rate: {
        type: Number,
        min: 0,
        max: 100,
        default: 5
      },
      amount: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    deliveryCharge: {
      type: Number,
      min: 0,
      default: 0
    },
    packagingCharge: {
      type: Number,
      min: 0,
      default: 0
    },
    discount: {
      couponCode: String,
      amount: {
        type: Number,
        min: 0,
        default: 0
      }
    },
    tip: {
      type: Number,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  // Delivery Details (for delivery orders)
  deliveryDetails: {
    address: {
      street: String,
      landmark: String,
      city: String,
      state: String,
      postalCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    deliveryBoyName: String,
    deliveryBoyPhone: String,
    deliveryInstructions: String,
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date
  },
  
  // Table Details (for dine-in orders)
  tableDetails: {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table'
    },
    tableNumber: String,
    numberOfGuests: Number
  },
  
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['Owner', 'Manager', 'Employee', 'Customer']
    },
    note: String
  }],
  
  // Payment Info
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', 'cod', 'cash', 'card', 'upi'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
      default: 'pending',
      index: true
    },
    transactionId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paymentTimestamp: Date,
    refundDetails: {
      amount: Number,
      reason: String,
      refundedAt: Date,
      refundTransactionId: String
    }
  },
  
  // Kitchen Timings
  kitchenTimings: {
    receivedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: Date,
    completedAt: Date,
    estimatedReadyTime: Date,
    preparationTime: Number // in minutes
  },
  
  // Priority for Kitchen (1=highest)
  priority: {
    type: Number,
    default: function() {
      if (this.orderType === 'dine-in') return 1;
      if (this.orderType === 'takeaway') return 2;
      return 3; // delivery
    }
  },
  
  // Additional Info
  invoiceUrl: String,
  notes: String,
  internalNotes: String, // Staff notes, not visible to customer
  
  // Cancellation Info
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'cancelledByModel'
  },
  cancelledByModel: {
    type: String,
    enum: ['Owner', 'Manager', 'Employee', 'Customer']
  },
  
  // Ratings & Feedback
  rating: {
    food: Number, // 1-5
    service: Number, // 1-5
    delivery: Number, // 1-5
    overall: Number, // 1-5
    comment: String,
    ratedAt: Date
  },
  
  // Flags
  isTestOrder: {
    type: Boolean,
    default: false
  },
  isPaid: {
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
    enum: ['Owner', 'Manager', 'Employee', 'Customer']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================

orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

// Calculate elapsed time since order creation
orderSchema.virtual('elapsedTime').get(function() {
  if (!this.kitchenTimings.receivedAt) return 0;
  const now = new Date();
  return Math.floor((now - this.kitchenTimings.receivedAt) / 60000); // minutes
});

// Check if order is aging (>30 minutes)
orderSchema.virtual('isAging').get(function() {
  return this.elapsedTime > 30;
});

// ============================================
// METHODS
// ============================================

// Generate unique order number
orderSchema.statics.generateOrderNumber = async function(restaurantId) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const count = await this.countDocuments({
    restaurantId,
    createdAt: {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999))
    }
  });
  
  const orderNum = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  return orderNum;
};

// Update order status
orderSchema.methods.updateStatus = async function(newStatus, updatedBy, updatedByModel, note = '') {
  this.status = newStatus;
  
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    updatedByModel,
    note
  });
  
  // Update kitchen timings
  if (newStatus === 'preparing' && !this.kitchenTimings.startedAt) {
    this.kitchenTimings.startedAt = new Date();
  } else if (newStatus === 'ready' && !this.kitchenTimings.completedAt) {
    this.kitchenTimings.completedAt = new Date();
    
    // Calculate actual preparation time
    if (this.kitchenTimings.startedAt) {
      const prepTime = Math.floor(
        (this.kitchenTimings.completedAt - this.kitchenTimings.startedAt) / 60000
      );
      this.kitchenTimings.preparationTime = prepTime;
    }
  } else if (newStatus === 'completed') {
    if (this.orderType === 'delivery' && !this.deliveryDetails?.actualDeliveryTime) {
      this.deliveryDetails.actualDeliveryTime = new Date();
    }
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
  
  await this.save();
  return this;
};

// Cancel order with refund
orderSchema.methods.cancelOrder = async function(reason, cancelledBy, cancelledByModel) {
  if (this.status === 'cancelled') {
    throw new Error('Order is already cancelled');
  }
  
  if (this.status === 'completed') {
    throw new Error('Cannot cancel completed order');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledByModel = cancelledByModel;
  
  // Add to status history
  this.statusHistory.push({
    status: 'cancelled',
    timestamp: new Date(),
    updatedBy: cancelledBy,
    updatedByModel: cancelledByModel,
    note: reason
  });
  
  await this.save();
  return this;
};

// Mark as paid
orderSchema.methods.markAsPaid = async function(paymentDetails) {
  this.payment.status = 'paid';
  this.payment.transactionId = paymentDetails.transactionId;
  this.payment.razorpayOrderId = paymentDetails.razorpayOrderId;
  this.payment.razorpayPaymentId = paymentDetails.razorpayPaymentId;
  this.payment.razorpaySignature = paymentDetails.razorpaySignature;
  this.payment.paymentTimestamp = new Date();
  this.isPaid = true;
  
  await this.save();
  return this;
};

// Calculate estimated ready time
orderSchema.methods.calculateEstimatedTime = function() {
  // Sum of all item preparation times + buffer
  let totalPrepTime = 0;
  
  // Assuming each item has a preparation time (you can adjust this)
  this.items.forEach(item => {
    totalPrepTime += 10; // Default 10 minutes per unique item
  });
  
  // Add buffer based on order size
  const buffer = Math.ceil(this.items.length / 3) * 5;
  totalPrepTime += buffer;
  
  const estimatedTime = new Date(this.kitchenTimings.receivedAt);
  estimatedTime.setMinutes(estimatedTime.getMinutes() + totalPrepTime);
  
  this.kitchenTimings.estimatedReadyTime = estimatedTime;
  return totalPrepTime;
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

orderSchema.pre('save', function(next) {
  // Calculate estimated time if not set
  if (!this.kitchenTimings.estimatedReadyTime) {
    this.calculateEstimatedTime();
  }
  
  // Ensure isPaid flag matches payment status
  this.isPaid = this.payment.status === 'paid';
  
  next();
});

// ============================================
// QUERY HELPERS
// ============================================

// Get active orders (pending, preparing, ready)
orderSchema.query.active = function() {
  return this.where('status').in(['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery']);
};

// Get orders by restaurant
orderSchema.query.byRestaurant = function(restaurantId) {
  return this.where('restaurantId').equals(restaurantId);
};

// Get orders by date range
orderSchema.query.byDateRange = function(startDate, endDate) {
  return this.where('createdAt').gte(startDate).lte(endDate);
};

// Getter to obtain the Order model bound to an owner-specific database
const getOrderModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Order', orderSchema);
};

module.exports = { orderSchema, getOrderModel };