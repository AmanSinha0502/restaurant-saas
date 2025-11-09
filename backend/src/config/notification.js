const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

// Twilio Configuration (SMS)
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// SendGrid Configuration (Email)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Notification Configuration
const notificationConfig = {
  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio', // 'twilio' or 'msg91'
    twilioClient,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    msg91AuthKey: process.env.MSG91_AUTH_KEY,
    msg91SenderId: process.env.MSG91_SENDER_ID || 'RESTKHN'
  },
  
  // Email Configuration
  email: {
    provider: 'sendgrid',
    sgMail,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@restaurant.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'Restaurant Management'
  },
  
  // WhatsApp Configuration
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN
  },
  
  // SMS Templates
  smsTemplates: {
    orderConfirmation: (orderNumber, total, estimatedTime, restaurantName) => 
      `Your order #${orderNumber} confirmed! Total: ${total} | Est. Time: ${estimatedTime} min - ${restaurantName}`,
    
    orderReady: (orderNumber, restaurantName) => 
      `Your order #${orderNumber} is ready for pickup! - ${restaurantName}`,
    
    orderDispatched: (orderNumber, deliveryBoyName, deliveryBoyPhone) => 
      `Your order #${orderNumber} is out for delivery! Driver: ${deliveryBoyName} (${deliveryBoyPhone})`,
    
    reservationConfirmation: (reservationNumber, date, time, guests, tableName, advancePaid, remainingAmount, restaurantName) => 
      `Table reserved! ${date} at ${time} | Guests: ${guests} | Table: ${tableName}\nAdvance: ${advancePaid} | Balance: ${remainingAmount}\nNote: Advance is non-refundable - ${restaurantName}`,
    
    reservationReminder: (restaurantName, time, tableName) => 
      `Reminder: Your reservation at ${restaurantName} is in 1 hour (${time}, ${tableName}). See you soon! 🎉`,
    
    loyaltyPoints: (points, totalPoints, discount) => 
      `You earned ${points} points! 🎁 Total: ${totalPoints} points (${discount} discount available)`,
    
    lowStock: (itemName, currentStock, minStock, restaurantName) => 
      `⚠️ LOW STOCK ALERT: ${itemName} (${currentStock} left, min: ${minStock}) - ${restaurantName}`,
    
    outOfStock: (itemName, restaurantName) => 
      `🚨 OUT OF STOCK: ${itemName} - Menu item auto-disabled - ${restaurantName}`,
    
    newOrder: (orderNumber, orderType, total, restaurantName) => 
      `NEW ORDER #${orderNumber} 📱 Type: ${orderType} | Amount: ${total} - ${restaurantName}`,
    
    failedPayment: (orderNumber, customerName, amount, reason) => 
      `Payment failed for Order #${orderNumber} | Customer: ${customerName} | Amount: ${amount} | Reason: ${reason}`
  },
  
  // Email Templates (HTML)
  emailTemplates: {
    orderConfirmation: (orderData) => ({
      subject: `Order Confirmation - #${orderData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B35;">Order Confirmed! ✅</h2>
          <p>Hi ${orderData.customerName},</p>
          <p>Your order has been confirmed and is being prepared.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Order Type:</strong> ${orderData.orderType}</p>
            <p><strong>Estimated Time:</strong> ${orderData.estimatedTime} minutes</p>
            
            <h4>Items:</h4>
            <ul>
              ${orderData.items.map(item => `
                <li>${item.name} x${item.quantity} - ${item.price}</li>
              `).join('')}
            </ul>
            
            <hr>
            <p><strong>Subtotal:</strong> ${orderData.subtotal}</p>
            <p><strong>Tax:</strong> ${orderData.tax}</p>
            <p style="font-size: 18px;"><strong>Total:</strong> ${orderData.total}</p>
          </div>
          
          <p>Thank you for choosing ${orderData.restaurantName}! 🙏</p>
          
          <a href="${orderData.trackingUrl}" style="display: inline-block; background: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">Track Order</a>
        </div>
      `
    }),
    
    welcomeEmail: (customerData) => ({
      subject: `Welcome to ${customerData.restaurantName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF6B35;">Welcome! 🎉</h2>
          <p>Hi ${customerData.name},</p>
          <p>Thank you for registering at ${customerData.restaurantName}!</p>
          
          ${customerData.firstOrderCoupon ? `
            <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0;">Special Offer for You! 🎁</h3>
              <p style="font-size: 24px; font-weight: bold; color: #FF6B35; margin: 10px 0;">${customerData.firstOrderCoupon}</p>
              <p>Use this code to get ${customerData.discount} on your first order!</p>
            </div>
          ` : ''}
          
          <p>We look forward to serving you! 🍽️</p>
        </div>
      `
    })
  }
};

module.exports = notificationConfig;