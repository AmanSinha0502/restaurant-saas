// ============================================
// POS CONTROLLER
// ============================================
// Save as: backend/src/controllers/posController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Create POS Order
 * POST /api/pos/orders
 */
const createPOSOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      customer,
      orderType,
      items,
      tableId,
      payment,
      discount,
      notes
    } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    const Restaurant = models.Restaurant;
    const Menu = models.Menu;
    const Table = models.Table;
    
    // Verify restaurant access
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(restaurantId)) {
        return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
      }
    }
    
    // Get restaurant details
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Fetch menu items with full details
    const menuIds = items.map(item => item.menuId);
    const menuItems = await Menu.find({
      _id: { $in: menuIds },
      restaurantId,
      isActive: true
    });
    
    if (menuItems.length !== items.length) {
      return ResponseHelper.error(res, 400, 'Some menu items are invalid');
    }
    
    // Calculate pricing
    let subtotal = 0;
    const orderItems = [];
    
    for (let item of items) {
      const menuItem = menuItems.find(m => m._id.toString() === item.menuId);
      const itemSubtotal = menuItem.price * item.quantity;
      subtotal += itemSubtotal;
      
      orderItems.push({
        menuId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: itemSubtotal
      });
    }
    
    // Apply manual discount (manager override)
    let discountAmount = 0;
    if (discount) {
      if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }
    }
    
    // Calculate tax
    const taxRate = restaurant.taxSettings.taxRate || 5;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    
    // Calculate total
    const total = taxableAmount + taxAmount;
    
    // Verify table if dine-in
    let tableDetails = null;
    if (orderType === 'dine-in') {
      const table = await Table.findById(tableId);
      if (!table) {
        return ResponseHelper.notFound(res, 'Table not found');
      }
      
      if (table.status !== 'available') {
        return ResponseHelper.error(res, 400, 'Table is not available');
      }
      
      tableDetails = {
        tableId: table._id,
        tableNumber: table.tableNumber,
        numberOfGuests: 1 // Can be updated later
      };
      
      // Mark table as occupied
      await table.occupy();
    }
    
    // Generate order number
    const orderNumber = await Order.generateOrderNumber(restaurantId);
    
    // Create order
    const order = await Order.create({
      restaurantId,
      orderNumber,
      customer: {
        name: customer.name,
        phone: customer.phone
      },
      orderType,
      orderSource: 'pos',
      items: orderItems,
      pricing: {
        subtotal,
        tax: {
          type: restaurant.taxSettings.taxType,
          rate: taxRate,
          amount: taxAmount
        },
        discount: discount ? {
          couponCode: discount.reason,
          amount: discountAmount
        } : undefined,
        total
      },
      tableDetails,
      payment: {
        method: payment.method,
        status: payment.method === 'cash' ? 'paid' : 'pending' // Cash payments are instant
      },
      notes,
      status: 'confirmed', // POS orders are confirmed immediately
      isPaid: payment.method === 'cash',
      createdBy: req.user.id,
      createdByModel: req.user.role === 'manager' ? 'Manager' : 'Employee'
    });
    
    logger.info(`POS order created: ${order.orderNumber} by ${req.user.role}: ${req.user.id}`);
    
    // If cash payment, record change
    let change = 0;
    if (payment.method === 'cash' && payment.amountReceived) {
      change = payment.amountReceived - total;
    }
    
    // Emit to kitchen display
    const io = req.app.get('io');
    io.to(`kitchen:${restaurantId}`).emit('order:new', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      items: order.items,
      priority: order.priority,
      tableNumber: tableDetails?.tableNumber
    });
    
    return ResponseHelper.created(res, 'Order created successfully', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        items: order.items,
        pricing: order.pricing,
        status: order.status,
        tableNumber: tableDetails?.tableNumber,
        estimatedReadyTime: order.kitchenTimings.estimatedReadyTime
      },
      payment: {
        method: payment.method,
        total: total,
        amountReceived: payment.amountReceived,
        change: change > 0 ? change : 0
      }
    });
    
  } catch (error) {
    logger.error('Create POS order error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create order');
  }
};

/**
 * Get Active Tables with Orders (POS View)
 * GET /api/pos/tables
 */
const getActiveTables = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return ResponseHelper.error(res, 400, 'Restaurant ID is required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    const Order = models.Order;
    
    // Get all tables
    const tables = await Table.find({
      restaurantId,
      isActive: true
    }).sort({ tableNumber: 1 });
    
    // Get active orders for occupied tables
    const occupiedTableIds = tables
      .filter(t => t.status === 'occupied')
      .map(t => t._id);
    
    const activeOrders = await Order.find({
      'tableDetails.tableId': { $in: occupiedTableIds },
      status: { $in: ['confirmed', 'preparing', 'ready'] }
    }).lean();
    
    // Map orders to tables
    const tablesWithOrders = tables.map(table => {
      const order = activeOrders.find(o => 
        o.tableDetails?.tableId?.toString() === table._id.toString()
      );
      
      return {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        order: order ? {
          id: order._id,
          orderNumber: order.orderNumber,
          items: order.items.length,
          total: order.pricing.total,
          status: order.status,
          elapsedTime: Math.floor((new Date() - order.createdAt) / 60000) // minutes
        } : null
      };
    });
    
    return ResponseHelper.success(res, 200, 'Active tables retrieved successfully', {
      tables: tablesWithOrders,
      summary: {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length
      }
    });
    
  } catch (error) {
    logger.error('Get active tables error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve tables');
  }
};

/**
 * Get POS Menu (Optimized for quick ordering)
 * GET /api/pos/menu
 */
const getPOSMenu = async (req, res) => {
  try {
    const { restaurantId, category } = req.query;
    
    if (!restaurantId) {
      return ResponseHelper.error(res, 400, 'Restaurant ID is required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Menu = models.Menu;
    
    const query = {
      restaurantId,
      isActive: true,
      [`availabilityByBranch.${restaurantId}.isAvailable`]: { $ne: false }
    };
    
    if (category) {
      query.category = category;
    }
    
    const menuItems = await Menu.find(query)
      .select('name price category dietaryType images preparationTime')
      .sort({ category: 1, name: 1 })
      .lean();
    
    // Group by category for easier navigation
    const groupedMenu = {};
    menuItems.forEach(item => {
      if (!groupedMenu[item.category]) {
        groupedMenu[item.category] = [];
      }
      groupedMenu[item.category].push(item);
    });
    
    return ResponseHelper.success(res, 200, 'POS menu retrieved successfully', {
      menu: groupedMenu,
      totalItems: menuItems.length,
      categories: Object.keys(groupedMenu)
    });
    
  } catch (error) {
    logger.error('Get POS menu error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve menu');
  }
};

/**
 * Split Bill (For group orders)
 * POST /api/pos/orders/:id/split-bill
 */
const splitBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { numberOfSplits } = req.body;
    
    if (!numberOfSplits || numberOfSplits < 2 || numberOfSplits > 10) {
      return ResponseHelper.error(res, 400, 'Number of splits must be between 2 and 10');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    if (order.status !== 'ready' && order.status !== 'completed') {
      return ResponseHelper.error(res, 400, 'Can only split bill for ready/completed orders');
    }
    
    // Calculate split amounts
    const totalAmount = order.pricing.total;
    const splitAmount = totalAmount / numberOfSplits;
    
    const splits = [];
    for (let i = 1; i <= numberOfSplits; i++) {
      splits.push({
        splitNumber: i,
        amount: Math.round(splitAmount * 100) / 100,
        paid: false
      });
    }
    
    return ResponseHelper.success(res, 200, 'Bill split calculated successfully', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        totalAmount,
        numberOfSplits,
        amountPerPerson: splitAmount,
        splits
      }
    });
    
  } catch (error) {
    logger.error('Split bill error:', error);
    return ResponseHelper.error(res, 500, 'Failed to split bill');
  }
};

/**
 * Print Receipt
 * GET /api/pos/orders/:id/receipt
 */
const printReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id)
      .populate('restaurantId', 'name address phone taxSettings')
      .populate('items.menuId', 'name');
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    // Generate receipt data (for thermal printer or PDF)
    const receiptData = {
      restaurant: {
        name: order.restaurantId.name,
        address: order.restaurantId.address,
        phone: order.restaurantId.phone,
        taxNumber: order.restaurantId.taxSettings.taxNumber
      },
      order: {
        orderNumber: order.orderNumber,
        date: order.createdAt,
        type: order.orderType,
        tableNumber: order.tableDetails?.tableNumber
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone
      },
      items: order.items.map(item => ({
        name: item.name.en,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      })),
      pricing: {
        subtotal: order.pricing.subtotal,
        tax: {
          type: order.pricing.tax.type,
          rate: order.pricing.tax.rate,
          amount: order.pricing.tax.amount
        },
        discount: order.pricing.discount.amount,
        total: order.pricing.total
      },
      payment: {
        method: order.payment.method,
        status: order.payment.status
      }
    };
    
    // TODO: Generate PDF using pdfService
    // For now, return receipt data
    
    return ResponseHelper.success(res, 200, 'Receipt generated successfully', {
      receipt: receiptData
    });
    
  } catch (error) {
    logger.error('Print receipt error:', error);
    return ResponseHelper.error(res, 500, 'Failed to generate receipt');
  }
};

/**
 * Record Cash Payment (For COD/Cash at counter)
 * POST /api/pos/orders/:id/cash-payment
 */
const recordCashPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountReceived } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    
    const order = await Order.findById(id);
    
    if (!order) {
      return ResponseHelper.notFound(res, 'Order not found');
    }
    
    if (order.payment.status === 'paid') {
      return ResponseHelper.error(res, 400, 'Order is already paid');
    }
    
    const total = order.pricing.total;
    
    if (amountReceived < total) {
      return ResponseHelper.error(res, 400, 'Insufficient amount received');
    }
    
    // Mark as paid
    await order.markAsPaid({
      transactionId: `CASH-${Date.now()}`,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      razorpaySignature: null
    });
    
    const change = amountReceived - total;
    
    logger.info(`Cash payment recorded for order ${order.orderNumber}`);
    
    return ResponseHelper.success(res, 200, 'Payment recorded successfully', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total,
        amountReceived,
        change,
        paymentStatus: order.payment.status
      }
    });
    
  } catch (error) {
    logger.error('Record cash payment error:', error);
    return ResponseHelper.error(res, 500, 'Failed to record payment');
  }
};

module.exports = {
  createPOSOrder,
  getActiveTables,
  getPOSMenu,
  splitBill,
  printReceipt,
  recordCashPayment
};