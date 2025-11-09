const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { deleteUploadedFiles } = require('../middlewares/uploadMiddleware');

/**
 * Create Menu Item
 * POST /api/menu
 */
const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      currency,
      dietaryType,
      preparationTime,
      sharedAcrossBranches,
      specificBranches,
      linkedInventoryItems,
      tags,
      allergens,
      calories,
      spiceLevel,
      customizations
    } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    const Restaurant = models.Restaurant;
    
    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/images/${file.filename}`);
    }
    
    // Verify restaurants if specific branches
    let restaurantId = null;
    if (!sharedAcrossBranches && specificBranches && specificBranches.length > 0) {
      const restaurants = await Restaurant.find({
        _id: { $in: specificBranches },
        ownerId: req.ownerId
      });
      
      if (restaurants.length !== specificBranches.length) {
        // Cleanup uploaded images
        if (req.files) deleteUploadedFiles(req.files);
        return ResponseHelper.error(res, 400, 'One or more restaurants not found');
      }
      
      // For branch-specific, set restaurantId to first one (or handle differently)
      restaurantId = specificBranches[0];
    }
    
    // Create menu item
    const menuItem = await Menu.create({
      restaurantId,
      ownerId: req.ownerId,
      sharedAcrossBranches: sharedAcrossBranches !== false,
      specificBranches: sharedAcrossBranches ? [] : (specificBranches || []),
      name,
      description,
      category,
      price,
      currency: currency || 'INR',
      images,
      dietaryType: dietaryType || 'veg',
      preparationTime: preparationTime || 15,
      isActive: true,
      linkedInventoryItems: linkedInventoryItems || [],
      tags: tags || [],
      allergens: allergens || [],
      calories,
      spiceLevel,
      customizations: customizations || [],
      createdBy: req.user.id
    });
    
    logger.info(`Menu item created: ${menuItem._id} by ${req.user.role}: ${req.user.id}`);
    
    return ResponseHelper.created(res, 'Menu item created successfully', {
      menuItem
    });
  } catch (error) {
    // Cleanup uploaded images on error
    if (req.files) deleteUploadedFiles(req.files);
    logger.error('Create menu item error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create menu item');
  }
};

/**
 * Get All Menu Items
 * GET /api/menu
 */
const getAllMenuItems = async (req, res) => {
  try {
    const {
      category,
      dietaryType,
      isActive,
      search,
      restaurantId,
      sharedOnly,
      minPrice,
      maxPrice,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    // Build query
    const query = { ownerId: req.ownerId };
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by dietary type
    if (dietaryType) {
      query.dietaryType = dietaryType;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Filter by restaurant (branch-specific or shared)
    if (restaurantId) {
      query.$or = [
        { sharedAcrossBranches: true },
        { specificBranches: restaurantId }
      ];
    }
    
    // Filter shared only
    if (sharedOnly === 'true') {
      query.sharedAcrossBranches = true;
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.hi': { $regex: search, $options: 'i' } },
        { 'name.ar': { $regex: search, $options: 'i' } },
        { 'description.en': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }
    
    // Sort
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    // Execute query
    const menuItems = await Menu.find(query)
      .sort(sort)
      .lean();
    
    return ResponseHelper.success(res, 200, 'Menu items retrieved successfully', {
      menuItems,
      total: menuItems.length
    });
  } catch (error) {
    logger.error('Get all menu items error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve menu items');
  }
};

/**
 * Get Single Menu Item
 * GET /api/menu/:id
 */
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const menuItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    }).populate('linkedInventoryItems.inventoryId', 'itemName currentStock unit');
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    return ResponseHelper.success(res, 200, 'Menu item retrieved successfully', {
      menuItem
    });
  } catch (error) {
    logger.error('Get menu item by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve menu item');
  }
};

/**
 * Update Menu Item
 * PUT /api/menu/:id
 */
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    const Restaurant = models.Restaurant;
    
    const menuItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/images/${file.filename}`);
      // Append to existing images or replace based on requirement
      updateData.images = [...(menuItem.images || []), ...newImages];
    }
    
    // Verify specific branches if being updated
    if (updateData.specificBranches && updateData.specificBranches.length > 0) {
      const restaurants = await Restaurant.find({
        _id: { $in: updateData.specificBranches },
        ownerId: req.ownerId
      });
      
      if (restaurants.length !== updateData.specificBranches.length) {
        if (req.files) deleteUploadedFiles(req.files);
        return ResponseHelper.error(res, 400, 'One or more restaurants not found');
      }
    }
    
    // Update allowed fields
    const allowedFields = [
      'name',
      'description',
      'category',
      'price',
      'currency',
      'images',
      'dietaryType',
      'preparationTime',
      'isActive',
      'sharedAcrossBranches',
      'specificBranches',
      'linkedInventoryItems',
      'tags',
      'allergens',
      'calories',
      'spiceLevel',
      'customizations'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
          // Merge nested objects (like name, description)
          menuItem[field] = { ...menuItem[field], ...updateData[field] };
        } else {
          menuItem[field] = updateData[field];
        }
      }
    });
    
    await menuItem.save();
    
    logger.info(`Menu item updated: ${menuItem._id} by ${req.user.role}: ${req.user.id}`);
    
    return ResponseHelper.success(res, 200, 'Menu item updated successfully', {
      menuItem
    });
  } catch (error) {
    if (req.files) deleteUploadedFiles(req.files);
    logger.error('Update menu item error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update menu item');
  }
};

/**
 * Delete Menu Item
 * DELETE /api/menu/:id
 */
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const menuItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Soft delete - just mark as inactive
    menuItem.isActive = false;
    await menuItem.save();
    
    logger.warn(`Menu item deleted: ${menuItem._id} by ${req.user.role}: ${req.user.id}`);
    
    return ResponseHelper.success(res, 200, 'Menu item deleted successfully');
  } catch (error) {
    logger.error('Delete menu item error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete menu item');
  }
};

/**
 * Toggle Menu Item Availability (Real-time)
 * PATCH /api/menu/:id/availability
 */
const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId, isAvailable, reason } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const menuItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Toggle availability for specific restaurant
    await menuItem.toggleAvailability(restaurantId, isAvailable, reason);
    
    logger.info(`Menu availability toggled: ${menuItem._id} at restaurant: ${restaurantId} to ${isAvailable}`);
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    io.to(`restaurant:${restaurantId}`).emit('menu:availabilityChanged', {
      menuId: menuItem._id,
      isAvailable,
      reason
    });
    
    return ResponseHelper.success(res, 200, 'Menu availability updated successfully', {
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        availabilityByBranch: menuItem.availabilityByBranch
      }
    });
  } catch (error) {
    logger.error('Toggle availability error:', error);
    return ResponseHelper.error(res, 500, 'Failed to toggle availability');
  }
};

/**
 * Bulk Toggle Availability
 * PATCH /api/menu/bulk/availability
 */
const bulkToggleAvailability = async (req, res) => {
  try {
    const { menuIds, restaurantId, isAvailable, reason } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const menuItems = await Menu.find({
      _id: { $in: menuIds },
      ownerId: req.ownerId
    });
    
    if (menuItems.length === 0) {
      return ResponseHelper.notFound(res, 'No menu items found');
    }
    
    // Toggle availability for all
    const promises = menuItems.map(item => 
      item.toggleAvailability(restaurantId, isAvailable, reason)
    );
    
    await Promise.all(promises);
    
    logger.info(`Bulk availability toggle: ${menuItems.length} items at restaurant: ${restaurantId}`);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant:${restaurantId}`).emit('menu:bulkAvailabilityChanged', {
      menuIds,
      isAvailable,
      reason
    });
    
    return ResponseHelper.success(res, 200, `${menuItems.length} menu items updated successfully`);
  } catch (error) {
    logger.error('Bulk toggle availability error:', error);
    return ResponseHelper.error(res, 500, 'Failed to bulk toggle availability');
  }
};

/**
 * Get Menu Categories
 * GET /api/menu/categories
 */
const getCategories = async (req, res) => {
  try {
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    // Get unique categories
    const categories = await Menu.distinct('category', {
      ownerId: req.ownerId,
      isActive: true
    });
    
    // Get count per category
    const categoryCounts = await Menu.aggregate([
      {
        $match: {
          ownerId: req.ownerId,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return ResponseHelper.success(res, 200, 'Categories retrieved successfully', {
      categories: categoryCounts.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (error) {
    logger.error('Get categories error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve categories');
  }
};

/**
 * Duplicate Menu Item
 * POST /api/menu/:id/duplicate
 */
const duplicateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const originalItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    });
    
    if (!originalItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Create duplicate
    const duplicateData = originalItem.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.__v;
    
    // Modify name to indicate it's a copy
    duplicateData.name.en = `${duplicateData.name.en} (Copy)`;
    if (duplicateData.name.hi) duplicateData.name.hi = `${duplicateData.name.hi} (प्रति)`;
    if (duplicateData.name.ar) duplicateData.name.ar = `${duplicateData.name.ar} (نسخة)`;
    
    duplicateData.createdBy = req.user.id;
    
    const newMenuItem = await Menu.create(duplicateData);
    
    logger.info(`Menu item duplicated: ${id} -> ${newMenuItem._id}`);
    
    return ResponseHelper.created(res, 'Menu item duplicated successfully', {
      menuItem: newMenuItem
    });
  } catch (error) {
    logger.error('Duplicate menu item error:', error);
    return ResponseHelper.error(res, 500, 'Failed to duplicate menu item');
  }
};

/**
 * Get Popular Menu Items
 * GET /api/menu/popular
 */
const getPopularItems = async (req, res) => {
  try {
    const { restaurantId, limit = 10 } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const query = {
      ownerId: req.ownerId,
      isActive: true
    };
    
    if (restaurantId) {
      query.$or = [
        { sharedAcrossBranches: true },
        { specificBranches: restaurantId }
      ];
    }
    
    // Get items sorted by total orders (or you can use tags)
    const popularItems = await Menu.find(query)
      .sort({ totalOrders: -1 })
      .limit(parseInt(limit))
      .lean();
    
    return ResponseHelper.success(res, 200, 'Popular items retrieved successfully', {
      items: popularItems
    });
  } catch (error) {
    logger.error('Get popular items error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve popular items');
  }
};

/**
 * Check Menu Item Availability at Restaurant
 * GET /api/menu/:id/check-availability/:restaurantId
 */
const checkAvailability = async (req, res) => {
  try {
    const { id, restaurantId } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    const Inventory = models.Inventory;
    
    const menuItem = await Menu.findOne({
      _id: id,
      ownerId: req.ownerId
    }).populate('linkedInventoryItems.inventoryId');
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Check if available at restaurant
    const isAvailable = menuItem.isAvailableAt(restaurantId);
    
    // Check inventory availability
    let inventoryAvailable = true;
    let outOfStockItems = [];
    
    if (menuItem.linkedInventoryItems && menuItem.linkedInventoryItems.length > 0) {
      for (let item of menuItem.linkedInventoryItems) {
        const inventory = await Inventory.findOne({
          _id: item.inventoryId,
          restaurantId
        });
        
        if (!inventory || inventory.currentStock < item.quantityRequired) {
          inventoryAvailable = false;
          outOfStockItems.push({
            itemName: inventory?.itemName?.en || 'Unknown',
            required: item.quantityRequired,
            available: inventory?.currentStock || 0
          });
        }
      }
    }
    
    return ResponseHelper.success(res, 200, 'Availability checked successfully', {
      menuItem: {
        id: menuItem._id,
        name: menuItem.name,
        isAvailable: isAvailable && inventoryAvailable,
        reason: !isAvailable ? 'Marked unavailable by staff' : 
                !inventoryAvailable ? 'Insufficient inventory' : 'Available'
      },
      inventory: {
        available: inventoryAvailable,
        outOfStockItems
      }
    });
  } catch (error) {
    logger.error('Check availability error:', error);
    return ResponseHelper.error(res, 500, 'Failed to check availability');
  }
};

module.exports = {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  bulkToggleAvailability,
  getCategories,
  duplicateMenuItem,
  getPopularItems,
  checkAvailability
};