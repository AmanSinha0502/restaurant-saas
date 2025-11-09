const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null // null for guest checkout
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    }
  },
  
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    required: true,
    index: true
  },
  
  orderSource: {
    type: String,
    enum: ['website', 'pos'],
    required: true,
    index: true
  },
  
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
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    customizations: [{
      name: String,
      selectedOption: String,
      priceModifier: Number
    }],
    specialInstructions: {
      type: String
    }
  }],
  
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: {
        type: String, // GST, VAT
        enum: ['GST', 'VAT', 'Sales Tax']
      },
      rate: {
        type: Number,
        min: 0,
        max: 100
      },
      amount: {
        type: Number,
        default: 0
      }
    },
    deliveryCharge: {
      type: Number,
      default: 0
    },
    discount: {
      couponCode: String,
      amount: {
        type: Number,
        default: 0
      }
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  
  deliveryDetails: {
    address: {
      street: String,
      landmark: String,
      city: String,
      postalCode: String
    },
    deliveryBoyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    deliveryBoyName: String,
    deliveryBoyPhone: String,
    deliveryInstructions: String
  },
  
  tableDetails: {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table'
    },
    tableNumber: String,
    numberOfGuests: Number
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String // userId or "system"
    },
    note: String
  }],
  
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'stripe', 'paypal', 'cod', 'cash', 'card', 'upi'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially-refunded'],
      default: 'pending'
    },
    transactionId: String,
    paymentTimestamp: Date,
    refundDetails: {
      amount: Number,
      reason: String,
      refundedAt: Date,
      refundTransactionId: String
    }
  },
  
  kitchenTimings: {
    receivedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: Date,
    completedAt: Date,
    estimatedReadyTime: Date
  },
  
  priority: {
    type: Number,
    default: 2 // 1=Dine-in (highest), 2=Takeaway, 3=Delivery (lowest)
  },
  
  invoiceUrl: String,
  
  notes: String,
  
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  
  // For delivery tracking
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'customer.userId': 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ orderSource: 1, orderType: 1 });
orderSchema.index({ 'payment.status': 1 });

// Pre-save: Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ORD-${timestamp}${random}`;
  }
  
  // Set priority based on order type
  if (this.isNew) {
    switch (this.orderType) {
      case 'dine-in':
        this.priority = 1;
        break;
      case 'takeaway':
        this.priority = 2;
        break;
      case 'delivery':
        this.priority = 3;
        break;
    }
  }
  
  next();
});

// Method to update status with history
orderSchema.methods.updateStatus = function(newStatus, updatedBy, note = null) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    note
  });
  
  // Update kitchen timings
  if (newStatus === 'preparing' && !this.kitchenTimings.startedAt) {
    this.kitchenTimings.startedAt = new Date();
    this.kitchenTimings.estimatedReadyTime = new Date(Date.now() + 25 * 60 * 1000); // +25 min
  }
  
  if (newStatus === 'ready' && !this.kitchenTimings.completedAt) {
    this.kitchenTimings.completedAt = new Date();
  }
  
  return this.save();
};

// Method to calculate estimated ready time based on items
orderSchema.methods.calculateEstimatedTime = function() {
  let maxPrepTime = 15; // default 15 minutes
  
  this.items.forEach(item => {
    // We'll need to populate menu items to get prep time
    // For now, use a default
    maxPrepTime = Math.max(maxPrepTime, 20);
  });
  
  this.kitchenTimings.estimatedReadyTime = new Date(Date.now() + maxPrepTime * 60 * 1000);
  return maxPrepTime;
};

// Virtual for elapsed time since order placed
orderSchema.virtual('elapsedMinutes').get(function() {
  if (!this.kitchenTimings.receivedAt) return 0;
  const elapsed = Date.now() - this.kitchenTimings.receivedAt.getTime();
  return Math.floor(elapsed / (1000 * 60));
});

// Method to get Order model with owner database connection
const getOrderModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Order', orderSchema);
};

module.exports = { orderSchema, getOrderModel };