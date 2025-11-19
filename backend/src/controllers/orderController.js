// ============================================
// ORDER CONTROLLER
// ============================================
// File: backend/src/controllers/orderController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');

/**
 * Create Order (Customer Website / POS)
 * POST /api/orders
 */
const createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      customer,
      orderType,
      orderSource = 'website',
      items,
      deliveryDetails,
      tableDetails,
      payment,
      couponCode,
      tip = 0,
      notes
    } = req.body;

    const models = getOwnerModels(req.ownerId);
    const { Order, Restaurant, Menu, Coupon } = models;

    // 1. Verify restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return ResponseHelper.notFound(res, 'Restaurant not found');

    // 2. Validate items
    const menuIds = items.map(i => i.menuId);
    const menuItems = await Menu.find({ _id: { $in: menuIds }, restaurantId, isActive: true });
    if (menuItems.length !== items.length)
      return ResponseHelper.error(res, 400, 'Some menu items are invalid or unavailable');

    // 3. Calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = menuItems.find(m => m._id.toString() === item.menuId);
      if (!menuItem)
        return ResponseHelper.error(res, 400, `Menu item ${item.menuId} not found`);

      if (menuItem.availabilityByBranch?.[restaurantId]?.isAvailable === false)
        return ResponseHelper.error(res, 400, `${menuItem.name.en} is currently unavailable`);

      const itemSubtotal = menuItem.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        menuId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        subtotal: itemSubtotal,
        specialInstructions: item.specialInstructions || '',
        customizations: item.customizations || []
      });
    }

    // 4. Apply coupon
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });
      if (!coupon) return ResponseHelper.error(res, 400, 'Invalid or expired coupon');
      if (subtotal < coupon.minimumOrderValue)
        return ResponseHelper.error(res, 400, `Minimum order value ₹${coupon.minimumOrderValue} required`);

      discountAmount =
        coupon.discountType === 'percentage'
          ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maximumDiscount || Infinity)
          : coupon.discountValue;
      coupon.usageLimit.usedCount += 1;
      await coupon.save();
    }

    // 5. Charges, Tax, Total
    const deliveryCharge = orderType === 'delivery' ? 40 : 0;
    const packagingCharge =
      orderType === 'takeaway' || orderType === 'delivery' ? Math.ceil(subtotal * 0.02) : 0;
    const taxRate = restaurant.taxSettings.taxRate || 5;
    const taxableAmount = subtotal - discountAmount + deliveryCharge + packagingCharge;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount + tip;

    // 6. Generate order number & create
    const orderNumber = await Order.generateOrderNumber(restaurantId);
    const order = await Order.create({
        ownerId: req.ownerId,
      restaurantId,
      orderNumber,
      customer: {
        userId: customer.userId || req.user?.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      },
      orderType,
      orderSource,
      items: orderItems,
      pricing: {
        subtotal,
        tax: { type: restaurant.taxSettings.taxType, rate: taxRate, amount: taxAmount },
        deliveryCharge,
        packagingCharge,
        discount: { couponCode: couponCode?.toUpperCase(), amount: discountAmount },
        tip,
        total
      },
      deliveryDetails: orderType === 'delivery' ? deliveryDetails : undefined,
      tableDetails: orderType === 'dine-in' ? tableDetails : undefined,
      payment: { method: payment.method, status: 'pending' },
      notes,
      status: 'pending',
      createdBy: req.user?.id || 'guest',
      createdByModel: req.user?.role === 'customer' ? 'Customer' : 'Guest'
    });

    // 7. Online payment order
    let paymentData = null;
    if (['razorpay', 'stripe'].includes(payment.method)) {
      const paymentResult = await paymentService.createPaymentOrder(
        payment.method,
        total,
        restaurant.currency,
        orderNumber,
        { name: customer.name, phone: customer.phone, email: customer.email }
      );
      if (!paymentResult.success)
        return ResponseHelper.error(res, 500, 'Failed to create payment order');
      paymentData = paymentResult;
      if (payment.method === 'razorpay')
        order.payment.razorpayOrderId = paymentResult.razorpayOrderId;
      await order.save();
    }

    // 8. Emit event
    const io = req.app.get('io');
    io.to(`kitchen:${req.ownerId}:${restaurantId}`).emit('order:created', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      total: order.pricing.total
    });

    return ResponseHelper.created(res, 'Order created successfully', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        total: order.pricing.total,
        status: order.status,
        paymentMethod: order.payment.method
      },
      paymentData
    });
  } catch (error) {
    logger.error('Create order error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create order');
  }
};

/**
 * Get All Orders
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      restaurantId, status, orderType, orderSource, paymentStatus,
      startDate, endDate, search, page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    const query = {};

    if (restaurantId) query.restaurantId = restaurantId;
    else if (req.user.role === 'manager' && req.assignedRestaurants)
      query.restaurantId = { $in: req.assignedRestaurants };

    if (status) query.status = status;
    if (orderType) query.orderType = orderType;
    if (orderSource) query.orderSource = orderSource;
    if (paymentStatus) query['payment.status'] = paymentStatus;
    if (startDate && endDate)
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    if (search)
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('restaurantId', 'name slug')
        .populate('tableDetails.tableId', 'tableNumber')
        .populate('deliveryDetails.deliveryBoyId', 'fullName phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    return ResponseHelper.success(res, 200, 'Orders retrieved successfully', {
      orders,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve orders');
  }
};

/**
 * Get Order By ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;

    const order = await Order.findById(id)
      .populate('restaurantId', 'name slug address phone taxSettings')
      .populate('tableDetails.tableId', 'tableNumber capacity')
      .populate('deliveryDetails.deliveryBoyId', 'fullName phone')
      .populate({ path: 'items.menuId', select: 'name images' });

    if (!order) return ResponseHelper.notFound(res, 'Order not found');

    if (req.user.role === 'customer' && order.customer.userId?.toString() !== req.user.id)
      return ResponseHelper.forbidden(res, 'You can only view your own orders');
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(order.restaurantId._id.toString()))
        return ResponseHelper.forbidden(res, 'You do not have access to this order');
    }

    return ResponseHelper.success(res, 200, 'Order retrieved successfully', { order });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve order');
  }
};

/**
 * Get Customer Orders
 */
const getMyOrders = async (req, res) => {
  try {
    const { restaurantId, status, page = 1, limit = 10 } = req.query;
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;

    const query = { 'customer.userId': req.user.id };
    if (restaurantId) query.restaurantId = restaurantId;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('restaurantId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    return ResponseHelper.success(res, 200, 'Your orders retrieved successfully', {
      orders,
      pagination: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) }
    });
  } catch (error) {
    logger.error('Get my orders error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve your orders');
  }
};

/**
 * Update Order Status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note = '' } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;

    const order = await Order.findById(id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');

    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(order.restaurantId.toString()))
        return ResponseHelper.forbidden(res, 'No access to this order');
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['out-for-delivery', 'completed'],
      'out-for-delivery': ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!validTransitions[order.status]?.includes(status))
      return ResponseHelper.error(res, 400, `Cannot change status from ${order.status} to ${status}`);

    await order.updateStatus(status, req.user.id, req.user.role, note);
    logger.info(`Order ${order.orderNumber} status updated to ${status}`);

    if (order.status === 'completed' && order.customer.userId) {
      const models = getOwnerModels(req.ownerId);
      const Customer = models.Customer;
      const LoyaltyTransaction = models.LoyaltyTransaction;

      const customer = await Customer.findById(order.customer.userId);

      if (customer) {
        // Calculate points (₹100 = 10 points)
        const points = Math.floor(order.pricing.total / 100) * 10;

        await customer.awardPoints(points, `Order ${order.orderNumber}`);

        // Log transaction
        await LoyaltyTransaction.create({
          restaurantId: order.restaurantId,
          customerId: customer._id,
          type: 'earned',
          points,
          previousBalance: customer.loyalty.points - points,
          newBalance: customer.loyalty.points,
          source: 'order',
          description: `Points earned from order ${order.orderNumber}`,
          relatedOrder: order._id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdByModel: 'System'
        });

        // Update statistics
        customer.statistics.totalOrders += 1;
        customer.statistics.completedOrders += 1;
        customer.statistics.totalSpent += order.pricing.total;
        customer.statistics.averageOrderValue =
          customer.statistics.totalSpent / customer.statistics.completedOrders;
        customer.statistics.lastOrderDate = new Date();

        if (!customer.statistics.firstOrderDate) {
          customer.statistics.firstOrderDate = new Date();
        }

        // Update tier
        customer.updateLoyaltyTier();

        // Calculate RFM
        customer.calculateRFMScore();

        await customer.save();
      }
    }


    if (status === 'completed' && order.orderType === 'dine-in' && order.tableDetails?.tableId) {
      const Table = models.Table;
      const table = await Table.findById(order.tableDetails.tableId);
      if (table) await table.makeAvailable();
    }

    const io = req.app.get('io');
    io.to(`restaurant:${order.restaurantId}`).emit('order:statusUpdated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status
    });
    io.to(`customer:${order.customer.userId}`).emit('order:statusUpdated', {
      orderId: order._id,
      status: order.status
    });

    return ResponseHelper.success(res, 200, 'Order status updated successfully', { order });
  } catch (error) {
    logger.error('Update order status error:', error);
    return ResponseHelper.error(res, 500, error.message || 'Failed to update order status');
  }
};

/**
 * Cancel Order
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, requestRefund = true } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    const order = await Order.findById(id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');

    if (req.user.role === 'customer') {
      if (order.customer.userId?.toString() !== req.user.id)
        return ResponseHelper.forbidden(res, 'You can only cancel your own orders');
      if (!['pending', 'confirmed'].includes(order.status))
        return ResponseHelper.error(res, 400, 'Cannot cancel this order');
    }

    await order.cancelOrder(reason, req.user.id, req.user.role);
    logger.info(`Order ${order.orderNumber} cancelled by ${req.user.role}`);

    let refundResult = null;
    if (requestRefund && order.payment.status === 'paid') {
      const paymentMethod = order.payment.method;
      const paymentId = order.payment.razorpayPaymentId || order.payment.transactionId;

      if (['razorpay', 'stripe'].includes(paymentMethod)) {
        refundResult = await paymentService.initiateRefund(
          paymentMethod,
          paymentId,
          order.pricing.total,
          reason
        );
        if (refundResult.success) {
          order.payment.status = 'refunded';
          order.payment.refundDetails = {
            amount: refundResult.amount,
            reason,
            refundedAt: new Date(),
            refundTransactionId: refundResult.refundId
          };
          await order.save();
        }
      }
    }

    if (order.orderType === 'dine-in' && order.tableDetails?.tableId) {
      const Table = models.Table;
      const table = await Table.findById(order.tableDetails.tableId);
      if (table) await table.makeAvailable();
    }

    const io = req.app.get('io');
    io.to(`restaurant:${order.restaurantId}`).emit('order:cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber
    });

    return ResponseHelper.success(res, 200, 'Order cancelled successfully', {
      order,
      refund: refundResult?.success ? refundResult : null
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    return ResponseHelper.error(res, 500, error.message || 'Failed to cancel order');
  }
};

/**
 * Verify Payment
 */
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    const order = await Order.findById(id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');
    if (order.payment.status === 'paid')
      return ResponseHelper.error(res, 400, 'Payment already verified');

    const paymentMethod = order.payment.method;
    let verificationResult;

    if (paymentMethod === 'razorpay') {
      verificationResult = paymentService.verifyRazorpaySignature(
        paymentData.razorpay_order_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature
      );
    } else if (paymentMethod === 'stripe') {
      verificationResult = await paymentService.verifyStripePayment(paymentData.paymentIntentId);
    } else {
      return ResponseHelper.error(res, 400, 'Invalid payment method');
    }

    if (!verificationResult.success)
      return ResponseHelper.error(res, 400, 'Payment verification failed');

    await order.markAsPaid({
      transactionId: paymentData.razorpay_payment_id || paymentData.paymentIntentId
    });
    await order.updateStatus('confirmed', 'system', 'System', 'Payment verified');

    const io = req.app.get('io');
    io.to(`kitchen:${order.restaurantId}`).emit('order:new', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      items: order.items
    });

    return ResponseHelper.success(res, 200, 'Payment verified successfully', { order });
  } catch (error) {
    logger.error('Verify payment error:', error);
    return ResponseHelper.error(res, 500, 'Failed to verify payment');
  }
};

/**
 * Assign Delivery Boy
 */
const assignDeliveryBoy = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryBoyId, estimatedDeliveryTime } = req.body;

    const models = getOwnerModels(req.ownerId);
    const { Order, Employee } = models;

    const order = await Order.findById(id);
    if (!order) return ResponseHelper.notFound(res, 'Order not found');
    if (order.orderType !== 'delivery')
      return ResponseHelper.error(res, 400, 'Order is not a delivery order');

    const deliveryBoy = await Employee.findById(deliveryBoyId);
    if (!deliveryBoy || deliveryBoy.employeeType !== 'delivery_boy')
      return ResponseHelper.notFound(res, 'Delivery boy not found');

    order.deliveryDetails.deliveryBoyId = deliveryBoyId;
    order.deliveryDetails.deliveryBoyName = deliveryBoy.fullName;
    order.deliveryDetails.deliveryBoyPhone = deliveryBoy.phone;
    order.deliveryDetails.estimatedDeliveryTime =
      estimatedDeliveryTime || new Date(Date.now() + 30 * 60000);
    await order.save();

    const io = req.app.get('io');
    io.to(`deliveryBoy:${deliveryBoyId}`).emit('delivery:assigned', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      deliveryAddress: order.deliveryDetails.address,
      total: order.pricing.total
    });

    return ResponseHelper.success(res, 200, 'Delivery boy assigned successfully', { order });
  } catch (error) {
    logger.error('Assign delivery boy error:', error);
    return ResponseHelper.error(res, 500, 'Failed to assign delivery boy');
  }
};

/**
 * Get Order Statistics
 */
const getOrderStats = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;
    const models = getOwnerModels(req.ownerId);
    const Order = models.Order;
    const query = {};

    if (restaurantId) query.restaurantId = restaurantId;
    else if (req.user.role === 'manager' && req.assignedRestaurants)
      query.restaurantId = { $in: req.assignedRestaurants };
    if (startDate && endDate)
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue
    ] = await Promise.all([
      Order.countDocuments(query),
      Order.countDocuments({ ...query, status: 'completed' }),
      Order.countDocuments({ ...query, status: 'cancelled' }),
      Order.aggregate([
        { $match: { ...query, status: 'completed', 'payment.status': 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ])
    ]);

    return ResponseHelper.success(res, 200, 'Order stats retrieved successfully', {
      stats: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        revenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    logger.error('Get order stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve order stats');
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  cancelOrder,
  verifyPayment,
  assignDeliveryBoy,
  getOrderStats
};
