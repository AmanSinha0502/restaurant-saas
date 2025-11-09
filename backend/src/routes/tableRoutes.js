// ============================================
// TABLE ROUTES
// ============================================
// Save as: src/routes/tableRoutes.js

const express = require('express');
const router = express.Router();

const {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
  updateTableStatus,
  getAvailableTables,
  getAvailabilityGrid,
  getTableStats,
  bulkCreateTables
} = require('../controllers/tableController');

const {
  authenticate,
  requireManager,
  requireStaff,
  attachOwnerModels,
  validate,
  validateObjectId,
  asyncHandler,
  sanitizeInput
} = require('../middlewares');

const {
  createTableSchema,
  updateTableSchema,
  updateTableStatusSchema,
  bulkCreateTablesSchema
} = require('../validators/tableValidator');

// Bulk operations first
router.post('/bulk', authenticate, requireManager, attachOwnerModels, validate(bulkCreateTablesSchema), asyncHandler(bulkCreateTables));
router.get('/available', authenticate, requireStaff, attachOwnerModels, asyncHandler(getAvailableTables));
router.get('/stats', authenticate, requireStaff, attachOwnerModels, asyncHandler(getTableStats));
router.get('/:restaurantId/availability-grid', authenticate, requireStaff, attachOwnerModels, asyncHandler(getAvailabilityGrid));

// CRUD operations
router.post('/', authenticate, requireManager, attachOwnerModels, sanitizeInput, validate(createTableSchema), asyncHandler(createTable));
router.get('/', authenticate, requireStaff, attachOwnerModels, asyncHandler(getAllTables));
router.get('/:id', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), asyncHandler(getTableById));
router.put('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), sanitizeInput, validate(updateTableSchema), asyncHandler(updateTable));
router.delete('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(deleteTable));
router.patch('/:id/status', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), validate(updateTableStatusSchema), asyncHandler(updateTableStatus));

module.exports = router;