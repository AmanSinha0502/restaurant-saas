// ============================================
// SUPPLIER CONTROLLER
// ============================================
// Save as: backend/src/controllers/supplierController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Create Supplier
 * POST /api/suppliers
 */
const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    const Restaurant = models.Restaurant;
    
    // Verify restaurant
    const restaurant = await Restaurant.findOne({
      _id: supplierData.restaurantId,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Create supplier
    const supplier = await Supplier.create({
      ...supplierData,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
    });
    
    logger.info(`Supplier created: ${supplier._id} (${supplier.companyName})`);
    
    return ResponseHelper.created(res, 'Supplier created successfully', {
      supplier
    });
    
  } catch (error) {
    logger.error('Create supplier error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create supplier');
  }
};

/**
 * Get All Suppliers
 * GET /api/suppliers
 */
const getAllSuppliers = async (req, res) => {
  try {
    const {
      restaurantId,
      status,
      category,
      search,
      page = 1,
      limit = 20
    } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
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
    
    if (category) {
      query.categories = category;
    }
    
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { supplierCode: { $regex: search, $options: 'i' } },
        { 'contactPerson.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [suppliers, totalCount] = await Promise.all([
      Supplier.find(query)
        .populate('restaurantId', 'name')
        .sort({ companyName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Supplier.countDocuments(query)
    ]);
    
    return ResponseHelper.success(res, 200, 'Suppliers retrieved successfully', {
      suppliers,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error('Get all suppliers error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve suppliers');
  }
};

/**
 * Get Single Supplier
 * GET /api/suppliers/:id
 */
const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const supplier = await Supplier.findById(id)
      .populate('restaurantId', 'name address')
      .populate('itemsSupplied.inventoryId', 'itemName currentStock');
    
    if (!supplier) {
      return ResponseHelper.notFound(res, 'Supplier not found');
    }
    
    return ResponseHelper.success(res, 200, 'Supplier retrieved successfully', {
      supplier
    });
    
  } catch (error) {
    logger.error('Get supplier by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve supplier');
  }
};

/**
 * Update Supplier
 * PUT /api/suppliers/:id
 */
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return ResponseHelper.notFound(res, 'Supplier not found');
    }
    
    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (typeof updateData[key] === 'object' && !Array.isArray(updateData[key])) {
          supplier[key] = { ...supplier[key], ...updateData[key] };
        } else {
          supplier[key] = updateData[key];
        }
      }
    });
    
    await supplier.save();
    
    logger.info(`Supplier updated: ${supplier._id}`);
    
    return ResponseHelper.success(res, 200, 'Supplier updated successfully', {
      supplier
    });
    
  } catch (error) {
    logger.error('Update supplier error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update supplier');
  }
};

/**
 * Delete Supplier
 * DELETE /api/suppliers/:id
 */
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return ResponseHelper.notFound(res, 'Supplier not found');
    }
    
    // Change status to inactive instead of deleting
    supplier.status = 'inactive';
    await supplier.save();
    
    logger.warn(`Supplier deleted: ${supplier._id}`);
    
    return ResponseHelper.success(res, 200, 'Supplier deleted successfully');
    
  } catch (error) {
    logger.error('Delete supplier error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete supplier');
  }
};

/**
 * Rate Supplier
 * POST /api/suppliers/:id/rate
 */
const rateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const ratings = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return ResponseHelper.notFound(res, 'Supplier not found');
    }
    
    // Update ratings
    supplier.updateRating(ratings);
    await supplier.save();
    
    logger.info(`Supplier ${supplier.companyName} rated: Overall ${supplier.rating.overall}/5`);
    
    return ResponseHelper.success(res, 200, 'Supplier rated successfully', {
      rating: supplier.rating
    });
    
  } catch (error) {
    logger.error('Rate supplier error:', error);
    return ResponseHelper.error(res, 500, 'Failed to rate supplier');
  }
};

/**
 * Get Suppliers by Category
 * GET /api/suppliers/by-category/:category
 */
const getSuppliersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return ResponseHelper.error(res, 400, 'Restaurant ID is required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const suppliers = await Supplier.getByCategory(restaurantId, category);
    
    return ResponseHelper.success(res, 200, 'Suppliers retrieved successfully', {
      suppliers,
      total: suppliers.length
    });
    
  } catch (error) {
    logger.error('Get suppliers by category error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve suppliers');
  }
};

/**
 * Add Item to Supplier
 * POST /api/suppliers/:id/items
 */
const addItemToSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryId, itemName, unitPrice, unit, minimumOrderQuantity, isPrimary } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Supplier = models.Supplier;
    
    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return ResponseHelper.notFound(res, 'Supplier not found');
    }
    
    // Add item
    supplier.itemsSupplied.push({
      inventoryId,
      itemName,
      unitPrice,
      unit,
      minimumOrderQuantity,
      isPrimary
    });
    
    await supplier.save();
    
    logger.info(`Item ${itemName} added to supplier ${supplier.companyName}`);
    
    return ResponseHelper.success(res, 200, 'Item added to supplier successfully', {
      supplier
    });
    
  } catch (error) {
    logger.error('Add item to supplier error:', error);
    return ResponseHelper.error(res, 500, 'Failed to add item to supplier');
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  rateSupplier,
  getSuppliersByCategory,
  addItemToSupplier
};