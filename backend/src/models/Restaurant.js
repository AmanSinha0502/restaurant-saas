const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { 
      type: String, 
      required: true,
      enum: ['India', 'UAE', 'USA', 'UK']
    }
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  
  currency: {
    type: String,
    required: true,
    enum: ['INR', 'AED', 'USD', 'EUR', 'GBP'],
    default: 'INR'
  },
  
  currencySymbol: {
    type: String,
    required: true,
    default: '₹'
  },
  
  defaultLanguage: {
    type: String,
    enum: ['en', 'hi', 'ar'],
    default: 'en'
  },
  
  taxSettings: {
    taxType: {
      type: String,
      enum: ['GST', 'VAT', 'Sales Tax'],
      default: 'GST'
    },
    taxNumber: { type: String }, // GSTIN or TRN
    taxRate: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
      max: 100
    },
    applyOnFood: {
      type: Boolean,
      default: true
    },
    applyOnReservations: {
      type: Boolean,
      default: true
    },
    applyOnDelivery: {
      type: Boolean,
      default: false
    }
  },
  
  reservationSettings: {
    advancePaymentType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    advanceAmount: {
      type: Number,
      required: true,
      default: 20,
      min: 0
    },
    minimumAdvance: {
      type: Number,
      default: 100,
      min: 0
    },
    cancellationPolicy: {
      type: String,
      default: 'non-refundable'
    },
    defaultDiningDuration: {
      type: Number, // in minutes
      default: 90
    }
  },
  
  branding: {
    logo: { type: String },
    primaryColor: { type: String, default: '#FF6B35' },
    secondaryColor: { type: String, default: '#004E89' }
  },
  
  paymentGateways: {
    razorpay: {
      enabled: { type: Boolean, default: false },
      keyId: { type: String },
      keySecret: { type: String, select: false }
    },
    stripe: {
      enabled: { type: Boolean, default: false },
      publishableKey: { type: String },
      secretKey: { type: String, select: false }
    },
    paypal: {
      enabled: { type: Boolean, default: false },
      clientId: { type: String },
      secret: { type: String, select: false }
    },
    cod: {
      enabled: { type: Boolean, default: true }
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  operatingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String }, // "09:00"
    closeTime: { type: String } // "22:00"
  }]
}, {
  timestamps: true
});

// Indexes
restaurantSchema.index({ ownerId: 1, status: 1 });
restaurantSchema.index({ slug: 1 }, { unique: true });

// Generate slug from name
restaurantSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Method to get Restaurant model with owner database connection
const getRestaurantModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Restaurant', restaurantSchema);
};

module.exports = { restaurantSchema, getRestaurantModel };