const Razorpay = require('razorpay');
const Stripe = require('stripe');

// Razorpay Configuration
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Stripe Configuration
const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY);

// Payment Gateway Helpers
const paymentConfig = {
  razorpay: {
    instance: razorpayInstance,
    keyId: process.env.RAZORPAY_KEY_ID
  },
  
  stripe: {
    instance: stripeInstance,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  },
  
  // Get gateway instance based on restaurant settings
  getGateway: (gatewayType) => {
    switch (gatewayType) {
      case 'razorpay':
        return razorpayInstance;
      case 'stripe':
        return stripeInstance;
      default:
        throw new Error('Invalid payment gateway');
    }
  },
  
  // Currency symbols
  currencySymbols: {
    INR: '₹',
    AED: 'د.إ',
    USD: '$',
    EUR: '€',
    GBP: '£'
  },
  
  // Get currency symbol
  getCurrencySymbol: (currency) => {
    return paymentConfig.currencySymbols[currency] || currency;
  },
  
  // Convert amount to smallest unit (paise, cents, etc.)
  convertToSmallestUnit: (amount, currency) => {
    // INR, USD, EUR use 100 (1 rupee = 100 paise)
    const multipliers = {
      INR: 100,
      AED: 100,
      USD: 100,
      EUR: 100,
      GBP: 100
    };
    
    return Math.round(amount * (multipliers[currency] || 100));
  },
  
  // Convert from smallest unit back to main unit
  convertFromSmallestUnit: (amount, currency) => {
    const multipliers = {
      INR: 100,
      AED: 100,
      USD: 100,
      EUR: 100,
      GBP: 100
    };
    
    return amount / (multipliers[currency] || 100);
  }
};

module.exports = paymentConfig;