const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const smsService = require('../services/smsService');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

/**
 * Send Test Notification
 * POST /api/notifications/test
 */
const sendTestNotification = async (req, res) => {
  try {
    const { type, recipient, message } = req.body;
    
    let result;
    
    switch (type) {
      case 'sms':
        result = await smsService.sendSMS(recipient, message);
        break;
      
      case 'whatsapp':
        result = await whatsappService.sendTextMessage(recipient, message);
        break;
      
      case 'email':
        result = await emailService.sendEmail(recipient, 'Test Email', `<p>${message}</p>`);
        break;
      
      default:
        return ResponseHelper.error(res, 400, 'Invalid notification type');
    }
    
    return ResponseHelper.success(res, 200, 'Test notification sent', { result });
    
  } catch (error) {
    logger.error('Send test notification error:', error);
    return ResponseHelper.error(res, 500, 'Failed to send test notification');
  }
};

/**
 * Get Notification Logs
 * GET /api/notifications
 */
const getNotificationLogs = async (req, res) => {
  try {
    const {
      restaurantId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Notification = models.Notification;
    
    const query = {};
    
    if (restaurantId) {
      query.restaurantId = restaurantId;
    } else if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, totalCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query)
    ]);
    
    return ResponseHelper.success(res, 200, 'Notification logs retrieved successfully', {
      logs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error('Get notification logs error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve notification logs');
  }
};

/**
 * Get Notification Statistics
 * GET /api/notifications/stats
 */
const getNotificationStats = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Notification = models.Notification;
    
    const query = {};
    if (restaurantId) query.restaurantId = restaurantId;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const [
      totalNotifications,
      sentNotifications,
      failedNotifications,
      notificationsByType,
      notificationsByStatus
    ] = await Promise.all([
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, status: 'sent' }),
      Notification.countDocuments({ ...query, status: 'failed' }),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Notification.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);
    
    return ResponseHelper.success(res, 200, 'Notification statistics retrieved successfully', {
      stats: {
        total: totalNotifications,
        sent: sentNotifications,
        failed: failedNotifications,
        successRate: totalNotifications > 0 ? ((sentNotifications / totalNotifications) * 100).toFixed(2) : 0,
        byType: notificationsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byStatus: notificationsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    logger.error('Get notification stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve notification statistics');
  }
};

module.exports = {
  sendTestNotification,
  getNotificationLogs,
  getNotificationStats
};