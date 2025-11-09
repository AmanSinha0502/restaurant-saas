const Joi = require('joi');

// ============================================
// TABLE VALIDATORS
// ============================================

const createTableSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  tableNumber: Joi.string().required(),
  capacity: Joi.number().min(1).max(50).required(),
  tableType: Joi.string().valid('indoor', 'outdoor', 'window-side', 'bar', 'vip', 'private-room').default('indoor'),
  pricing: Joi.object({
    type: Joi.string().valid('per_person', 'fixed').default('per_person'),
    amount: Joi.number().min(0).required()
  }),
  floor: Joi.string().valid('ground', 'first', 'second', 'rooftop').default('ground'),
  shape: Joi.string().valid('square', 'rectangle', 'circle', 'oval').default('square'),
  amenities: Joi.array().items(Joi.string().valid('power-outlet', 'high-chair', 'wheelchair-accessible', 'near-window')),
  position: Joi.object({
    x: Joi.number(),
    y: Joi.number()
  }),
  notes: Joi.string().allow('')
});

const updateTableSchema = Joi.object({
  tableNumber: Joi.string(),
  capacity: Joi.number().min(1).max(50),
  tableType: Joi.string().valid('indoor', 'outdoor', 'window-side', 'bar', 'vip', 'private-room'),
  pricing: Joi.object({
    type: Joi.string().valid('per_person', 'fixed'),
    amount: Joi.number().min(0)
  }),
  floor: Joi.string().valid('ground', 'first', 'second', 'rooftop'),
  shape: Joi.string().valid('square', 'rectangle', 'circle', 'oval'),
  amenities: Joi.array().items(Joi.string()),
  position: Joi.object({
    x: Joi.number(),
    y: Joi.number()
  }),
  notes: Joi.string().allow(''),
  isActive: Joi.boolean()
}).min(1);

const updateTableStatusSchema = Joi.object({
  status: Joi.string().valid('available', 'occupied', 'reserved', 'maintenance').required(),
  orderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  reservationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
});

const bulkCreateTablesSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  tables: Joi.array().min(1).items(
    Joi.object({
      tableNumber: Joi.string().required(),
      capacity: Joi.number().min(1).max(50).required(),
      tableType: Joi.string().valid('indoor', 'outdoor', 'window-side', 'bar', 'vip', 'private-room'),
      pricing: Joi.object({
        type: Joi.string().valid('per_person', 'fixed'),
        amount: Joi.number().min(0)
      }),
      floor: Joi.string().valid('ground', 'first', 'second', 'rooftop')
    })
  ).required()
});

// ============================================
// RESERVATION VALIDATORS
// ============================================

const createReservationSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  customer: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    name: Joi.string().required(),
    phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).required(),
    email: Joi.string().email()
  }).required(),
  reservationDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  timeSlot: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  numberOfGuests: Joi.number().min(1).max(50).required(),
  tableId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  specialRequests: Joi.string().allow('')
});

const confirmReservationSchema = Joi.object({
  paymentMethod: Joi.string().valid('razorpay', 'stripe', 'paypal', 'cash', 'card').required(),
  transactionId: Joi.string().required()
});

const updateReservationStatusSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'checked-in', 'completed', 'no-show', 'cancelled').required(),
  note: Joi.string().allow('')
});

const cancelReservationSchema = Joi.object({
  reason: Joi.string().required()
});

module.exports = {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  bulkCreateTablesSchema,
  createReservationSchema,
  confirmReservationSchema,
  updateReservationStatusSchema,
  cancelReservationSchema
};