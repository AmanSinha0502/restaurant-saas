// ============================================
// SMS NOTIFICATION SERVICE
// ============================================
// Save as: backend/src/services/smsService.js

const twilio = require('twilio');
const axios = require('axios');
const logger = require('../utils/logger');

// ============================================
// TWILIO SETUP (International)
// ============================================

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send SMS via Twilio
 */
const sendTwilioSMS = async (to, message) => {
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    logger.info(`Twilio SMS sent: ${result.sid} to ${to}`);
    
    return {
      success: true,
      provider: 'twilio',
      messageId: result.sid,
      status: result.status,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('Twilio SMS error:', error);
    return {
      success: false,
      provider: 'twilio',
      error: error.message,
      to
    };
  }
};

// ============================================
// MSG91 SETUP (India)
// ============================================

/**
 * Send SMS via MSG91
 */
const sendMSG91SMS = async (to, message, templateId = null) => {
  try {
    // Clean phone number (remove +91)
    const cleanPhone = to.replace(/\+91/, '').replace(/\s/g, '');
    
    const url = 'https://api.msg91.com/api/v5/flow/';
    
    const payload = {
      template_id: templateId || process.env.MSG91_DEFAULT_TEMPLATE_ID,
      short_url: '0',
      recipients: [
        {
          mobiles: cleanPhone,
          VAR1: message // Variable in template
        }
      ]
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`MSG91 SMS sent to ${to}: ${response.data.message}`);
    
    return {
      success: true,
      provider: 'msg91',
      messageId: response.data.request_id,
      status: response.data.type,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('MSG91 SMS error:', error);
    return {
      success: false,
      provider: 'msg91',
      error: error.response?.data?.message || error.message,
      to
    };
  }
};

/**
 * Send OTP via MSG91
 */
const sendMSG91OTP = async (to, otp, templateId = null) => {
  try {
    const cleanPhone = to.replace(/\+91/, '').replace(/\s/g, '');
    
    const url = 'https://control.msg91.com/api/v5/otp';
    
    const payload = {
      template_id: templateId || process.env.MSG91_OTP_TEMPLATE_ID,
      mobile: cleanPhone,
      otp: otp
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`MSG91 OTP sent to ${to}`);
    
    return {
      success: true,
      provider: 'msg91',
      messageId: response.data.request_id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('MSG91 OTP error:', error);
    return {
      success: false,
      provider: 'msg91',
      error: error.response?.data?.message || error.message,
      to
    };
  }
};

// ============================================
// UNIFIED SMS INTERFACE
// ============================================

/**
 * Send SMS (Auto-select provider based on country)
 */
const sendSMS = async (to, message, options = {}) => {
  try {
    // Determine provider based on country code
    const isIndia = to.startsWith('+91');
    
    let result;
    
    if (isIndia && process.env.MSG91_AUTH_KEY) {
      // Use MSG91 for India
      result = await sendMSG91SMS(to, message, options.templateId);
    } else if (process.env.TWILIO_ACCOUNT_SID) {
      // Use Twilio for international
      result = await sendTwilioSMS(to, message);
    } else {
      throw new Error('No SMS provider configured');
    }
    
    // Log to database
    if (options.logToDb && options.notificationModel) {
      await logNotification(options.notificationModel, {
        type: 'sms',
        recipient: to,
        content: message,
        provider: result.provider,
        status: result.success ? 'sent' : 'failed',
        providerId: result.messageId,
        errorMessage: result.error,
        ...options.metadata
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Send SMS error:', error);
    return {
      success: false,
      error: error.message,
      to
    };
  }
};

/**
 * Send Bulk SMS
 */
const sendBulkSMS = async (recipients, message, options = {}) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message, options);
    results.push(result);
    
    // Rate limiting (avoid provider throttling)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  logger.info(`Bulk SMS sent: ${successCount} succeeded, ${failCount} failed`);
  
  return {
    success: successCount > 0,
    total: recipients.length,
    successCount,
    failCount,
    results
  };
};

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

const templates = {
  orderConfirmed: (orderNumber, total, estimatedTime) => 
    `Your order #${orderNumber} has been confirmed! Total: ${total}. Estimated time: ${estimatedTime} mins. Track: [link]`,
  
  orderPreparing: (orderNumber) => 
    `Your order #${orderNumber} is being prepared! 🍳 We'll notify you when it's ready.`,
  
  orderReady: (orderNumber, orderType) => 
    orderType === 'dine-in' 
      ? `Your order #${orderNumber} is ready to be served! ✅`
      : `Your order #${orderNumber} is ready for pickup! 🎉 Please collect from counter.`,
  
  orderDelivered: (orderNumber) => 
    `Your order #${orderNumber} has been delivered! 🚚 Enjoy your meal! Rate your experience: [link]`,
  
  reservationConfirmed: (date, time, tableNumber, guests) => 
    `Table reserved! 🪑 Date: ${date}, Time: ${time}, Table: ${tableNumber}, Guests: ${guests}. Show QR at entry.`,
  
  reservationReminder: (time, tableNumber) => 
    `Reminder: Your reservation at ${time} (Table ${tableNumber}) is in 1 hour! See you soon! 🎉`,
  
  loyaltyPoints: (points, balance) => 
    `You earned ${points} points! 🎁 Total: ${balance} points (₹${Math.floor(balance/2)} discount available)`,
  
  lowStock: (itemName, currentStock, unit) => 
    `⚠️ LOW STOCK ALERT: ${itemName} - Only ${currentStock}${unit} remaining. Please restock.`,
  
  birthdayWish: (name, bonusPoints) => 
    `Happy Birthday ${name}! 🎂 We've added ${bonusPoints} bonus points to your account. Enjoy! 🎉`,
  
  otpVerification: (otp) => 
    `Your OTP for verification is: ${otp}. Valid for 10 minutes. Do not share with anyone.`
};

/**
 * Get template with variables
 */
const getTemplate = (templateName, variables) => {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }
  return typeof template === 'function' ? template(...variables) : template;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log notification to database
 */
const logNotification = async (Notification, data) => {
  try {
    await Notification.create(data);
  } catch (error) {
    logger.error('Failed to log notification:', error);
  }
};

/**
 * Validate phone number
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Format phone number for provider
 */
const formatPhone = (phone, countryCode = '+91') => {
  let formatted = phone.replace(/\s/g, '');
  if (!formatted.startsWith('+')) {
    formatted = countryCode + formatted;
  }
  return formatted;
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core functions
  sendSMS,
  sendBulkSMS,
  sendTwilioSMS,
  sendMSG91SMS,
  sendMSG91OTP,
  
  // Templates
  getTemplate,
  templates,
  
  // Helpers
  validatePhone,
  formatPhone
};