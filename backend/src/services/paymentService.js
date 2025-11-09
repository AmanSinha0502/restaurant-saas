// src/services/paymentService.js
const paymentConfig = require('../config/payment');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Unified Payment Service
 * Works in mock mode when no live gateway keys are found.
 */
const PaymentService = {
  /**
   * Detect available gateways from environment variables.
   */
  getAvailableGateways() {
    const available = [];
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) available.push('razorpay');
    if (process.env.STRIPE_SECRET_KEY) available.push('stripe');
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET) available.push('paypal');
    return available;
  },

  /**
   * Verify a payment using the selected gateway.
   * @param {string} gateway - 'razorpay' | 'stripe' | 'paypal' | 'cash' | 'card'
   * @param {object} payload - payment verification fields
   */
  async verifyPayment(gateway, payload = {}) {
    const available = this.getAvailableGateways();

    // ---------- MOCK MODE ----------
    if (available.length === 0) {
      logger.warn('⚠️  PaymentService running in MOCK mode (no live keys configured).');
      return {
        verified: true,
        details: { mode: 'mock', note: 'Auto-verified in development mode' }
      };
    }

    // ---------- RAZORPAY ----------
    if (gateway === 'razorpay' && available.includes('razorpay')) {
      try {
        const { orderId, paymentId, signature } = payload;
        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');
        const verified = generatedSignature === signature;
        return { verified, details: { gateway, orderId, paymentId } };
      } catch (err) {
        logger.error('Razorpay verification failed:', err);
        return { verified: false, details: { error: err.message } };
      }
    }

    // ---------- STRIPE ----------
    if (gateway === 'stripe' && available.includes('stripe')) {
      try {
        const stripe = paymentConfig.stripe.instance;
        const paymentIntent = await stripe.paymentIntents.retrieve(payload.paymentIntentId);
        const verified = paymentIntent.status === 'succeeded';
        return { verified, details: paymentIntent };
      } catch (err) {
        logger.error('Stripe verification failed:', err);
        return { verified: false, details: { error: err.message } };
      }
    }

    // ---------- PAYPAL (placeholder) ----------
    if (gateway === 'paypal' && available.includes('paypal')) {
      logger.info('PayPal verification placeholder executed');
      return { verified: true, details: { mode: 'paypal-simulated' } };
    }

    // ---------- CASH / CARD (Offline) ----------
    if (['cash', 'card', 'upi'].includes(gateway)) {
      return { verified: true, details: { mode: 'offline', note: 'Offline payment assumed verified' } };
    }

    // ---------- Default fallback ----------
    return {
      verified: true,
      details: { mode: 'fallback', note: 'No verification available, auto-verified' }
    };
  }
};

module.exports = PaymentService;
