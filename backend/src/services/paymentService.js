// // src/services/paymentService.js
// const paymentConfig = require('../config/payment');
// const logger = require('../utils/logger');
// const crypto = require('crypto');

// /**
//  * Unified Payment Service
//  * Works in mock mode when no live gateway keys are found.
//  */
// const PaymentService = {
//   /**
//    * Detect available gateways from environment variables.
//    */
//   getAvailableGateways() {
//     const available = [];
//     if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) available.push('razorpay');
//     if (process.env.STRIPE_SECRET_KEY) available.push('stripe');
//     if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET) available.push('paypal');
//     return available;
//   },

//   /**
//    * Verify a payment using the selected gateway.
//    * @param {string} gateway - 'razorpay' | 'stripe' | 'paypal' | 'cash' | 'card'
//    * @param {object} payload - payment verification fields
//    */
//   async verifyPayment(gateway, payload = {}) {
//     const available = this.getAvailableGateways();

//     // ---------- MOCK MODE ----------
//     if (available.length === 0) {
//       logger.warn('⚠️  PaymentService running in MOCK mode (no live keys configured).');
//       return {
//         verified: true,
//         details: { mode: 'mock', note: 'Auto-verified in development mode' }
//       };
//     }

//     // ---------- RAZORPAY ----------
//     if (gateway === 'razorpay' && available.includes('razorpay')) {
//       try {
//         const { orderId, paymentId, signature } = payload;
//         const generatedSignature = crypto
//           .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//           .update(`${orderId}|${paymentId}`)
//           .digest('hex');
//         const verified = generatedSignature === signature;
//         return { verified, details: { gateway, orderId, paymentId } };
//       } catch (err) {
//         logger.error('Razorpay verification failed:', err);
//         return { verified: false, details: { error: err.message } };
//       }
//     }

//     // ---------- STRIPE ----------
//     if (gateway === 'stripe' && available.includes('stripe')) {
//       try {
//         const stripe = paymentConfig.stripe.instance;
//         const paymentIntent = await stripe.paymentIntents.retrieve(payload.paymentIntentId);
//         const verified = paymentIntent.status === 'succeeded';
//         return { verified, details: paymentIntent };
//       } catch (err) {
//         logger.error('Stripe verification failed:', err);
//         return { verified: false, details: { error: err.message } };
//       }
//     }

//     // ---------- PAYPAL (placeholder) ----------
//     if (gateway === 'paypal' && available.includes('paypal')) {
//       logger.info('PayPal verification placeholder executed');
//       return { verified: true, details: { mode: 'paypal-simulated' } };
//     }

//     // ---------- CASH / CARD (Offline) ----------
//     if (['cash', 'card', 'upi'].includes(gateway)) {
//       return { verified: true, details: { mode: 'offline', note: 'Offline payment assumed verified' } };
//     }

//     // ---------- Default fallback ----------
//     return {
//       verified: true,
//       details: { mode: 'fallback', note: 'No verification available, auto-verified' }
//     };
//   }
// };

// module.exports = PaymentService;




// ============================================
// PAYMENT SERVICE
// ============================================
// Save as: backend/src/services/paymentService.js

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Stripe = require('stripe');
const logger = require('../utils/logger');

// ============================================
// INITIALIZE PAYMENT GATEWAYS
// ============================================

// Razorpay Instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Stripe Instance
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================
// RAZORPAY FUNCTIONS
// ============================================

/**
 * Create Razorpay Order
 */
const createRazorpayOrder = async (amount, currency, orderId, customerDetails) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      receipt: orderId,
      notes: {
        orderId,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone
      }
    };
    
    const razorpayOrder = await razorpayInstance.orders.create(options);
    
    logger.info(`Razorpay order created: ${razorpayOrder.id} for order: ${orderId}`);
    
    return {
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt
    };
  } catch (error) {
    logger.error('Create Razorpay order error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify Razorpay Payment Signature
 */
const verifyRazorpaySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    
    if (generatedSignature === razorpaySignature) {
      logger.info(`Razorpay signature verified for payment: ${razorpayPaymentId}`);
      return { success: true };
    } else {
      logger.warn(`Razorpay signature verification failed for payment: ${razorpayPaymentId}`);
      return {
        success: false,
        error: 'Invalid payment signature'
      };
    }
  } catch (error) {
    logger.error('Verify Razorpay signature error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get Razorpay Payment Details
 */
const getRazorpayPaymentDetails = async (paymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    
    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount / 100, // Convert from paise
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: new Date(payment.created_at * 1000)
      }
    };
  } catch (error) {
    logger.error('Get Razorpay payment details error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initiate Razorpay Refund
 */
const initiateRazorpayRefund = async (paymentId, amount, reason) => {
  try {
    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // Convert to paise
      notes: {
        reason
      }
    });
    
    logger.info(`Razorpay refund initiated: ${refund.id} for payment: ${paymentId}`);
    
    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    logger.error('Initiate Razorpay refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// STRIPE FUNCTIONS
// ============================================

/**
 * Create Stripe Payment Intent
 */
const createStripePaymentIntent = async (amount, currency, orderId, customerDetails) => {
  try {
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        orderId,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerEmail: customerDetails.email
      },
      description: `Order ${orderId}`,
      receipt_email: customerDetails.email
    });
    
    logger.info(`Stripe payment intent created: ${paymentIntent.id} for order: ${orderId}`);
    
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    };
  } catch (error) {
    logger.error('Create Stripe payment intent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify Stripe Payment
 */
const verifyStripePayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      logger.info(`Stripe payment verified: ${paymentIntentId}`);
      return {
        success: true,
        payment: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          paymentMethod: paymentIntent.payment_method
        }
      };
    } else {
      logger.warn(`Stripe payment not succeeded: ${paymentIntentId} (${paymentIntent.status})`);
      return {
        success: false,
        error: `Payment status: ${paymentIntent.status}`
      };
    }
  } catch (error) {
    logger.error('Verify Stripe payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initiate Stripe Refund
 */
const initiateStripeRefund = async (paymentIntentId, amount, reason) => {
  try {
    const refund = await stripeInstance.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        customReason: reason
      }
    });
    
    logger.info(`Stripe refund initiated: ${refund.id} for payment: ${paymentIntentId}`);
    
    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    logger.error('Initiate Stripe refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Handle Stripe Webhook
 */
const handleStripeWebhook = (payload, signature) => {
  try {
    const event = stripeInstance.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    logger.info(`Stripe webhook received: ${event.type}`);
    
    return {
      success: true,
      event
    };
  } catch (error) {
    logger.error('Handle Stripe webhook error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================
// UNIFIED PAYMENT INTERFACE
// ============================================

/**
 * Create Payment Order (Gateway-agnostic)
 */
const createPaymentOrder = async (gateway, amount, currency, orderId, customerDetails) => {
  switch (gateway) {
    case 'razorpay':
      return await createRazorpayOrder(amount, currency, orderId, customerDetails);
    
    case 'stripe':
      return await createStripePaymentIntent(amount, currency, orderId, customerDetails);
    
    default:
      return {
        success: false,
        error: 'Unsupported payment gateway'
      };
  }
};

/**
 * Verify Payment (Gateway-agnostic)
 */
const verifyPayment = async (gateway, paymentData) => {
  switch (gateway) {
    case 'razorpay':
      return verifyRazorpaySignature(
        paymentData.razorpay_order_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature
      );
    
    case 'stripe':
      return await verifyStripePayment(paymentData.paymentIntentId);
    
    default:
      return {
        success: false,
        error: 'Unsupported payment gateway'
      };
  }
};

/**
 * Initiate Refund (Gateway-agnostic)
 */
const initiateRefund = async (gateway, paymentId, amount, reason) => {
  switch (gateway) {
    case 'razorpay':
      return await initiateRazorpayRefund(paymentId, amount, reason);
    
    case 'stripe':
      return await initiateStripeRefund(paymentId, amount, reason);
    
    default:
      return {
        success: false,
        error: 'Unsupported payment gateway'
      };
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Razorpay
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayPaymentDetails,
  initiateRazorpayRefund,
  
  // Stripe
  createStripePaymentIntent,
  verifyStripePayment,
  initiateStripeRefund,
  handleStripeWebhook,
  
  // Unified Interface
  createPaymentOrder,
  verifyPayment,
  initiateRefund
};