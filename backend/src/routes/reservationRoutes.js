
// ============================================
// RESERVATION ROUTES
// ============================================
// Save as: src/routes/reservationRoutes.js

const express = require('express');
const router = express.Router();

const {
  createReservation,
  confirmReservation,
  getAllReservations,
  getReservationById,
  updateReservationStatus,
  cancelReservation,
  getReservationCalendar
} = require('../controllers/reservationController');

const {
  authenticate: auth,
  requireManager: reqManager,
  requireStaff: reqStaff,
  requireCustomer,
  optionalAuthenticate,
  attachOwnerModels: attachModels,
  validate: val,
  validateObjectId: valId,
  asyncHandler: async,
  sanitizeInput: sanitize
} = require('../middlewares');

const {
  createReservationSchema,
  confirmReservationSchema,
  updateReservationStatusSchema,
  cancelReservationSchema
} = require('../validators/tableValidator');

// Public/Customer routes
router.post('/', optionalAuthenticate, attachModels, sanitize, val(createReservationSchema), async(createReservation));
router.post('/:id/confirm', optionalAuthenticate, attachModels, valId('id'), val(confirmReservationSchema), async(confirmReservation));
router.post('/:id/cancel', auth, attachModels, valId('id'), val(cancelReservationSchema), async(cancelReservation));

// Staff routes
router.get('/calendar', auth, reqStaff, attachModels, async(getReservationCalendar));
router.get('/', auth, reqStaff, attachModels, async(getAllReservations));
router.get('/:id', auth, reqStaff, attachModels, valId('id'), async(getReservationById));
router.patch('/:id/status', auth, reqStaff, attachModels, valId('id'), val(updateReservationStatusSchema), async(updateReservationStatus));

module.exports = router;