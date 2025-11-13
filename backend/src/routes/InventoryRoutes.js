const express = require('express');
const router = express.Router();

const {
  createInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryStats,
  getLowStockItems,
  getReorderList,
  getExpiringItems,
  restockInventoryItem,
  deductInventoryStock,
  recordWastage,
  adjustStock,
  linkMenuItem,
  unlinkMenuItem,
  bulkUpdateStock,
  getStockMovement
} = require('../controllers/inventoryController');

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
  createInventorySchema,
  updateInventorySchema,
  restockSchema,
  deductStockSchema,
  recordWastageSchema,
  adjustStockSchema,
  linkMenuItemSchema,
  bulkUpdateStockSchema
} = require('../validators/inventoryValidator');

// Stats & Reports (must be before :id routes)
router.get('/stats', authenticate, requireStaff, attachOwnerModels, asyncHandler(getInventoryStats));
router.get('/low-stock', authenticate, requireStaff, attachOwnerModels, asyncHandler(getLowStockItems));
router.get('/reorder-list', authenticate, requireStaff, attachOwnerModels, asyncHandler(getReorderList));
router.get('/expiring', authenticate, requireStaff, attachOwnerModels, asyncHandler(getExpiringItems));
router.post('/bulk-update', authenticate, requireManager, attachOwnerModels, sanitizeInput, validate(bulkUpdateStockSchema), asyncHandler(bulkUpdateStock));

// CRUD Operations
router.post('/', authenticate, requireManager, attachOwnerModels, sanitizeInput, validate(createInventorySchema), asyncHandler(createInventoryItem));
router.get('/', authenticate, requireStaff, attachOwnerModels, asyncHandler(getAllInventoryItems));
router.get('/:id', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), asyncHandler(getInventoryItemById));
router.put('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), sanitizeInput, validate(updateInventorySchema), asyncHandler(updateInventoryItem));
router.delete('/:id', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), asyncHandler(deleteInventoryItem));

// Stock Operations
router.post('/:id/restock', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), validate(restockSchema), asyncHandler(restockInventoryItem));
router.post('/:id/deduct', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), validate(deductStockSchema), asyncHandler(deductInventoryStock));
router.post('/:id/wastage', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), validate(recordWastageSchema), asyncHandler(recordWastage));
router.post('/:id/adjust', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), validate(adjustStockSchema), asyncHandler(adjustStock));

// Menu Linking
router.post('/:id/link-menu', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), validate(linkMenuItemSchema), asyncHandler(linkMenuItem));
router.delete('/:id/unlink-menu/:menuId', authenticate, requireManager, attachOwnerModels, validateObjectId('id'), validateObjectId('menuId'), asyncHandler(unlinkMenuItem));

// Reports
router.get('/:id/movement', authenticate, requireStaff, attachOwnerModels, validateObjectId('id'), asyncHandler(getStockMovement));

module.exports = router;