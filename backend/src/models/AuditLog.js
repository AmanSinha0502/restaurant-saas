const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  action: {
    type: String,
    required: true,
    index: true
    // Examples: "menu_item_created", "order_cancelled", "user_blocked", etc.
  },
  
  performedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userType: {
      type: String,
      enum: ['owner', 'manager', 'employee', 'system'],
      required: true
    },
    role: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: String
  },
  
  targetResource: {
    type: {
      type: String,
      required: true,
      enum: [
        'menu',
        'order',
        'reservation',
        'table',
        'customer',
        'inventory',
        'coupon',
        'employee',
        'manager',
        'restaurant',
        'settings'
      ]
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    },
    name: String,
    identifier: String // order number, table number, etc.
  },
  
  changes: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  
  changesSummary: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }], // For multiple field changes
  
  reason: String,
  
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceType: String,
    location: {
      country: String,
      city: String
    }
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  category: {
    type: String,
    enum: [
      'create',
      'update',
      'delete',
      'status_change',
      'access',
      'security',
      'configuration'
    ],
    required: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Using custom timestamp field
});

// Indexes
auditLogSchema.index({ restaurantId: 1, timestamp: -1 });
auditLogSchema.index({ 'performedBy.userId': 1, timestamp: -1 });
auditLogSchema.index({ 'targetResource.type': 1, 'targetResource.id': 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

// Static method to log action
auditLogSchema.statics.logAction = async function(logData) {
  const log = new this(logData);
  return await log.save();
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, limit = 50) {
  return await this.find({
    'performedBy.userId': userId
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to get resource history
auditLogSchema.statics.getResourceHistory = async function(resourceType, resourceId, limit = 50) {
  return await this.find({
    'targetResource.type': resourceType,
    'targetResource.id': resourceId
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to get critical actions
auditLogSchema.statics.getCriticalActions = async function(restaurantId, days = 7) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  return await this.find({
    restaurantId,
    severity: { $in: ['high', 'critical'] },
    timestamp: { $gte: dateThreshold }
  })
  .sort({ timestamp: -1 });
};

// Static method to get activity summary
auditLogSchema.statics.getActivitySummary = async function(restaurantId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          userType: '$performedBy.userType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Method to get AuditLog model with owner database connection
const getAuditLogModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('AuditLog', auditLogSchema);
};

module.exports = { auditLogSchema, getAuditLogModel };