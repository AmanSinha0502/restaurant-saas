// ============================================
// WEBHOOK ROUTES (Payment Gateways)
// ============================================
// Save as: backend/src/routes/webhookRoutes.js

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const { getOwnerModels } = require('../models');

/**
 * Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 */
router.post('/razorpay', express.json(), async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = req.body;
    
    // Verify webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(webhookBody))
      .digest('hex');
    
    if (webhookSignature !== expectedSignature) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = webhookBody.event;
    const payload = webhookBody.payload;
    
    logger.info(`Razorpay webhook received: ${event}`);
    
    // Handle different events
    switch (event) {
      case 'payment.captured':
        await handleRazorpayPaymentCaptured(payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handleRazorpayPaymentFailed(payload.payment.entity);
        break;
      
      case 'refund.created':
        await handleRazorpayRefundCreated(payload.refund.entity);
        break;
      
      default:
        logger.info(`Unhandled Razorpay event: ${event}`);
    }
    
    res.status(200).json({ status: 'success' });
    
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const payload = req.body;
    
    const result = paymentService.handleStripeWebhook(payload, sig);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const event = result.event;
    
    logger.info(`Stripe webhook received: ${event.type}`);
    
    // Handle different events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handleStripePaymentFailed(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleStripeRefund(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Handle Razorpay Payment Captured
 */
async function handleRazorpayPaymentCaptured(payment) {
  try {
    // Extract order ID from notes
    const orderId = payment.notes.orderId;
    
    if (!orderId) {
      logger.warn('Order ID not found in Razorpay payment notes');
      return;
    }
    
    // Find order (we need to determine ownerId from order number pattern)
    // This is a simplified approach - in production, store mapping
    const orderNumber = orderId;
    
    // TODO: Implement proper order lookup across all tenant databases
    // For now, log the event
    logger.info(`Razorpay payment captured for order: ${orderNumber}`);
    
    // Update order payment status
    // const models = getOwnerModels(ownerId);
    // const Order = models.Order;
    // const order = await Order.findOne({ orderNumber });
    // if (order) {
    //   await order.markAsPaid({
    //     transactionId: payment.id,
    //     razorpayPaymentId: payment.id,
    //     razorpayOrderId: payment.order_id
    //   });
    // }
    
  } catch (error) {
    logger.error('Handle Razorpay payment captured error:', error);
  }
}

/**
 * Handle Razorpay Payment Failed
 */
async function handleRazorpayPaymentFailed(payment) {
  try {
    const orderId = payment.notes.orderId;
    
    if (!orderId) return;
    
    logger.warn(`Razorpay payment failed for order: ${orderId}`);
    
    // TODO: Update order status, send notification
    
  } catch (error) {
    logger.error('Handle Razorpay payment failed error:', error);
  }
}

/**
 * Handle Razorpay Refund Created
 */
async function handleRazorpayRefundCreated(refund) {
  try {
    logger.info(`Razorpay refund created: ${refund.id} for payment: ${refund.payment_id}`);
    
    // TODO: Update order refund status
    
  } catch (error) {
    logger.error('Handle Razorpay refund error:', error);
  }
}

/**
 * Handle Stripe Payment Succeeded
 */
async function handleStripePaymentSucceeded(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) {
      logger.warn('Order ID not found in Stripe payment intent metadata');
      return;
    }
    
    logger.info(`Stripe payment succeeded for order: ${orderId}`);
    
    // TODO: Update order payment status
    
  } catch (error) {
    logger.error('Handle Stripe payment succeeded error:', error);
  }
}

/**
 * Handle Stripe Payment Failed
 */
async function handleStripePaymentFailed(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.orderId;
    
    if (!orderId) return;
    
    logger.warn(`Stripe payment failed for order: ${orderId}`);
    
    // TODO: Update order status, send notification
    
  } catch (error) {
    logger.error('Handle Stripe payment failed error:', error);
  }
}

/**
 * Handle Stripe Refund
 */
async function handleStripeRefund(charge) {
  try {
    logger.info(`Stripe refund processed: ${charge.id}`);
    
    // TODO: Update order refund status
    
  } catch (error) {
    logger.error('Handle Stripe refund error:', error);
  }
}

module.exports = router;