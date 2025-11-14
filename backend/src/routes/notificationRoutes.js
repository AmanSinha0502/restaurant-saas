const express = require('express');
const router = express.Router();

const {
  sendTestNotification,
  getNotificationLogs,
  getNotificationStats
} = require('../controllers/notificationController');

const {
  authenticate,
  requireManager,
  attachOwnerModels,
  asyncHandler
} = require('../middlewares');

// Test notification
router.post('/test', authenticate, requireManager, attachOwnerModels, asyncHandler(sendTestNotification));

// Notification logs
router.get('/', authenticate, requireManager, attachOwnerModels, asyncHandler(getNotificationLogs));

// Statistics
router.get('/stats', authenticate, requireManager, attachOwnerModels, asyncHandler(getNotificationStats));

module.exports = router;