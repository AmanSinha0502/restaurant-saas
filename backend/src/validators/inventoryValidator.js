// ============================================
// INVENTORY VALIDATORS
// ============================================
// Save as: backend/src/validators/inventoryValidator.js

const Joi = require('joi');

// ============================================
// INVENTORY VALIDATORS
// ============================================

const createInventorySchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  itemName: Joi.object({
    en: Joi.string().required(),
    hi: Joi.string().allow(''),
    ar: Joi.string().allow('')
  }).required(),
  
  category: Joi.string().valid(
    'vegetables',
    'fruits',
    'meat-poultry',
    'seafood',
    'dairy',
    'grains-pulses',
    'spices-condiments',
    'oils-fats',
    'beverages',
    'packaging',
    'cleaning-supplies',
    'other'
  ).required(),
  
  currentStock: Joi.number().min(0).required(),
  unit: Joi.string().valid('kg', 'g', 'L', 'mL', 'pcs', 'dozen', 'box', 'packet', 'bottle', 'can').required(),
  
  minimumStock: Joi.number().min(0).required(),
  maximumStock: Joi.number().min(0),
  reorderPoint: Joi.number().min(0).required(),
  reorderQuantity: Joi.number().min(0),
  
  unitPrice: Joi.number().min(0).required(),
  
  supplier: Joi.object({
    supplierId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    name: Joi.string().required(),
    phone: Joi.string().required(),
    email: Joi.string().email().allow(''),
    address: Joi.string().allow('')
  }),
  
  storageLocation: Joi.string().valid('cold-storage', 'freezer', 'dry-storage', 'pantry', 'refrigerator', 'counter'),
  
  isPerishable: Joi.boolean(),
  shelfLife: Joi.object({
    value: Joi.number().min(1),
    unit: Joi.string().valid('days', 'weeks', 'months', 'years')
  }),
  expiryDate: Joi.date(),
  
  barcode: Joi.string().allow(''),
  description: Joi.string().max(1000).allow(''),
  notes: Joi.string().max(500).allow('')
});

const updateInventorySchema = Joi.object({
  itemName: Joi.object({
    en: Joi.string(),
    hi: Joi.string().allow(''),
    ar: Joi.string().allow('')
  }),
  
  category: Joi.string().valid(
    'vegetables',
    'fruits',
    'meat-poultry',
    'seafood',
    'dairy',
    'grains-pulses',
    'spices-condiments',
    'oils-fats',
    'beverages',
    'packaging',
    'cleaning-supplies',
    'other'
  ),
  
  unit: Joi.string().valid('kg', 'g', 'L', 'mL', 'pcs', 'dozen', 'box', 'packet', 'bottle', 'can'),
  
  minimumStock: Joi.number().min(0),
  maximumStock: Joi.number().min(0),
  reorderPoint: Joi.number().min(0),
  reorderQuantity: Joi.number().min(0),
  
  unitPrice: Joi.number().min(0),
  
  supplier: Joi.object({
    supplierId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    name: Joi.string(),
    phone: Joi.string(),
    email: Joi.string().email().allow(''),
    address: Joi.string().allow('')
  }),
  
  storageLocation: Joi.string().valid('cold-storage', 'freezer', 'dry-storage', 'pantry', 'refrigerator', 'counter'),
  
  isPerishable: Joi.boolean(),
  shelfLife: Joi.object({
    value: Joi.number().min(1),
    unit: Joi.string().valid('days', 'weeks', 'months', 'years')
  }),
  expiryDate: Joi.date(),
  
  isActive: Joi.boolean(),
  isAutoDeductEnabled: Joi.boolean(),
  
  description: Joi.string().max(1000).allow(''),
  notes: Joi.string().max(500).allow('')
}).min(1);

const restockSchema = Joi.object({
  quantity: Joi.number().min(0.01).required(),
  reason: Joi.string().max(500).allow(''),
  invoice: Joi.string().max(100).allow(''),
  batchNumber: Joi.string().max(100).allow(''),
  expiryDate: Joi.date(),
  unitPrice: Joi.number().min(0),
  notes: Joi.string().max(500).allow('')
});

const deductStockSchema = Joi.object({
  quantity: Joi.number().min(0.01).required(),
  reason: Joi.string().max(500).allow(''),
  orderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  menuId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  notes: Joi.string().max(500).allow('')
});

const recordWastageSchema = Joi.object({
  quantity: Joi.number().min(0.01).required(),
  reason: Joi.string().min(5).max(500).required()
});

const adjustStockSchema = Joi.object({
  newQuantity: Joi.number().min(0).required(),
  reason: Joi.string().min(5).max(500).required()
});

const linkMenuItemSchema = Joi.object({
  menuId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  quantityRequired: Joi.number().min(0.01).required(),
  unit: Joi.string().valid('kg', 'g', 'L', 'mL', 'pcs', 'dozen', 'box', 'packet', 'bottle', 'can').required()
});

const bulkUpdateStockSchema = Joi.object({
  items: Joi.array().min(1).items(
    Joi.object({
      inventoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().required(),
      type: Joi.string().valid('add', 'deduct', 'adjust').required(),
      reason: Joi.string().allow('')
    })
  ).required()
});

// ============================================
// SUPPLIER VALIDATORS
// ============================================

const createSupplierSchema = Joi.object({
  restaurantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  companyName: Joi.string().min(2).max(200).required(),
  
  contactPerson: Joi.object({
    name: Joi.string().required(),
    designation: Joi.string().allow(''),
    phone: Joi.string().required(),
    email: Joi.string().email().allow(''),
    alternatePhone: Joi.string().allow('')
  }).required(),
  
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    country: Joi.string().allow(''),
    postalCode: Joi.string().allow('')
  }),
  
  businessType: Joi.string().valid('manufacturer', 'wholesaler', 'distributor', 'retailer', 'farmer', 'other'),
  
  taxId: Joi.string().allow(''),
  
  categories: Joi.array().items(
    Joi.string().valid(
      'vegetables',
      'fruits',
      'meat-poultry',
      'seafood',
      'dairy',
      'grains-pulses',
      'spices-condiments',
      'oils-fats',
      'beverages',
      'packaging',
      'cleaning-supplies',
      'other'
    )
  ),
  
  paymentTerms: Joi.object({
    method: Joi.string().valid('cash', 'credit', 'bank-transfer', 'cheque'),
    creditPeriod: Joi.number().min(0),
    advanceRequired: Joi.boolean(),
    advancePercentage: Joi.number().min(0).max(100)
  }),
  
  deliveryDetails: Joi.object({
    minimumOrderValue: Joi.number().min(0),
    deliveryCharge: Joi.number().min(0),
    freeDeliveryAbove: Joi.number().min(0),
    averageDeliveryTime: Joi.number().min(0),
    deliveryDays: Joi.array().items(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    )
  }),
  
  notes: Joi.string().max(1000).allow('')
});

const updateSupplierSchema = Joi.object({
  companyName: Joi.string().min(2).max(200),
  
  contactPerson: Joi.object({
    name: Joi.string(),
    designation: Joi.string().allow(''),
    phone: Joi.string(),
    email: Joi.string().email().allow(''),
    alternatePhone: Joi.string().allow('')
  }),
  
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    country: Joi.string().allow(''),
    postalCode: Joi.string().allow('')
  }),
  
  businessType: Joi.string().valid('manufacturer', 'wholesaler', 'distributor', 'retailer', 'farmer', 'other'),
  
  taxId: Joi.string().allow(''),
  
  categories: Joi.array().items(
    Joi.string().valid(
      'vegetables',
      'fruits',
      'meat-poultry',
      'seafood',
      'dairy',
      'grains-pulses',
      'spices-condiments',
      'oils-fats',
      'beverages',
      'packaging',
      'cleaning-supplies',
      'other'
    )
  ),
  
  paymentTerms: Joi.object({
    method: Joi.string().valid('cash', 'credit', 'bank-transfer', 'cheque'),
    creditPeriod: Joi.number().min(0),
    advanceRequired: Joi.boolean(),
    advancePercentage: Joi.number().min(0).max(100)
  }),
  
  deliveryDetails: Joi.object({
    minimumOrderValue: Joi.number().min(0),
    deliveryCharge: Joi.number().min(0),
    freeDeliveryAbove: Joi.number().min(0),
    averageDeliveryTime: Joi.number().min(0),
    deliveryDays: Joi.array().items(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    )
  }),
  
  status: Joi.string().valid('active', 'inactive', 'blacklisted', 'on-hold'),
  
  notes: Joi.string().max(1000).allow('')
}).min(1);

const rateSupplierSchema = Joi.object({
  quality: Joi.number().min(1).max(5),
  pricing: Joi.number().min(1).max(5),
  delivery: Joi.number().min(1).max(5),
  service: Joi.number().min(1).max(5)
}).min(1);

module.exports = {
  createInventorySchema,
  updateInventorySchema,
  restockSchema,
  deductStockSchema,
  recordWastageSchema,
  adjustStockSchema,
  linkMenuItemSchema,
  bulkUpdateStockSchema,
  createSupplierSchema,
  updateSupplierSchema,
  rateSupplierSchema
};