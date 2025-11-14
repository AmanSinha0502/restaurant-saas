// ============================================
// EMAIL NOTIFICATION SERVICE
// ============================================
// Save as: backend/src/services/emailService.js

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ============================================
// SENDGRID SETUP
// ============================================

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@restaurant.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Restaurant';

/**
 * Send Email via SendGrid
 */
const sendSendGridEmail = async (to, subject, html, attachments = []) => {
  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      html,
      attachments: attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment'
      }))
    };
    
    const result = await sgMail.send(msg);
    
    logger.info(`SendGrid email sent to ${to}`);
    
    return {
      success: true,
      provider: 'sendgrid',
      messageId: result[0].headers['x-message-id'],
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('SendGrid email error:', error.response?.body || error.message);
    return {
      success: false,
      provider: 'sendgrid',
      error: error.response?.body?.errors?.[0]?.message || error.message,
      to
    };
  }
};

// ============================================
// NODEMAILER SETUP (Alternative)
// ============================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send Email via Nodemailer (SMTP)
 */
const sendNodemailerEmail = async (to, subject, html, attachments = []) => {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      attachments
    });
    
    logger.info(`Nodemailer email sent to ${to}: ${info.messageId}`);
    
    return {
      success: true,
      provider: 'nodemailer',
      messageId: info.messageId,
      to,
      sentAt: new Date()
    };
  } catch (error) {
    logger.error('Nodemailer email error:', error);
    return {
      success: false,
      provider: 'nodemailer',
      error: error.message,
      to
    };
  }
};

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Order Confirmation Email Template
 */
const orderConfirmationTemplate = (orderData) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .total { font-size: 18px; font-weight: bold; color: #667eea; padding-top: 15px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Order Confirmed!</h1>
      <p>Order #${orderData.orderNumber}</p>
    </div>
    <div class="content">
      <p>Hi ${orderData.customerName},</p>
      <p>Thank you for your order! We've received it and we're getting it ready.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        ${orderData.items.map(item => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span>${orderData.currency}${item.subtotal}</span>
          </div>
        `).join('')}
        
        <div class="item">
          <span>Subtotal</span>
          <span>${orderData.currency}${orderData.subtotal}</span>
        </div>
        <div class="item">
          <span>Tax (${orderData.taxRate}%)</span>
          <span>${orderData.currency}${orderData.tax}</span>
        </div>
        ${orderData.deliveryCharge ? `
          <div class="item">
            <span>Delivery Charge</span>
            <span>${orderData.currency}${orderData.deliveryCharge}</span>
          </div>
        ` : ''}
        
        <div class="total">
          <span>Total</span>
          <span>${orderData.currency}${orderData.total}</span>
        </div>
      </div>
      
      <p><strong>Estimated Time:</strong> ${orderData.estimatedTime} minutes</p>
      <p><strong>Order Type:</strong> ${orderData.orderType}</p>
      
      <center>
        <a href="${orderData.trackingUrl}" class="button">Track Your Order</a>
      </center>
      
      <p>If you have any questions, please contact us at ${orderData.restaurantPhone}.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${orderData.restaurantName}. All rights reserved.</p>
      <p>${orderData.restaurantAddress}</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Reservation Confirmation Email Template
 */
const reservationConfirmationTemplate = (reservationData) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .reservation-card { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
    .qr-code { text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🪑 Table Reserved!</h1>
      <p>Reservation #${reservationData.reservationNumber}</p>
    </div>
    <div class="content">
      <p>Hi ${reservationData.customerName},</p>
      <p>Your table reservation has been confirmed!</p>
      
      <div class="reservation-card">
        <h3>Reservation Details</h3>
        <div class="detail-row">
          <strong>Date:</strong>
          <span>${reservationData.date}</span>
        </div>
        <div class="detail-row">
          <strong>Time:</strong>
          <span>${reservationData.time}</span>
        </div>
        <div class="detail-row">
          <strong>Table:</strong>
          <span>${reservationData.tableNumber}</span>
        </div>
        <div class="detail-row">
          <strong>Guests:</strong>
          <span>${reservationData.numberOfGuests}</span>
        </div>
        <div class="detail-row">
          <strong>Advance Paid:</strong>
          <span>${reservationData.currency}${reservationData.advancePaid}</span>
        </div>
        <div class="detail-row">
          <strong>Balance:</strong>
          <span>${reservationData.currency}${reservationData.balance}</span>
        </div>
      </div>
      
      <div class="qr-code">
        <p><strong>Show this QR code at entry:</strong></p>
        <img src="${reservationData.qrCodeUrl}" alt="QR Code" width="200" height="200">
      </div>
      
      <p><strong>Note:</strong> Advance payment is non-refundable in case of cancellation.</p>
      
      <p>We look forward to serving you!</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Welcome Email Template
 */
const welcomeEmailTemplate = (customerData) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .benefit-item { padding: 15px; border-left: 4px solid #667eea; margin: 10px 0; background: #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ${customerData.restaurantName}!</h1>
    </div>
    <div class="content">
      <p>Hi ${customerData.customerName},</p>
      <p>Thank you for joining us! We're excited to have you as part of our family.</p>
      
      <div class="benefits">
        <h3>Your Account Benefits:</h3>
        <div class="benefit-item">
          <strong>✨ Signup Bonus:</strong> ${customerData.signupBonus} loyalty points
        </div>
        <div class="benefit-item">
          <strong>🎁 Referral Code:</strong> ${customerData.referralCode}
          <br><small>Share with friends and both get 50 points!</small>
        </div>
        <div class="benefit-item">
          <strong>⭐ Loyalty Tier:</strong> ${customerData.tier}
        </div>
        <div class="benefit-item">
          <strong>💰 Points Value:</strong> 100 points = ₹50 discount
        </div>
      </div>
      
      <p>Start ordering now and earn more rewards!</p>
      
      <center>
        <a href="${customerData.menuUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Browse Menu</a>
      </center>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Monthly Summary Email Template
 */
const monthlySummaryTemplate = (summaryData) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196F3; color: white; padding: 30px; text-align: center; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; flex: 1; margin: 0 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .stat-value { font-size: 32px; font-weight: bold; color: #2196F3; }
    .favorite-items { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your ${summaryData.month} Summary</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px;">
      <p>Hi ${summaryData.customerName},</p>
      <p>Here's a look at your dining experience this month:</p>
      
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${summaryData.totalOrders}</div>
          <div>Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summaryData.currency}${summaryData.totalSpent}</div>
          <div>Spent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summaryData.pointsEarned}</div>
          <div>Points Earned</div>
        </div>
      </div>
      
      <div class="favorite-items">
        <h3>Your Favorite Items</h3>
        ${summaryData.favoriteItems.map((item, index) => `
          <p>${index + 1}. ${item.name} (ordered ${item.count} times)</p>
        `).join('')}
      </div>
      
      <p><strong>Current Tier:</strong> ${summaryData.tier}</p>
      <p><strong>Available Points:</strong> ${summaryData.currentPoints}</p>
      
      <p>Thank you for being a valued customer! 🙏</p>
    </div>
  </div>
</body>
</html>
  `;
};

// ============================================
// UNIFIED EMAIL INTERFACE
// ============================================

/**
 * Send Email (Auto-select provider)
 */
const sendEmail = async (to, subject, html, options = {}) => {
  try {
    let result;
    
    if (process.env.SENDGRID_API_KEY) {
      result = await sendSendGridEmail(to, subject, html, options.attachments);
    } else if (process.env.SMTP_USER) {
      result = await sendNodemailerEmail(to, subject, html, options.attachments);
    } else {
      throw new Error('No email provider configured');
    }
    
    // Log to database
    if (options.logToDb && options.notificationModel) {
      await options.notificationModel.create({
        type: 'email',
        recipient: to,
        subject,
        content: html,
        provider: result.provider,
        status: result.success ? 'sent' : 'failed',
        providerId: result.messageId,
        errorMessage: result.error,
        ...options.metadata
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Send email error:', error);
    return {
      success: false,
      error: error.message,
      to
    };
  }
};

/**
 * Send Bulk Emails
 */
const sendBulkEmails = async (recipients, subject, html, options = {}) => {
  const results = [];
  
  for (const recipient of recipients) {
    const result = await sendEmail(recipient, subject, html, options);
    results.push(result);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  logger.info(`Bulk emails sent: ${successCount} succeeded, ${failCount} failed`);
  
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
  sendEmail,
  sendBulkEmails,
  sendSendGridEmail,
  sendNodemailerEmail,
  
  // Templates
  orderConfirmationTemplate,
  reservationConfirmationTemplate,
  welcomeEmailTemplate,
  monthlySummaryTemplate
};