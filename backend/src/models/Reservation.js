const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  reservationNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  customer: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    }
  },
  
  reservationDate: {
    type: String, // "YYYY-MM-DD" format
    required: true,
    index: true
  },
  
  timeSlot: {
    type: String, // "HH:MM" format (e.g., "19:30")
    required: true
  },
  
  numberOfGuests: {
    type: Number,
    required: [true, 'Number of guests is required'],
    min: [1, 'At least 1 guest is required'],
    max: [50, 'Maximum 50 guests allowed']
  },
  
  table: {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null
    },
    tableNumber: String,
    assignedAt: Date,
    assignmentMethod: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto'
    }
  },
  
  pricing: {
    baseAmount: {
      type: Number,
      required: true,
      min: 0
    },
    advanceAmount: {
      type: Number,
      required: true,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  
  payment: {
    advancePayment: {
      method: {
        type: String,
        enum: ['razorpay', 'stripe', 'paypal', 'cash', 'card'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
      },
      transactionId: String,
      paidAt: Date
    },
    remainingPayment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'upi', 'razorpay', 'stripe']
      },
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
      },
      transactionId: String,
      paidAt: Date
    }
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'checked-in', 'completed', 'no-show', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: String,
    note: String
  }],
  
  qrCode: String, // URL to QR code image for check-in
  
  specialRequests: String,
  
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  reminderSentAt: Date,
  
  cancellationPolicy: {
    type: String,
    default: 'non-refundable'
  },
  
  cancelledAt: Date,
  cancellationReason: String,
  
  checkedInAt: Date,
  completedAt: Date,
  
  // Source of reservation
  reservationSource: {
    type: String,
    enum: ['website', 'pos', 'phone', 'walk-in'],
    default: 'website'
  },
  
  createdBy: {
    type: String // customerId, employeeId, or "system"
  }
}, {
  timestamps: true
});

// Indexes
reservationSchema.index({ restaurantId: 1, reservationDate: 1, status: 1 });
reservationSchema.index({ 'customer.userId': 1, createdAt: -1 });
reservationSchema.index({ reservationNumber: 1 }, { unique: true });
reservationSchema.index({ 'table.tableId': 1, reservationDate: 1 });

// Pre-save: Generate reservation number
reservationSchema.pre('save', async function(next) {
  if (this.isNew && !this.reservationNumber) {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.reservationNumber = `RES-${timestamp}${random}`;
  }
  next();
});

// Method to update status with history
reservationSchema.methods.updateStatus = function(newStatus, updatedBy, note = null) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    note
  });
  
  // Update timestamps based on status
  if (newStatus === 'checked-in') {
    this.checkedInAt = new Date();
  } else if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
  
  return this.save();
};

// Method to auto-assign table
reservationSchema.methods.autoAssignTable = async function() {
  const Table = mongoose.model('Table');
  
  // Find suitable tables
  const suitableTables = await Table.findSuitableTables(
    this.restaurantId,
    this.numberOfGuests,
    this.reservationDate,
    this.timeSlot
  );
  
  if (suitableTables.length === 0) {
    throw new Error('No tables available for the selected time slot');
  }
  
  // Assign the first suitable table (smallest that fits)
  const assignedTable = suitableTables[0];
  
  this.table = {
    tableId: assignedTable._id,
    tableNumber: assignedTable.tableNumber,
    assignedAt: new Date(),
    assignmentMethod: 'auto'
  };
  
  // Update table status
  await assignedTable.reserve(this._id);
  
  return this.save();
};

// Method to manually assign table
reservationSchema.methods.manualAssignTable = async function(tableId) {
  const Table = mongoose.model('Table');
  const table = await Table.findById(tableId);
  
  if (!table) {
    throw new Error('Table not found');
  }
  
  // Check if table is available
  const isAvailable = await table.isAvailableAt(this.reservationDate, this.timeSlot);
  
  if (!isAvailable) {
    throw new Error('Table is not available for the selected time slot');
  }
  
  this.table = {
    tableId: table._id,
    tableNumber: table.tableNumber,
    assignedAt: new Date(),
    assignmentMethod: 'manual'
  };
  
  await table.reserve(this._id);
  
  return this.save();
};

// Method to generate QR code (placeholder - actual implementation will use QR library)
reservationSchema.methods.generateQRCode = function() {
  // In actual implementation, use 'qrcode' npm package
  const qrData = {
    reservationNumber: this.reservationNumber,
    customerName: this.customer.name,
    date: this.reservationDate,
    time: this.timeSlot,
    guests: this.numberOfGuests
  };
  
  // Store QR code URL (will be generated and uploaded to S3/Cloudinary)
  this.qrCode = `https://cdn.example.com/qr/${this.reservationNumber}.png`;
  return this.save();
};

// Virtual: Check if reservation is upcoming
reservationSchema.virtual('isUpcoming').get(function() {
  const reservationDateTime = new Date(`${this.reservationDate} ${this.timeSlot}`);
  return reservationDateTime > new Date() && this.status === 'confirmed';
});

// Virtual: Check if reservation is past
reservationSchema.virtual('isPast').get(function() {
  const reservationDateTime = new Date(`${this.reservationDate} ${this.timeSlot}`);
  return reservationDateTime < new Date();
});

// Method to get Reservation model with owner database connection
const getReservationModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Reservation', reservationSchema);
};

module.exports = { reservationSchema, getReservationModel };