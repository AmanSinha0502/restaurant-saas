const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  
  role: {
    type: String,
    enum: ['employee'],
    default: 'employee'
  },
  
  employeeType: {
    type: String,
    enum: ['cashier', 'kitchen_staff', 'delivery_boy', 'waiter'],
    required: true
  },
  
  permissions: {
    canAccessPOS: { type: Boolean, default: false },
    canAccessKDS: { type: Boolean, default: false },
    canViewOrders: { type: Boolean, default: true },
    canEditOrders: { type: Boolean, default: false },
    canManageDeliveries: { type: Boolean, default: false }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId // managerId or ownerId
  }
}, {
  timestamps: true
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
employeeSchema.index({ restaurantId: 1, employeeType: 1 });
employeeSchema.index({ email: 1, restaurantId: 1 }, { unique: true });

// Set permissions based on employee type
employeeSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.employeeType) {
      case 'cashier':
        this.permissions = {
          canAccessPOS: true,
          canAccessKDS: false,
          canViewOrders: true,
          canEditOrders: false,
          canManageDeliveries: false
        };
        break;
      case 'kitchen_staff':
        this.permissions = {
          canAccessPOS: false,
          canAccessKDS: true,
          canViewOrders: true,
          canEditOrders: false,
          canManageDeliveries: false
        };
        break;
      case 'delivery_boy':
        this.permissions = {
          canAccessPOS: false,
          canAccessKDS: false,
          canViewOrders: true,
          canEditOrders: false,
          canManageDeliveries: true
        };
        break;
      case 'waiter':
        this.permissions = {
          canAccessPOS: true,
          canAccessKDS: false,
          canViewOrders: true,
          canEditOrders: false,
          canManageDeliveries: false
        };
        break;
    }
  }
  next();
});

// Method to get Employee model with owner database connection
const getEmployeeModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Employee', employeeSchema);
};

module.exports = { employeeSchema, getEmployeeModel };