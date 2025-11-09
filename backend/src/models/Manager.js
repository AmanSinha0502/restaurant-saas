const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const managerSchema = new mongoose.Schema({
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  
  assignedRestaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
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
    enum: ['manager'],
    default: 'manager'
  },
  
  permissions: {
    canEditMenu: { type: Boolean, default: true },
    canManageInventory: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageStaff: { type: Boolean, default: true },
    canEditSettings: { type: Boolean, default: false },
    canManageReservations: { type: Boolean, default: true },
    canProcessRefunds: { type: Boolean, default: false }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  },
  
  createdBy: {
    type: String // ownerId
  }
}, {
  timestamps: true
});

// Hash password before saving
managerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
managerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Indexes
managerSchema.index({ ownerId: 1, email: 1 });
managerSchema.index({ assignedRestaurants: 1 });

// Method to get Manager model with owner database connection
const getManagerModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Manager', managerSchema);
};

module.exports = { managerSchema, getManagerModel };