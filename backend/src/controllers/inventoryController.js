// ============================================
// INVENTORY CONTROLLER - PART 1 (CRUD)
// ============================================
// Save as: backend/src/controllers/inventoryController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Create Inventory Item
 * POST /api/inventory
 */
const createInventoryItem = async (req, res) => {
    try {
        const inventoryData = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;
        const Restaurant = models.Restaurant;

        // Verify restaurant
        const restaurant = await Restaurant.findOne({
            _id: inventoryData.restaurantId,
            ownerId: req.ownerId
        });

        if (!restaurant) {
            return ResponseHelper.notFound(res, 'Restaurant not found');
        }

        // Check manager access
        if (req.user.role === 'manager' && req.assignedRestaurants) {
            if (!req.assignedRestaurants.includes(inventoryData.restaurantId)) {
                return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
            }
        }

        // Set currency from restaurant
        inventoryData.currency = restaurant.currency;

        // Create inventory item
        const inventoryItem = await Inventory.create({
            ...inventoryData,
            createdBy: req.user.id,
            createdByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
        });

        logger.info(`Inventory item created: ${inventoryItem._id} (${inventoryItem.itemName.en}) at restaurant: ${inventoryData.restaurantId}`);

        return ResponseHelper.created(res, 'Inventory item created successfully', {
            item: inventoryItem
        });

    } catch (error) {
        logger.error('Create inventory item error:', error);
        return ResponseHelper.error(res, 500, 'Failed to create inventory item');
    }
};

/**
 * Get All Inventory Items
 * GET /api/inventory
 */
const getAllInventoryItems = async (req, res) => {
    try {
        const {
            restaurantId,
            category,
            status,
            search,
            isPerishable,
            page = 1,
            limit = 20,
            sortBy = 'itemName.en',
            sortOrder = 'asc'
        } = req.query;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        // Build query
        const query = {};

        if (restaurantId) {
            query.restaurantId = restaurantId;
        } else if (req.user.role === 'manager' && req.assignedRestaurants) {
            query.restaurantId = { $in: req.assignedRestaurants };
        }

        if (category) {
            query.category = category;
        }

        if (status) {
            query.status = status;
        }

        if (isPerishable !== undefined) {
            query.isPerishable = isPerishable === 'true';
        }

        if (search) {
            query.$or = [
                { 'itemName.en': { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        query.isActive = true;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const [items, totalCount] = await Promise.all([
            Inventory.find(query)
                .populate('restaurantId', 'name slug')
                .populate('supplier.supplierId', 'companyName')
                .populate('linkedMenuItems.menuId', 'name price')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Inventory.countDocuments(query)
        ]);

        return ResponseHelper.success(res, 200, 'Inventory items retrieved successfully', {
            items,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Get all inventory items error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve inventory items');
    }
};

/**
 * Get Single Inventory Item
 * GET /api/inventory/:id
 */
const getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id)
            .populate('restaurantId', 'name slug address currency')
            .populate('supplier.supplierId', 'companyName contactPerson')
            .populate('linkedMenuItems.menuId', 'name price images')
            .populate('stockHistory.updatedBy', 'fullName');

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Check manager access
        if (req.user.role === 'manager' && req.assignedRestaurants) {
            if (!req.assignedRestaurants.includes(item.restaurantId._id.toString())) {
                return ResponseHelper.forbidden(res, 'You do not have access to this inventory item');
            }
        }

        return ResponseHelper.success(res, 200, 'Inventory item retrieved successfully', {
            item
        });

    } catch (error) {
        logger.error('Get inventory item by ID error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve inventory item');
    }
};

/**
 * Update Inventory Item
 * PUT /api/inventory/:id
 */
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Check manager access
        if (req.user.role === 'manager' && req.assignedRestaurants) {
            if (!req.assignedRestaurants.includes(item.restaurantId.toString())) {
                return ResponseHelper.forbidden(res, 'You do not have access to this inventory item');
            }
        }

        // Update allowed fields
        const allowedFields = [
            'itemName',
            'category',
            'unit',
            'minimumStock',
            'maximumStock',
            'reorderPoint',
            'reorderQuantity',
            'unitPrice',
            'supplier',
            'storageLocation',
            'storageConditions',
            'isPerishable',
            'shelfLife',
            'expiryDate',
            'barcode',
            'description',
            'notes',
            'isActive',
            'isAutoDeductEnabled'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
                    item[field] = { ...item[field], ...updateData[field] };
                } else {
                    item[field] = updateData[field];
                }
            }
        });

        await item.save();

        logger.info(`Inventory item updated: ${item._id} by ${req.user.role}: ${req.user.id}`);

        return ResponseHelper.success(res, 200, 'Inventory item updated successfully', {
            item
        });

    } catch (error) {
        logger.error('Update inventory item error:', error);
        return ResponseHelper.error(res, 500, 'Failed to update inventory item');
    }
};

/**
 * Delete Inventory Item (Soft Delete)
 * DELETE /api/inventory/:id
 */
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Check manager access
        if (req.user.role === 'manager' && req.assignedRestaurants) {
            if (!req.assignedRestaurants.includes(item.restaurantId.toString())) {
                return ResponseHelper.forbidden(res, 'You do not have access to this inventory item');
            }
        }

        // Check if linked to any menu items
        if (item.linkedMenuItems && item.linkedMenuItems.length > 0) {
            return ResponseHelper.error(res, 400, 'Cannot delete inventory item that is linked to menu items. Please unlink first.');
        }

        // Soft delete
        item.isActive = false;
        item.status = 'discontinued';
        await item.save();

        logger.warn(`Inventory item deleted: ${item._id} by ${req.user.role}: ${req.user.id}`);

        return ResponseHelper.success(res, 200, 'Inventory item deleted successfully');

    } catch (error) {
        logger.error('Delete inventory item error:', error);
        return ResponseHelper.error(res, 500, 'Failed to delete inventory item');
    }
};

/**
 * Get Inventory Statistics
 * GET /api/inventory/stats
 */
const getInventoryStats = async (req, res) => {
    try {
        const { restaurantId } = req.query;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const query = { isActive: true };

        if (restaurantId) {
            query.restaurantId = restaurantId;
        } else if (req.user.role === 'manager' && req.assignedRestaurants) {
            query.restaurantId = { $in: req.assignedRestaurants };
        }

        const [
            totalItems,
            inStockItems,
            lowStockItems,
            outOfStockItems,
            totalValue,
            itemsByCategory,
            perishableItems,
            expiringItems
        ] = await Promise.all([
            Inventory.countDocuments(query),
            Inventory.countDocuments({ ...query, status: 'in-stock' }),
            Inventory.countDocuments({ ...query, status: 'low-stock' }),
            Inventory.countDocuments({ ...query, status: 'out-of-stock' }),
            Inventory.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalValue: {
                            $sum: { $multiply: ['$currentStock', '$unitPrice'] }
                        }
                    }
                }
            ]),
            Inventory.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        totalValue: {
                            $sum: { $multiply: ['$currentStock', '$unitPrice'] }
                        }
                    }
                }
            ]),
            Inventory.countDocuments({ ...query, isPerishable: true }),
            Inventory.getExpiringItems(restaurantId, 7).then(items => items.length)
        ]);

        return ResponseHelper.success(res, 200, 'Inventory statistics retrieved successfully', {
            stats: {
                total: totalItems,
                inStock: inStockItems,
                lowStock: lowStockItems,
                outOfStock: outOfStockItems,
                totalValue: totalValue[0]?.totalValue || 0,
                byCategory: itemsByCategory.map(cat => ({
                    category: cat._id,
                    count: cat.count,
                    value: cat.totalValue
                })),
                perishableCount: perishableItems,
                expiringCount: expiringItems
            }
        });

    } catch (error) {
        logger.error('Get inventory stats error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve inventory statistics');
    }
};

/**
 * Get Low Stock Items
 * GET /api/inventory/low-stock
 */
const getLowStockItems = async (req, res) => {
    try {
        const { restaurantId } = req.query;

        if (!restaurantId) {
            return ResponseHelper.error(res, 400, 'Restaurant ID is required');
        }

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const lowStockItems = await Inventory.getLowStockItems(restaurantId);

        return ResponseHelper.success(res, 200, 'Low stock items retrieved successfully', {
            items: lowStockItems,
            total: lowStockItems.length
        });

    } catch (error) {
        logger.error('Get low stock items error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve low stock items');
    }
};

/**
 * Get Reorder List
 * GET /api/inventory/reorder-list
 */
const getReorderList = async (req, res) => {
    try {
        const { restaurantId } = req.query;

        if (!restaurantId) {
            return ResponseHelper.error(res, 400, 'Restaurant ID is required');
        }

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const reorderItems = await Inventory.getReorderList(restaurantId);

        return ResponseHelper.success(res, 200, 'Reorder list retrieved successfully', {
            items: reorderItems.map(item => ({
                id: item._id,
                itemName: item.itemName.en,
                currentStock: item.currentStock,
                reorderPoint: item.reorderPoint,
                reorderQuantity: item.reorderQuantity,
                unit: item.unit,
                supplier: item.supplier,
                unitPrice: item.unitPrice
            })),
            total: reorderItems.length
        });

    } catch (error) {
        logger.error('Get reorder list error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve reorder list');
    }
};

/**
 * Get Expiring Items
 * GET /api/inventory/expiring
 */
const getExpiringItems = async (req, res) => {
    try {
        const { restaurantId, days = 7 } = req.query;

        if (!restaurantId) {
            return ResponseHelper.error(res, 400, 'Restaurant ID is required');
        }

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const expiringItems = await Inventory.getExpiringItems(restaurantId, parseInt(days));

        return ResponseHelper.success(res, 200, 'Expiring items retrieved successfully', {
            items: expiringItems.map(item => ({
                id: item._id,
                itemName: item.itemName.en,
                currentStock: item.currentStock,
                unit: item.unit,
                expiryDate: item.expiryDate,
                daysUntilExpiry: item.daysUntilExpiry,
                stockValue: item.stockValue
            })),
            total: expiringItems.length
        });

    } catch (error) {
        logger.error('Get expiring items error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve expiring items');
    }
};



/**
 * Restock Inventory Item
 * POST /api/inventory/:id/restock
 */
const restockInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, invoice, batchNumber, expiryDate, unitPrice, notes } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Check manager access
        if (req.user.role === 'manager' && req.assignedRestaurants) {
            if (!req.assignedRestaurants.includes(item.restaurantId.toString())) {
                return ResponseHelper.forbidden(res, 'You do not have access to this inventory item');
            }
        }

        // Add stock
        await item.addStock(quantity, {
            reason,
            invoice,
            batchNumber,
            expiryDate,
            unitPrice,
            notes,
            updatedBy: req.user.id,
            updatedByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
        });

        logger.info(`Stock added: ${quantity}${item.unit} to ${item.itemName.en} by ${req.user.role}: ${req.user.id}`);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`restaurant:${item.restaurantId}`).emit('inventory:updated', {
            inventoryId: item._id,
            itemName: item.itemName.en,
            currentStock: item.currentStock,
            status: item.status
        });

        return ResponseHelper.success(res, 200, 'Stock added successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                previousStock: item.stockHistory[item.stockHistory.length - 1].previousStock,
                currentStock: item.currentStock,
                status: item.status
            }
        });

    } catch (error) {
        logger.error('Restock inventory error:', error);
        return ResponseHelper.error(res, 500, error.message || 'Failed to restock inventory');
    }
};

/**
 * Deduct Stock Manually
 * POST /api/inventory/:id/deduct
 */
const deductInventoryStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, orderId, menuId, notes } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Deduct stock
        await item.deductStock(quantity, {
            reason,
            orderId,
            menuId,
            notes,
            updatedBy: req.user.id,
            updatedByModel: req.user.role === 'manager' ? 'Manager' : 'Employee'
        });

        logger.info(`Stock deducted: ${quantity}${item.unit} from ${item.itemName.en}`);

        // Emit real-time update
        const io = req.app.get('io');
        io.to(`restaurant:${item.restaurantId}`).emit('inventory:updated', {
            inventoryId: item._id,
            itemName: item.itemName.en,
            currentStock: item.currentStock,
            status: item.status
        });

        return ResponseHelper.success(res, 200, 'Stock deducted successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                currentStock: item.currentStock,
                status: item.status
            }
        });

    } catch (error) {
        logger.error('Deduct inventory stock error:', error);
        return ResponseHelper.error(res, 500, error.message || 'Failed to deduct stock');
    }
};

/**
 * Record Wastage
 * POST /api/inventory/:id/wastage
 */
const recordWastage = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Record wastage
        await item.recordWastage(
            quantity,
            reason,
            req.user.id,
            req.user.role === 'manager' ? 'Manager' : 'Employee'
        );

        logger.warn(`Wastage recorded: ${quantity}${item.unit} of ${item.itemName.en} - Reason: ${reason}`);

        return ResponseHelper.success(res, 200, 'Wastage recorded successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                wastedQuantity: quantity,
                currentStock: item.currentStock,
                wastageValue: quantity * item.unitPrice
            }
        });

    } catch (error) {
        logger.error('Record wastage error:', error);
        return ResponseHelper.error(res, 500, error.message || 'Failed to record wastage');
    }
};

/**
 * Adjust Stock (Manual Correction)
 * POST /api/inventory/:id/adjust
 */
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { newQuantity, reason } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Only managers/owners can adjust
        if (req.user.role === 'employee') {
            return ResponseHelper.forbidden(res, 'Employees cannot adjust stock levels');
        }

        const previousStock = item.currentStock;

        // Adjust stock
        await item.adjustStock(
            newQuantity,
            reason,
            req.user.id,
            req.user.role === 'manager' ? 'Manager' : 'Owner'
        );

        logger.info(`Stock adjusted: ${item.itemName.en} from ${previousStock} to ${newQuantity} by ${req.user.role}: ${req.user.id}`);

        return ResponseHelper.success(res, 200, 'Stock adjusted successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                previousStock,
                currentStock: item.currentStock,
                difference: newQuantity - previousStock,
                reason
            }
        });

    } catch (error) {
        logger.error('Adjust stock error:', error);
        return ResponseHelper.error(res, 500, error.message || 'Failed to adjust stock');
    }
};

/**
 * Link Menu Item to Inventory
 * POST /api/inventory/:id/link-menu
 */
const linkMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { menuId, quantityRequired, unit } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;
        const Menu = models.Menu;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Verify menu item exists
        const menuItem = await Menu.findById(menuId);
        if (!menuItem) {
            return ResponseHelper.notFound(res, 'Menu item not found');
        }

        // Check if already linked
        const existingLink = item.linkedMenuItems.find(
            link => link.menuId.toString() === menuId
        );

        if (existingLink) {
            return ResponseHelper.error(res, 400, 'Menu item is already linked to this inventory item');
        }

        // Add link
        item.linkedMenuItems.push({
            menuId,
            quantityRequired,
            unit
        });

        await item.save();

        logger.info(`Menu item ${menuItem.name.en} linked to inventory ${item.itemName.en}`);

        return ResponseHelper.success(res, 200, 'Menu item linked successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                linkedMenuItems: item.linkedMenuItems
            }
        });

    } catch (error) {
        logger.error('Link menu item error:', error);
        return ResponseHelper.error(res, 500, 'Failed to link menu item');
    }
};

/**
 * Unlink Menu Item from Inventory
 * DELETE /api/inventory/:id/unlink-menu/:menuId
 */
const unlinkMenuItem = async (req, res) => {
    try {
        const { id, menuId } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id);

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Remove link
        item.linkedMenuItems = item.linkedMenuItems.filter(
            link => link.menuId.toString() !== menuId
        );

        await item.save();

        logger.info(`Menu item ${menuId} unlinked from inventory ${item.itemName.en}`);

        return ResponseHelper.success(res, 200, 'Menu item unlinked successfully');

    } catch (error) {
        logger.error('Unlink menu item error:', error);
        return ResponseHelper.error(res, 500, 'Failed to unlink menu item');
    }
};

/**
 * Auto-Deduct Stock on Order
 * Called internally when order is placed
 */
const autoDeductOnOrder = async (order, ownerId) => {
    try {
        const models = getOwnerModels(ownerId);
        const Inventory = models.Inventory;
        const Menu = models.Menu;

        // Process each order item
        for (const orderItem of order.items) {
            // Get menu item with linked inventory
            const menuItem = await Menu.findById(orderItem.menuId)
                .populate('linkedInventoryItems.inventoryId');

            if (!menuItem || !menuItem.linkedInventoryItems || menuItem.linkedInventoryItems.length === 0) {
                continue; // Skip if no inventory linked
            }

            // Deduct stock for each linked inventory item
            for (const link of menuItem.linkedInventoryItems) {
                const inventoryItem = await Inventory.findById(link.inventoryId);

                if (!inventoryItem || !inventoryItem.isAutoDeductEnabled) {
                    continue;
                }

                const totalQuantityNeeded = link.quantityRequired * orderItem.quantity;

                try {
                    await inventoryItem.deductStock(totalQuantityNeeded, {
                        reason: 'Auto-deduct from order',
                        orderId: order._id,
                        menuId: orderItem.menuId,
                        updatedBy: order.createdBy,
                        updatedByModel: order.createdByModel
                    });

                    logger.info(`Auto-deducted ${totalQuantityNeeded}${inventoryItem.unit} of ${inventoryItem.itemName.en} for order ${order.orderNumber}`);
                } catch (error) {
                    logger.error(`Failed to auto-deduct ${inventoryItem.itemName.en}:`, error.message);
                    // Don't fail the order, just log the error
                }
            }
        }

    } catch (error) {
        logger.error('Auto-deduct on order error:', error);
        // Don't fail the order
    }
};

/**
 * Bulk Update Stock
 * POST /api/inventory/bulk-update
 */
const bulkUpdateStock = async (req, res) => {
    try {
        const { items } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const results = {
            success: [],
            failed: []
        };

        for (const updateItem of items) {
            try {
                const item = await Inventory.findById(updateItem.inventoryId);

                if (!item) {
                    results.failed.push({
                        inventoryId: updateItem.inventoryId,
                        error: 'Item not found'
                    });
                    continue;
                }

                switch (updateItem.type) {
                    case 'add':
                        await item.addStock(updateItem.quantity, {
                            reason: updateItem.reason || 'Bulk restock',
                            updatedBy: req.user.id,
                            updatedByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
                        });
                        break;

                    case 'deduct':
                        await item.deductStock(updateItem.quantity, {
                            reason: updateItem.reason || 'Bulk deduction',
                            updatedBy: req.user.id,
                            updatedByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
                        });
                        break;

                    case 'adjust':
                        await item.adjustStock(
                            updateItem.quantity,
                            updateItem.reason || 'Bulk adjustment',
                            req.user.id,
                            req.user.role === 'manager' ? 'Manager' : 'Owner'
                        );
                        break;

                    default:
                        results.failed.push({
                            inventoryId: updateItem.inventoryId,
                            error: 'Invalid update type'
                        });
                        continue;
                }

                results.success.push({
                    inventoryId: item._id,
                    itemName: item.itemName.en,
                    newStock: item.currentStock
                });

            } catch (error) {
                results.failed.push({
                    inventoryId: updateItem.inventoryId,
                    error: error.message
                });
            }
        }

        logger.info(`Bulk stock update: ${results.success.length} succeeded, ${results.failed.length} failed`);

        return ResponseHelper.success(res, 200, 'Bulk update completed', {
            results
        });

    } catch (error) {
        logger.error('Bulk update stock error:', error);
        return ResponseHelper.error(res, 500, 'Failed to perform bulk update');
    }
};

/**
 * Get Stock Movement Report
 * GET /api/inventory/:id/movement
 */
const getStockMovement = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, type } = req.query;

        const models = getOwnerModels(req.ownerId);
        const Inventory = models.Inventory;

        const item = await Inventory.findById(id)
            .populate('stockHistory.updatedBy', 'fullName');

        if (!item) {
            return ResponseHelper.notFound(res, 'Inventory item not found');
        }

        // Filter stock history
        let history = item.stockHistory;

        if (startDate || endDate) {
            history = history.filter(entry => {
                const entryDate = new Date(entry.timestamp);
                if (startDate && entryDate < new Date(startDate)) return false;
                if (endDate && entryDate > new Date(endDate)) return false;
                return true;
            });
        }

        if (type) {
            history = history.filter(entry => entry.type === type);
        }

        // Calculate summary
        const summary = {
            totalAdded: 0,
            totalDeducted: 0,
            totalWastage: 0,
            netChange: 0
        };

        history.forEach(entry => {
            if (entry.type === 'restock') {
                summary.totalAdded += entry.quantity;
            } else if (entry.type === 'deduction') {
                summary.totalDeducted += Math.abs(entry.quantity);
            } else if (entry.type === 'wastage') {
                summary.totalWastage += Math.abs(entry.quantity);
            }
        });

        summary.netChange = summary.totalAdded - summary.totalDeducted - summary.totalWastage;

        return ResponseHelper.success(res, 200, 'Stock movement retrieved successfully', {
            item: {
                id: item._id,
                itemName: item.itemName.en,
                currentStock: item.currentStock
            },
            history: history.reverse(), // Most recent first
            summary
        });

    } catch (error) {
        logger.error('Get stock movement error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve stock movement');
    }
};




module.exports = {
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
    autoDeductOnOrder,
    bulkUpdateStock,
    getStockMovement
};