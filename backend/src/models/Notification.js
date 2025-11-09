const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipient.userType'
    },
    userType: {
      type: String,
      enum: ['Customer', 'Manager', 'Employee']
    },
    phone: String,
    email: String,
    name: String
  },
  
  type: {
    type: String,
    enum: ['sms', 'email', 'whatsapp', 'push'],
    required: true,
    index: true
  },
  
  template: {
    type: String,
    required: true,
    enum: [
      'order_confirmation',
      'order_status_update',
      'order_ready',
      'order_dispatched',
      'reservation_confirmation',
      'reservation_reminder',
      'loyalty_points',
      'low_stock',
      'out_of_stock',
      'new_order',
      'failed_payment',
      'welcome_email',
      'password_reset',
      'daily_report'
    ]
  },
  
  subject: String, // For email
  
  content: {
    type: String,
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered', 'bounced'],
    default: 'pending',
    index: true
  },
  
  provider: {
    type: String,
    enum: ['twilio', 'msg91', 'sendgrid', 'aws_ses', 'whatsapp_business'],
    required: true
  },
  
  providerId: String, // Provider's message ID
  
  providerResponse: mongoose.Schema.Types.Mixed,
  
  errorMessage: String,
  
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Order', 'Reservation', 'Inventory', 'Customer']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date, // For emails
  clickedAt: Date, // For emails with links
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastRetryAt: Date,
  
  cost: {
    type: Number,
    default: 0 // Cost per SMS/Email
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ restaurantId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ template: 1 });

// Method to mark as sent
notificationSchema.methods.markSent = function(providerId, providerResponse) {
  this.status = 'sent';
  this.providerId = providerId;
  this.providerResponse = providerResponse;
  this.sentAt = new Date();
  return this.save();
};

// Method to mark as failed
notificationSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

// Method to mark as delivered
notificationSchema.methods.markDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Method to retry
notificationSchema.methods.retry = function() {
  if (this.retryCount >= 3) {
    throw new Error('Maximum retry attempts reached');
  }
  
  this.status = 'pending';
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

// Static method to get notification stats
notificationSchema.statics.getStats = async function(restaurantId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status'
        },
        count: { $sum: 1 },
        totalCost: { $sum: '$cost' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get failed notifications for retry
notificationSchema.statics.getFailedForRetry = async function(restaurantId) {
  return await this.find({
    restaurantId,
    status: 'failed',
    retryCount: { $lt: 3 }
  }).limit(100);
};

// Method to get Notification model with owner database connection
const getNotificationModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Notification', notificationSchema);
};

module.exports = { notificationSchema, getNotificationModel };