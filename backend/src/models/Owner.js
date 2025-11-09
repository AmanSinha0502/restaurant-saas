const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ownerSchema = new mongoose.Schema({
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
    enum: ['owner'],
    default: 'owner'
  },
  
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  
  ownedDatabases: [{
    type: String // Array of database names like ['owner_owner123']
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastLogin: {
    type: Date
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlatformAdmin'
  }
}, {
  timestamps: true,
  collection: 'restaurantOwners'
});

// Hash password before saving
ownerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
ownerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get platform database connection
const getPlatformConnection = () => {
  return mongoose.connection.useDb('platform_main', { useCache: true });
};

const Owner = getPlatformConnection().model('Owner', ownerSchema);

module.exports = Owner;