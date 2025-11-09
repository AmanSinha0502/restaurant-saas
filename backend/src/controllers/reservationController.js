const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const PaymentService = require('../services/paymentService');

/**
 * Create Reservation (Customer or Staff)
 * POST /api/reservations
 */
const createReservation = async (req, res) => {
  try {
    const {
      restaurantId,
      customer,
      reservationDate,
      timeSlot,
      numberOfGuests,
      specialRequests,
      tableId // Optional manual assignment
    } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    const Restaurant = models.Restaurant;
    const Table = models.Table;
    
    // Get restaurant details
    const restaurant = await Restaurant.findById(restaurantId);
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Calculate pricing
    let baseAmount = 0;
    let selectedTable = null;
    
    if (tableId) {
      // Manual table selection
      selectedTable = await Table.findById(tableId);
      if (!selectedTable) {
        return ResponseHelper.error(res, 400, 'Selected table not found');
      }
      
      // Check if table is available
      const isAvailable = await selectedTable.isAvailableAt(reservationDate, timeSlot);
      if (!isAvailable) {
        return ResponseHelper.error(res, 400, 'Selected table is not available for this time slot');
      }
      
      // Calculate price
      if (selectedTable.pricing.type === 'per_person') {
        baseAmount = selectedTable.pricing.amount * numberOfGuests;
      } else {
        baseAmount = selectedTable.pricing.amount;
      }
    } else {
      // Auto table assignment - find suitable tables
      const suitableTables = await Table.findSuitableTables(
        restaurantId,
        numberOfGuests,
        reservationDate,
        timeSlot
      );
      
      if (suitableTables.length === 0) {
        return ResponseHelper.error(res, 400, 'No tables available for the selected time slot');
      }
      
      selectedTable = suitableTables[0]; // Use first suitable table
      
      // Calculate price
      if (selectedTable.pricing.type === 'per_person') {
        baseAmount = selectedTable.pricing.amount * numberOfGuests;
      } else {
        baseAmount = selectedTable.pricing.amount;
      }
    }
    
    // Calculate advance and remaining amounts
    const { advancePaymentType, advanceAmount, minimumAdvance } = restaurant.reservationSettings;
    
    let advance = 0;
    if (advancePaymentType === 'percentage') {
      advance = Math.max((baseAmount * advanceAmount) / 100, minimumAdvance);
    } else {
      advance = Math.max(advanceAmount, minimumAdvance);
    }
    
    const remaining = baseAmount - advance;
    
    // Create reservation
    const reservation = await Reservation.create({
      restaurantId,
      customer: {
        userId: customer.userId || req.user?.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      },
      reservationDate,
      timeSlot,
      numberOfGuests,
      pricing: {
        baseAmount,
        advanceAmount: advance,
        remainingAmount: remaining,
        currency: restaurant.currency
      },
      specialRequests,
      status: 'pending', // Will become 'confirmed' after payment
      reservationSource: req.user?.role === 'customer' ? 'website' : 'pos',
      createdBy: req.user?.id || 'guest'
    });
    
    logger.info(`Reservation created: ${reservation._id} for restaurant: ${restaurantId}`);
    
    return ResponseHelper.created(res, 'Reservation created successfully. Please complete payment.', {
      reservation: {
        id: reservation._id,
        reservationNumber: reservation.reservationNumber,
        customer: reservation.customer,
        reservationDate: reservation.reservationDate,
        timeSlot: reservation.timeSlot,
        numberOfGuests: reservation.numberOfGuests,
        pricing: reservation.pricing,
        suggestedTable: {
          id: selectedTable._id,
          tableNumber: selectedTable.tableNumber,
          capacity: selectedTable.capacity
        },
        paymentRequired: advance,
        status: reservation.status
      }
    });
  } catch (error) {
    logger.error('Create reservation error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create reservation');
  }
};

/**
 * Confirm Reservation (After Payment)
 * POST /api/reservations/:id/confirm
 */
// const confirmReservation = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { paymentMethod, transactionId } = req.body;
    
//     const models = getOwnerModels(req.ownerId);
//     const Reservation = models.Reservation;
    
//     const reservation = await Reservation.findById(id);
    
//     if (!reservation) {
//       return ResponseHelper.notFound(res, 'Reservation not found');
//     }
    
//     if (reservation.status !== 'pending') {
//       return ResponseHelper.error(res, 400, 'Reservation is not pending');
//     }
    
//     // Update payment info
//     reservation.payment.advancePayment = {
//       method: paymentMethod,
//       status: 'paid',
//       transactionId,
//       paidAt: new Date()
//     };
    
//     // Auto-assign table
//     await reservation.autoAssignTable();
    
//     // Update status
//     reservation.status = 'confirmed';
//     reservation.statusHistory.push({
//       status: 'confirmed',
//       timestamp: new Date(),
//       updatedBy: req.user?.id || 'system'
//     });
    
//     await reservation.save();
    
//     // Update table status
//     const Table = models.Table;
//     const table = await Table.findById(reservation.table.tableId);
//     if (table) {
//       await table.reserve(reservation._id);
//     }
    
//     // Generate QR code (placeholder)
//     await reservation.generateQRCode();
    
//     logger.info(`Reservation confirmed: ${reservation._id}`);
    
//     // Emit socket event
//     const io = req.app.get('io');
//     io.to(`restaurant:${reservation.restaurantId}`).emit('reservation:confirmed', {
//       reservationId: reservation._id,
//       tableNumber: reservation.table.tableNumber
//     });
    
//     // TODO: Send confirmation SMS/Email/WhatsApp
    
//     return ResponseHelper.success(res, 200, 'Reservation confirmed successfully', {
//       reservation
//     });
//   } catch (error) {
//     logger.error('Confirm reservation error:', error);
//     return ResponseHelper.error(res, 500, 'Failed to confirm reservation');
//   }
// };



/**
 * Confirm Reservation (After Payment)
 * POST /api/reservations/:id/confirm
 */


const confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentMethod,       // 'razorpay' | 'stripe' | 'paypal' | 'cash' | 'card'
      transactionId,       // gateway transaction id
      orderId,             // (for Razorpay)
      signature,           // (for Razorpay)
      paymentIntentId      // (for Stripe)
    } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    const Table = models.Table;
    const Transaction = models.Transaction;

    const reservation = await Reservation.findById(id);
    if (!reservation) return ResponseHelper.notFound(res, 'Reservation not found');
    if (reservation.status !== 'pending')
      return ResponseHelper.error(res, 400, 'Reservation is not pending or already confirmed');

    // ---------- Verify payment ----------
    const verifyResult = await PaymentService.verifyPayment(paymentMethod, {
      transactionId,
      orderId,
      signature,
      paymentIntentId
    });

    if (!verifyResult.verified) {
      logger.error('Payment verification failed for reservation:', id);
      return ResponseHelper.error(res, 400, 'Payment verification failed. Please retry or contact support.');
    }

    // ---------- Update payment info ----------
    reservation.payment.advancePayment = {
      method: paymentMethod,
      status: 'paid',
      transactionId,
      paidAt: new Date(),
      verificationMode: verifyResult.details?.mode || 'mock'
    };

    // ---------- Auto-assign table ----------
    await reservation.autoAssignTable();

    // ---------- Update reservation status ----------
    reservation.status = 'confirmed';
    reservation.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      updatedBy: req.user?.id || 'system'
    });
    await reservation.save();

    // ---------- Update table status ----------
    const table = await Table.findById(reservation.table.tableId);
    if (table) await table.reserve(reservation._id);

    // ---------- Create Transaction Record ----------
    await Transaction.create({
      restaurantId: reservation.restaurantId,
      transactionType: 'reservation',
      referenceId: reservation._id,
      customer: {
        userId: reservation.customer.userId,
        name: reservation.customer.name,
        email: reservation.customer.email,
        phone: reservation.customer.phone
      },
      amount: reservation.pricing.advanceAmount,
      currency: reservation.pricing.currency,
      paymentMethod,
      paymentGateway: verifyResult.details?.gateway || paymentMethod,
      gatewayResponse: {
        transactionId,
        orderId,
        signature,
        status: 'success',
        rawResponse: verifyResult.details || {}
      },
      status: 'success',
      fees: {
        gatewayFeePercentage: 2,
        gatewayFee: (reservation.pricing.advanceAmount * 2) / 100,
        netAmount: reservation.pricing.advanceAmount * 0.98
      },
      metadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType: req.headers['x-device-type'] || 'web'
      }
    });

    // ---------- Generate QR Code ----------
    await reservation.generateQRCode();

    // ---------- Emit socket event ----------
    const io = req.app.get('io');
    io.to(`restaurant:${reservation.restaurantId}`).emit('reservation:confirmed', {
      reservationId: reservation._id,
      tableNumber: reservation.table.tableNumber
    });

    logger.info(`✅ Reservation confirmed & payment recorded: ${reservation._id}`);

    // ---------- Send response ----------
    return ResponseHelper.success(res, 200, 'Reservation confirmed successfully', {
      reservation,
      paymentVerified: true
    });
  } catch (error) {
    logger.error('Confirm reservation error:', error);
    return ResponseHelper.error(res, 500, 'Failed to confirm reservation');
  }
};





/**
 * Get All Reservations
 * GET /api/reservations
 */
const getAllReservations = async (req, res) => {
  try {
    const {
      restaurantId,
      status,
      date,
      startDate,
      endDate,
      search
    } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    
    // Build query
    const query = {};
    
    if (restaurantId) {
      query.restaurantId = restaurantId;
    } else if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (date) {
      query.reservationDate = date;
    } else if (startDate && endDate) {
      query.reservationDate = { $gte: startDate, $lte: endDate };
    }
    
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { reservationNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const reservations = await Reservation.find(query)
      .populate('restaurantId', 'name slug')
      .populate('table.tableId', 'tableNumber capacity')
      .sort({ reservationDate: -1, timeSlot: 1 })
      .lean();
    
    return ResponseHelper.success(res, 200, 'Reservations retrieved successfully', {
      reservations,
      total: reservations.length
    });
  } catch (error) {
    logger.error('Get all reservations error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve reservations');
  }
};

/**
 * Get Single Reservation
 * GET /api/reservations/:id
 */
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    
    const reservation = await Reservation.findById(id)
      .populate('restaurantId', 'name slug address phone')
      .populate('table.tableId', 'tableNumber capacity tableType');
    
    if (!reservation) {
      return ResponseHelper.notFound(res, 'Reservation not found');
    }
    
    return ResponseHelper.success(res, 200, 'Reservation retrieved successfully', {
      reservation
    });
  } catch (error) {
    logger.error('Get reservation by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve reservation');
  }
};

/**
 * Update Reservation Status
 * PATCH /api/reservations/:id/status
 */
const updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    const Table = models.Table;
    
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return ResponseHelper.notFound(res, 'Reservation not found');
    }
    
    await reservation.updateStatus(status, req.user.id, note);
    
    // Update table status if needed
    if (status === 'checked-in' && reservation.table.tableId) {
      const table = await Table.findById(reservation.table.tableId);
      if (table) {
        await table.occupy(null); // Mark as occupied without order yet
      }
    } else if (status === 'completed' && reservation.table.tableId) {
      const table = await Table.findById(reservation.table.tableId);
      if (table) {
        await table.makeAvailable();
      }
    } else if (status === 'no-show' || status === 'cancelled') {
      if (reservation.table.tableId) {
        const table = await Table.findById(reservation.table.tableId);
        if (table) {
          await table.makeAvailable();
        }
      }
    }
    
    logger.info(`Reservation status updated: ${reservation._id} to ${status}`);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant:${reservation.restaurantId}`).emit('reservation:statusChanged', {
      reservationId: reservation._id,
      status
    });
    
    return ResponseHelper.success(res, 200, 'Reservation status updated successfully', {
      reservation
    });
  } catch (error) {
    logger.error('Update reservation status error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update reservation status');
  }
};

/**
 * Cancel Reservation
 * POST /api/reservations/:id/cancel
 */
const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    const Table = models.Table;
    
    const reservation = await Reservation.findById(id);
    
    if (!reservation) {
      return ResponseHelper.notFound(res, 'Reservation not found');
    }
    
    // Check if customer owns this reservation (if customer role)
    if (req.user.role === 'customer') {
      if (reservation.customer.userId?.toString() !== req.user.id) {
        return ResponseHelper.forbidden(res, 'You can only cancel your own reservations');
      }
    }
    
    if (reservation.status === 'cancelled') {
      return ResponseHelper.error(res, 400, 'Reservation is already cancelled');
    }
    
    // Update status
    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason;
    await reservation.save();
    
    // Free up the table
    if (reservation.table.tableId) {
      const table = await Table.findById(reservation.table.tableId);
      if (table) {
        await table.makeAvailable();
      }
    }
    
    logger.info(`Reservation cancelled: ${reservation._id}`);
    
    // Note: Advance payment is non-refundable
    
    return ResponseHelper.success(res, 200, 'Reservation cancelled. Note: Advance payment is non-refundable.');
  } catch (error) {
    logger.error('Cancel reservation error:', error);
    return ResponseHelper.error(res, 500, 'Failed to cancel reservation');
  }
};

/**
 * Get Reservation Calendar View
 * GET /api/reservations/calendar
 */
const getReservationCalendar = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return ResponseHelper.error(res, 400, 'startDate and endDate are required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Reservation = models.Reservation;
    
    const reservations = await Reservation.find({
      restaurantId,
      reservationDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['confirmed', 'checked-in'] }
    }).select('reservationDate timeSlot numberOfGuests customer.name table.tableNumber');
    
    // Group by date
    const calendar = {};
    reservations.forEach(res => {
      if (!calendar[res.reservationDate]) {
        calendar[res.reservationDate] = [];
      }
      calendar[res.reservationDate].push({
        id: res._id,
        time: res.timeSlot,
        guests: res.numberOfGuests,
        customerName: res.customer.name,
        tableNumber: res.table.tableNumber
      });
    });
    
    return ResponseHelper.success(res, 200, 'Reservation calendar retrieved successfully', {
      calendar,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    logger.error('Get reservation calendar error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve calendar');
  }
};

module.exports = {
  createReservation,
  confirmReservation,
  getAllReservations,
  getReservationById,
  updateReservationStatus,
  cancelReservation,
  getReservationCalendar
};