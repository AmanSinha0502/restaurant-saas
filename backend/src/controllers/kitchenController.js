// ============================================
// KITCHEN DISPLAY SYSTEM (KDS) CONTROLLER
// ============================================
// Save as: backend/src/controllers/kitchenController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Get Active Kitchen Orders
 * GET /api/kitchen/orders
 */
const getKitchenOrders = async (req, res) => {
  try {
    const { restaurantId, status } = req.query;
    
    if (!restaurantId) {
      return ResponseHelper.error(res, 400, 'Restaurant ID is required');
    }
    
    // Check staff access
    if (req.user.role === 'employee') {
      const models = getOwnerModels(req.ownerId);
      const Employee = models.Employee;
      
      const employee = await Employee.findById(req.user.id);
      if (employee.restaurantId.toString() !== restaurantId) {
        return ResponseHelper.forbidden(res, 'You do not have access to this kitchen');
      }
    }
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    // Build query for active orders
    const query = {
      restaurantId,
      status: status || { $in: ['confirmed', 'preparing', 'ready'] },
      payment: {
        status: 'paid' // Only show paid orders in kitchen
      }
    };
    
    // Fetch orders with priority sorting
    const orders = await Order.find(query)
      .select('orderNumber orderType orderSource items tableDetails priority status kitchenTimings createdAt')
      .populate('tableDetails.tableId', 'tableNumber')
      .sort({
        priority: 1, // 1=Dine-in (highest), 2=Takeaway, 3=Delivery
        createdAt: 1  // Oldest first
      })
      .lean();
    
    // Calculate elapsed time and format for KDS
    const kdsOrders = orders.map(order => {
      const elapsedMinutes = Math.floor((new Date() - order.createdAt) / 60000);
      const isAging = elapsedMinutes > 30;
      
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        orderSource: order.orderSource,
        tableNumber: order.tableDetails?.tableId?.tableNumber || null,
        items: order.items.map(item => ({
          name: item.name.en,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })),
        priority: order.priority,
        priorityLabel: order.priority === 1 ? 'Dine-In' : order.priority === 2 ? 'Takeaway' : 'Delivery',
        status: order.status,
        elapsedTime: elapsedMinutes,
        isAging,
        startedAt: order.kitchenTimings.startedAt,
        estimatedReadyTime: order.kitchenTimings.estimatedReadyTime,
        createdAt: order.createdAt
      };
    });
    
    // Separate by status for KDS lanes
    const grouped = {
      new: kdsOrders.filter(o => o.status === 'confirmed'),
      preparing: kdsOrders.filter(o => o.status === 'preparing'),
      ready: kdsOrders.filter(o => o.status === 'ready')
    };
    
    return ResponseHelper.success(res, 200, 'Kitchen orders retrieved successfully', {
      orders: grouped,
      summary: {
        total: kdsOrders.length,
        new: grouped.new.length,
        preparing: grouped.preparing.length,
        ready: grouped.ready.length,
        aging: kdsOrders.filter(o => o.isAging).length
      }
    });
    
  } catch (error) {
    logger.error('Get kitchen orders error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve kitchen orders');
  }
};

/**
 * Start Preparing Order (From "New" to "Preparing")
 * PATCH /api/kitchen/orders/:id/start
 */
const startPreparingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    if (order.status !== 'confirmed') {
      return ResponseHelper.error(res, 400, 'Order must be in confirmed status to start preparing');
    }
    
    // Update status to preparing
    await order.updateStatus('preparing', req.user.id, req.user.role, 'Kitchen started preparing');
    
    logger.info(`Kitchen started preparing order ${order.orderNumber}`);
    
    // Emit real-time update
    const io = req.app.get('io');
    
    // Update admin dashboard
    io.to(`restaurant:${order.restaurantId}`).emit('order:statusUpdated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'preparing'
    });
    
    // Update customer tracking
    if (order.customer.userId) {
      io.to(`customer:${order.customer.userId}`).emit('order:statusUpdated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'preparing',
        message: 'Your order is being prepared'
      });
    }
    
    // Update KDS for other kitchen staff
    io.to(`kitchen:${order.restaurantId}`).emit('order:statusChanged', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'preparing'
    });
    
    return ResponseHelper.success(res, 200, 'Order started preparing', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        startedAt: order.kitchenTimings.startedAt,
        estimatedReadyTime: order.kitchenTimings.estimatedReadyTime
      }
    });
    
  } catch (error) {
    logger.error('Start preparing order error:', error);
    return ResponseHelper.error(res, 500, error.message || 'Failed to start preparing order');
  }
};

/**
 * Mark Order as Ready
 * PATCH /api/kitchen/orders/:id/ready
 */
const markOrderReady = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    if (order.status !== 'preparing') {
      return ResponseHelper.error(res, 400, 'Order must be in preparing status to mark as ready');
    }
    
    // Update status to ready
    await order.updateStatus('ready', req.user.id, req.user.role, 'Order ready for pickup/delivery');
    
    logger.info(`Order ${order.orderNumber} marked as ready`);
    
    // Emit real-time updates
    const io = req.app.get('io');
    
    // Update admin dashboard
    io.to(`restaurant:${order.restaurantId}`).emit('order:statusUpdated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'ready'
    });
    
    // Update customer tracking
    if (order.customer.userId) {
      io.to(`customer:${order.customer.userId}`).emit('order:statusUpdated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'ready',
        message: order.orderType === 'dine-in' 
          ? 'Your order is ready to be served'
          : order.orderType === 'takeaway'
          ? 'Your order is ready for pickup'
          : 'Your order is ready for delivery'
      });
    }
    
    // If delivery, notify delivery boy
    if (order.orderType === 'delivery' && order.deliveryDetails?.deliveryBoyId) {
      io.to(`deliveryBoy:${order.deliveryDetails.deliveryBoyId}`).emit('delivery:orderReady', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: 'Order is ready for pickup'
      });
    }
    
    // Update KDS
    io.to(`kitchen:${order.restaurantId}`).emit('order:statusChanged', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'ready'
    });
    
    // Play alert sound for POS staff
    io.to(`pos:${order.restaurantId}`).emit('order:ready', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableDetails?.tableNumber
    });
    
    // TODO: Send SMS/WhatsApp notification to customer
    
    return ResponseHelper.success(res, 200, 'Order marked as ready', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        completedAt: order.kitchenTimings.completedAt,
        preparationTime: order.kitchenTimings.preparationTime
      }
    });
    
  } catch (error) {
    logger.error('Mark order ready error:', error);
    return ResponseHelper.error(res, 500, error.message || 'Failed to mark order as ready');
  }
};

/**
 * Toggle Menu Item Availability (Quick Out of Stock)
 * PATCH /api/kitchen/menu/:id/toggle-availability
 */
const toggleMenuAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantId, isAvailable } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const menuItem = await Menu.findById(id);
    
    if (!menuItem) {
      return ResponseHelper.notFound(res, 'Menu item not found');
    }
    
    // Update availability for specific branch
    if (!menuItem.availabilityByBranch) {
      menuItem.availabilityByBranch = {};
    }
    
    menuItem.availabilityByBranch[restaurantId] = {
      isAvailable,
      lastUpdated: new Date()
    };
    
    await menuItem.save();
    
    logger.info(`Menu item ${menuItem.name.en} availability set to ${isAvailable} at restaurant ${restaurantId}`);
    
    // Emit real-time update to POS and customer website
    const io = req.app.get('io');
    io.to(`restaurant:${restaurantId}`).emit('menu:availabilityChanged', {
      menuId: menuItem._id,
      name: menuItem.name.en,
      isAvailable
    });
    
    return ResponseHelper.success(res, 200, 'Menu item availability updated', {
      menuItem: {
        id: menuItem._id,
        name: menuItem.name.en,
        isAvailable,
        restaurantId
      }
    });
    
  } catch (error) {
    logger.error('Toggle menu availability error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update menu availability');
  }
};

/**
 * Get Kitchen Statistics (For display header)
 * GET /api/kitchen/stats
 */
const getKitchenStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return ResponseHelper.error(res, 400, 'Restaurant ID is required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      newOrders,
      preparingOrders,
      readyOrders,
      completedToday,
      agingOrders,
      averagePrepTime
    ] = await Promise.all([
      Order.countDocuments({
        restaurantId,
        status: 'confirmed',
        'payment.status': 'paid'
      }),
      Order.countDocuments({
        restaurantId,
        status: 'preparing'
      }),
      Order.countDocuments({
        restaurantId,
        status: 'ready'
      }),
      Order.countDocuments({
        restaurantId,
        status: 'completed',
        createdAt: { $gte: today }
      }),
      Order.countDocuments({
        restaurantId,
        status: { $in: ['confirmed', 'preparing'] },
        createdAt: { $lte: new Date(Date.now() - 30 * 60000) } // >30 min old
      }),
      Order.aggregate([
        {
          $match: {
            restaurantId: restaurantId,
            status: 'completed',
            createdAt: { $gte: today },
            'kitchenTimings.preparationTime': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgPrepTime: { $avg: '$kitchenTimings.preparationTime' }
          }
        }
      ])
    ]);
    
    return ResponseHelper.success(res, 200, 'Kitchen statistics retrieved successfully', {
      stats: {
        new: newOrders,
        preparing: preparingOrders,
        ready: readyOrders,
        completedToday,
        aging: agingOrders,
        averagePrepTime: Math.round(averagePrepTime[0]?.avgPrepTime || 0)
      }
    });
    
  } catch (error) {
    logger.error('Get kitchen stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve kitchen statistics');
  }
};

/**
 * Print Kitchen Ticket
 * GET /api/kitchen/orders/:id/ticket
 */
const printKitchenTicket = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id)
      .populate('restaurantId', 'name')
      .populate('tableDetails.tableId', 'tableNumber');
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    // Generate kitchen ticket data (for thermal printer)
    const ticketData = {
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      tableNumber: order.tableDetails?.tableId?.tableNumber,
      priority: order.priority === 1 ? '🔴 DINE-IN' : order.priority === 2 ? '🟡 TAKEAWAY' : '🟢 DELIVERY',
      timestamp: order.createdAt,
      items: order.items.map(item => ({
        name: item.name.en,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions
      }))
    };
    
    // TODO: Send to thermal printer via ESC/POS commands
    
    return ResponseHelper.success(res, 200, 'Kitchen ticket generated', {
      ticket: ticketData
    });
    
  } catch (error) {
    logger.error('Print kitchen ticket error:', error);
    return ResponseHelper.error(res, 500, 'Failed to generate kitchen ticket');
  }
};

module.exports = {
  getKitchenOrders,
  startPreparingOrder,
  markOrderReady,
  toggleMenuAvailability,
  getKitchenStats,
  printKitchenTicket
};