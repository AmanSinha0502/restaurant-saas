const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    trim: true
  },
  
  capacity: {
    type: Number,
    required: [true, 'Seating capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [50, 'Capacity cannot exceed 50']
  },
  
  tableType: {
    type: String,
    enum: ['indoor', 'outdoor', 'window-side', 'bar', 'vip', 'private-room'],
    default: 'indoor'
  },
  
  pricing: {
    type: {
      type: String,
      enum: ['per_person', 'fixed'],
      default: 'per_person'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available',
    index: true
  },
  
  currentReservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null
  },
  
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // For visual floor plan (future feature)
  position: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    }
  },
  
  floor: {
    type: String,
    enum: ['ground', 'first', 'second', 'rooftop'],
    default: 'ground'
  },
  
  shape: {
    type: String,
    enum: ['square', 'rectangle', 'circle', 'oval'],
    default: 'square'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  amenities: [{
    type: String,
    enum: ['power-outlet', 'high-chair', 'wheelchair-accessible', 'near-window']
  }],
  
  notes: String,
  
  createdBy: {
    type: String // ownerId or managerId
  }
}, {
  timestamps: true
});

// Indexes
tableSchema.index({ restaurantId: 1, tableNumber: 1 }, { unique: true });
tableSchema.index({ restaurantId: 1, status: 1 });
tableSchema.index({ capacity: 1 });

// Method to check if table is available for a time slot
tableSchema.methods.isAvailableAt = async function(date, timeSlot, diningDuration = 90) {
  if (this.status === 'maintenance' || !this.isActive) {
    return false;
  }
  
  // Check for overlapping reservations
  const Reservation = mongoose.model('Reservation');
  
  const requestedStart = new Date(`${date} ${timeSlot}`);
  const requestedEnd = new Date(requestedStart.getTime() + diningDuration * 60 * 1000);
  
  const overlappingReservations = await Reservation.find({
    'table.tableId': this._id,
    reservationDate: date,
    status: { $in: ['confirmed', 'checked-in'] }
  });
  
  for (let reservation of overlappingReservations) {
    const reservedStart = new Date(`${reservation.reservationDate} ${reservation.timeSlot}`);
    const reservedEnd = new Date(reservedStart.getTime() + diningDuration * 60 * 1000);
    
    // Check for overlap
    if (requestedStart < reservedEnd && requestedEnd > reservedStart) {
      return false;
    }
  }
  
  return true;
};

// Method to mark table as occupied
tableSchema.methods.occupy = function(orderId) {
  this.status = 'occupied';
  this.currentOrder = orderId;
  return this.save();
};

// Method to mark table as reserved
tableSchema.methods.reserve = function(reservationId) {
  this.status = 'reserved';
  this.currentReservation = reservationId;
  return this.save();
};

// Method to mark table as available
tableSchema.methods.makeAvailable = function() {
  this.status = 'available';
  this.currentReservation = null;
  this.currentOrder = null;
  return this.save();
};

// Static method to find suitable tables
tableSchema.statics.findSuitableTables = async function(restaurantId, numberOfGuests, date, timeSlot) {
  // Find tables with capacity >= numberOfGuests
  const tables = await this.find({
    restaurantId,
    capacity: { $gte: numberOfGuests, $lte: numberOfGuests + 2 }, // +2 buffer
    isActive: true,
    status: { $ne: 'maintenance' }
  }).sort({ capacity: 1 }); // Prefer smaller tables
  
  // Check availability for each table
  const availableTables = [];
  for (let table of tables) {
    const isAvailable = await table.isAvailableAt(date, timeSlot);
    if (isAvailable) {
      availableTables.push(table);
    }
  }
  
  return availableTables;
};

// Method to get Table model with owner database connection
const getTableModel = (ownerId) => {
  const dbName = `owner_${ownerId}`;
  const connection = mongoose.connection.useDb(dbName, { useCache: true });
  return connection.model('Table', tableSchema);
};

module.exports = { tableSchema, getTableModel };