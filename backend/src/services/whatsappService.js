// ============================================
// WHATSAPP NOTIFICATION SERVICE
// ============================================
// Save as: backend/src/services/whatsappService.js

const axios = require('axios');
const logger = require('../utils/logger');

// ============================================
// WHATSAPP BUSINESS API SETUP
// ============================================

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send WhatsApp Text Message
 */
const sendTextMessage = async (to, message) => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp message sent to ${to}: ${response.data.messages[0].id}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

/**
 * Send WhatsApp Template Message
 */
const sendTemplateMessage = async (to, templateName, languageCode, components) => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode || 'en'
        },
        components: components || []
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp template message sent to ${to}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp template send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

/**
 * Send WhatsApp Message with Image
 */
const sendImageMessage = async (to, imageUrl, caption = '') => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp image message sent to ${to}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp image send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

/**
 * Send WhatsApp Message with Document
 */
const sendDocumentMessage = async (to, documentUrl, filename, caption = '') => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp document sent to ${to}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp document send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

/**
 * Send WhatsApp Interactive Button Message
 */
const sendInteractiveButtonMessage = async (to, bodyText, buttons) => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: buttons.map((btn, index) => ({
            type: 'reply',
            reply: {
              id: `btn_${index}`,
              title: btn
            }
          }))
        }
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp interactive message sent to ${to}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp interactive send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

/**
 * Send WhatsApp Location Message
 */
const sendLocationMessage = async (to, latitude, longitude, name, address) => {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\+/g, ''),
      type: 'location',
      location: {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        name: name,
        address: address
      }
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`WhatsApp location sent to ${to}`);
    
    return {
      success: true,
      provider: 'whatsapp',
      messageId: response.data.messages[0].id,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('WhatsApp location send error:', error.response?.data || error.message);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.response?.data?.error?.message || error.message,
      to
    };
  }
};

// ============================================
// PRE-DEFINED TEMPLATES
// ============================================

const whatsappTemplates = {
  /**
   * Order Confirmation Template
   */
  orderConfirmed: async (to, orderNumber, total, estimatedTime, trackingUrl) => {
    return await sendTemplateMessage(to, 'order_confirmed', 'en', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: total },
          { type: 'text', text: estimatedTime }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: trackingUrl }
        ]
      }
    ]);
  },
  
  /**
   * Order Ready Template
   */
  orderReady: async (to, orderNumber) => {
    return await sendInteractiveButtonMessage(
      to,
      `✅ Your order #${orderNumber} is ready for pickup!\n\nPlease collect from counter.\n\nThank you! 🎉`,
      ['View Details', 'Need Help']
    );
  },
  
  /**
   * Reservation Confirmation
   */
  reservationConfirmed: async (to, date, time, tableNumber, guests, qrCodeUrl) => {
    const message = `🪑 *Table Reserved!*\n\nDate: ${date}\nTime: ${time}\nTable: ${tableNumber}\nGuests: ${guests}\n\nPlease show this QR code at entry.\n\nSee you soon! 🎉`;
    
    return await sendImageMessage(to, qrCodeUrl, message);
  },
  
  /**
   * Birthday Wish with Bonus
   */
  birthdayWish: async (to, name, bonusPoints) => {
    const message = `🎂 *Happy Birthday ${name}!*\n\nWe've added *${bonusPoints} bonus points* to your account!\n\nTreat yourself today! 🎉\n\nWith love,\nYour Restaurant Team ❤️`;
    
    return await sendTextMessage(to, message);
  },
  
  /**
   * Delivery Tracking
   */
  deliveryTracking: async (to, orderNumber, deliveryBoyName, deliveryBoyPhone, trackingUrl) => {
    const message = `🚚 *Order Out for Delivery*\n\nOrder: #${orderNumber}\nDelivery Partner: ${deliveryBoyName}\nContact: ${deliveryBoyPhone}\n\nTrack live: ${trackingUrl}`;
    
    return await sendTextMessage(to, message);
  },
  
  /**
   * Invoice with PDF
   */
  sendInvoice: async (to, orderNumber, invoiceUrl) => {
    return await sendDocumentMessage(
      to,
      invoiceUrl,
      `Invoice_${orderNumber}.pdf`,
      `Thank you for your order! Here's your invoice for order #${orderNumber}.`
    );
  }
};

// ============================================
// UNIFIED WHATSAPP INTERFACE
// ============================================

/**
 * Send WhatsApp Message (Auto-select type)
 */
const sendWhatsApp = async (to, content, options = {}) => {
  try {
    let result;
    
    if (options.type === 'template' && options.templateName) {
      result = await sendTemplateMessage(
        to,
        options.templateName,
        options.languageCode,
        options.components
      );
    } else if (options.type === 'image' && options.imageUrl) {
      result = await sendImageMessage(to, options.imageUrl, content);
    } else if (options.type === 'document' && options.documentUrl) {
      result = await sendDocumentMessage(
        to,
        options.documentUrl,
        options.filename,
        content
      );
    } else if (options.type === 'interactive' && options.buttons) {
      result = await sendInteractiveButtonMessage(to, content, options.buttons);
    } else {
      result = await sendTextMessage(to, content);
    }
    
    // Log to database
    if (options.logToDb && options.notificationModel) {
      await options.notificationModel.create({
        type: 'whatsapp',
        recipient: to,
        content: content,
        provider: 'whatsapp',
        status: result.success ? 'sent' : 'failed',
        providerId: result.messageId,
        errorMessage: result.error,
        ...options.metadata
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Send WhatsApp error:', error);
    return {
      success: false,
      error: error.message,
      to
    };
  }
};

/**
 * Send Bulk WhatsApp Messages
 */
const sendBulkWhatsApp = async (recipients, content, options = {}) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendWhatsApp(recipient, content, options);
    results.push(result);
    
    // Rate limiting (avoid API throttling)
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  logger.info(`Bulk WhatsApp sent: ${successCount} succeeded, ${failCount} failed`);
  
  return {
    success: successCount > 0,
    total: recipients.length,
    successCount,
    failCount,
    results
  };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core functions
  sendWhatsApp,
  sendBulkWhatsApp,
  sendTextMessage,
  sendTemplateMessage,
  sendImageMessage,
  sendDocumentMessage,
  sendInteractiveButtonMessage,
  sendLocationMessage,
  
  // Pre-defined templates
  whatsappTemplates
};