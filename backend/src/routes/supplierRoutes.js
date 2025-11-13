const express = require('express');
const router = express.Router();

const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  rateSupplier,
  getSuppliersByCategory,
  addItemToSupplier
} = require('../controllers/supplierController');

const {
  authenticate,
  requireManager,
  attachOwnerModels,
  validate,
  validateObjectId,
  asyncHandler,
  sanitizeInput
} = require('../middlewares');

const {
  createSupplierSchema,
  updateSupplierSchema,
  rateSupplierSchema
} = require('../validators/inventoryValidator');

// Category route before :id
router.get('/by-category/:category', authenticate, requireManager, attachOwnerModels, asyncHandler(getSuppliersByCategory));

// CRUD Operations
router.post('/', authenticate, requireManager, attachOwnerModels, sanitizeInput, validate(createSupplierSchema), asyncHandler(createSupplier));
router.get('/', authenticate, requireManager, attachOwnerModels, asyncHandler(getAllSuppliers));
router.get('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(getSupplierById));
router.put('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), sanitizeInput, validate(updateSupplierSchema), asyncHandler(updateSupplier));
router.delete('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(deleteSupplier));

// Rating
router.post('/:id/rate', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), validate(rateSupplierSchema), asyncHandler(rateSupplier));

// Supplier Items
router.post('/:id/items', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(addItemToSupplier));

module.exports = router;