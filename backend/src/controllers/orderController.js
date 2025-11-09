const { getOwnerModel } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Create Order
 */
const createOrder = async (req, res) => {
  try {
    const payload = req.body;

    // Determine ownerId (from auth or payload)
    const ownerId = req.ownerId || payload.ownerId;
    if (!ownerId) return ResponseHelper.error(res, 400, 'ownerId is required');

    const Order = getOwnerModel(ownerId, 'Order');
    const Menu = getOwnerModel(ownerId, 'Menu');
    const Inventory = getOwnerModel(ownerId, 'Inventory');
    const Restaurant = getOwnerModel(ownerId, 'Restaurant');

    // Basic validation already done by validator middleware

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(payload.restaurantId);
    if (!restaurant) return ResponseHelper.notFound(res, 'Restaurant not found');

    // Validate menu items and compute totals (ensure items reference existing menus)
    for (const item of payload.items) {
      const menuItem = await Menu.findById(item.menuId);
      if (!menuItem) return ResponseHelper.notFound(res, `Menu item not found: ${item.menuId}`);

      // Check availability for branch
      if (!menuItem.isAvailableAt(payload.restaurantId)) {
        return ResponseHelper.forbidden(res, `Item not available at this restaurant: ${menuItem.name?.en || menuItem._id}`);
      }
    }

    // Inventory deduction (synchronous simple approach)
    for (const item of payload.items) {
      const menuItem = await Menu.findById(item.menuId).lean();
      if (menuItem.linkedInventoryItems && menuItem.linkedInventoryItems.length) {
        for (const link of menuItem.linkedInventoryItems) {
          const inv = await Inventory.findById(link.inventoryId).select('+currentStock');
          const requiredQty = (link.quantityRequired || 0) * item.quantity;
          if (!inv || typeof inv.currentStock !== 'number' || inv.currentStock < requiredQty) {
            return ResponseHelper.error(res, 409, `Insufficient inventory for ${menuItem.name?.en || item.menuId}`);
          }
        }
      }
    }

    // Deduct inventory after verifying all items
    for (const item of payload.items) {
      const menuItem = await Menu.findById(item.menuId).lean();
      if (menuItem.linkedInventoryItems && menuItem.linkedInventoryItems.length) {
        for (const link of menuItem.linkedInventoryItems) {
          const inv = await Inventory.findById(link.inventoryId).select('+currentStock');
          const requiredQty = (link.quantityRequired || 0) * item.quantity;
          inv.currentStock = inv.currentStock - requiredQty;
          await inv.save();
        }
      }
    }

    // Create order
    const order = await Order.create(payload);

    // Emit socket event if io is available
    try {
      const io = req.app && req.app.get('io');
      if (io) {
        io.to(`restaurant:${payload.restaurantId}`).emit('order:new', { orderId: order._id, orderNumber: order.orderNumber, status: order.status });
      }
    } catch (err) {
      logger.warn('Socket emit failed for new order', err.message);
    }

    return ResponseHelper.created(res, 'Order created successfully', { order });
  } catch (error) {
    logger.error('Create order error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create order');
  }
};

/**
 * List Orders
 */
const listOrders = async (req, res) => {
  try {
    const ownerId = req.ownerId || req.query.ownerId || req.body.ownerId;
    if (!ownerId) return ResponseHelper.error(res, 400, 'ownerId is required');

    const Order = getOwnerModel(ownerId, 'Order');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);

    return ResponseHelper.paginated(res, orders, page, limit, total);
  } catch (error) {
    logger.error('List orders error:', error);
    return ResponseHelper.error(res, 500, 'Failed to list orders');
  }
};

/**
 * Get single Order
 */
const getOrder = async (req, res) => {
  try {
    const ownerId = req.ownerId || req.query.ownerId || req.body.ownerId;
    if (!ownerId) return ResponseHelper.error(res, 400, 'ownerId is required');

    const Order = getOwnerModel(ownerId, 'Order');
    const order = await Order.findById(req.params.id).lean();
    if (!order) return ResponseHelper.notFound(res, 'Order not found');
    return ResponseHelper.success(res, 200, 'Order retrieved', { order });
  } catch (error) {
    logger.error('Get order error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve order');
  }
};

/**
 * Update Order Status
 */
const updateStatus = async (req, res) => {
  try {
    const ownerId = req.ownerId || req.body.ownerId || req.query.ownerId;
    if (!ownerId) return ResponseHelper.error(res, 400, 'ownerId is required');

    const Order = getOwnerModel(ownerId, 'Order');
    const order = await Order.findById(req.params.id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');

    const { status, note } = req.body;
    await order.updateStatus(status, req.user?.id || 'system', note);

    // Emit socket
    try {
      const io = req.app && req.app.get('io');
      if (io) io.to(`restaurant:${order.restaurantId}`).emit('order:statusUpdate', { orderId: order._id, status });
    } catch (err) {
      logger.warn('Socket emit failed for order status update', err.message);
    }

    return ResponseHelper.success(res, 200, 'Order status updated', { order });
  } catch (error) {
    logger.error('Update order status error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update order status');
  }
};

/**
 * Cancel Order
 */
const cancelOrder = async (req, res) => {
  try {
    const ownerId = req.ownerId || req.body.ownerId || req.query.ownerId;
    if (!ownerId) return ResponseHelper.error(res, 400, 'ownerId is required');

    const Order = getOwnerModel(ownerId, 'Order');
    const order = await Order.findById(req.params.id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');

    const { reason } = req.body;
    await order.updateStatus('cancelled', req.user?.id || 'system', reason || 'Cancelled by user');

    // If payment was marked paid, mark refund details (note: real gateway refund must be processed separately)
    if (order.payment && order.payment.status === 'paid') {
      order.payment.status = 'refunded';
      order.payment.refundDetails = {
        amount: order.pricing.total,
        reason: reason || 'Cancelled order',
        refundedAt: new Date(),
        refundTransactionId: null
      };
      await order.save();
    }

    return ResponseHelper.success(res, 200, 'Order cancelled', { order });
  } catch (error) {
    logger.error('Cancel order error:', error);
    return ResponseHelper.error(res, 500, 'Failed to cancel order');
  }
};

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateStatus,
  cancelOrder
};
