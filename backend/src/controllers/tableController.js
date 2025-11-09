const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Create Table
 * POST /api/tables
 */
const createTable = async (req, res) => {
  try {
    const {
      restaurantId,
      tableNumber,
      capacity,
      tableType,
      pricing,
      floor,
      shape,
      amenities,
      position,
      notes
    } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    const Restaurant = models.Restaurant;
    
    // Verify restaurant exists and user has access
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Check if manager has access to this restaurant
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(restaurantId)) {
        return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
      }
    }
    
    // Check if table number already exists in this restaurant
    const existingTable = await Table.findOne({
      restaurantId,
      tableNumber
    });
    
    if (existingTable) {
      return ResponseHelper.error(res, 400, `Table ${tableNumber} already exists in this restaurant`);
    }
    
    // Create table
    const table = await Table.create({
      restaurantId,
      tableNumber,
      capacity,
      tableType: tableType || 'indoor',
      pricing: {
        type: pricing?.type || 'per_person',
        amount: pricing?.amount || 0,
        currency: restaurant.currency
      },
      floor: floor || 'ground',
      shape: shape || 'square',
      amenities: amenities || [],
      position: position || { x: 0, y: 0 },
      notes,
      status: 'available',
      isActive: true,
      createdBy: req.user.id
    });
    
    logger.info(`Table created: ${table._id} in restaurant: ${restaurantId}`);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant:${restaurantId}`).emit('table:created', {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status
      }
    });
    
    return ResponseHelper.created(res, 'Table created successfully', {
      table
    });
  } catch (error) {
    logger.error('Create table error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create table');
  }
};

/**
 * Get All Tables
 * GET /api/tables
 */
const getAllTables = async (req, res) => {
  try {
    const {
      restaurantId,
      status,
      tableType,
      minCapacity,
      maxCapacity,
      floor,
      isActive
    } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    // Build query
    const query = {};
    
    // Filter by restaurant
    if (restaurantId) {
      query.restaurantId = restaurantId;
    } else if (req.user.role === 'manager' && req.assignedRestaurants) {
      // Manager sees only their assigned restaurants
      query.restaurantId = { $in: req.assignedRestaurants };
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by table type
    if (tableType) {
      query.tableType = tableType;
    }
    
    // Filter by capacity range
    if (minCapacity || maxCapacity) {
      query.capacity = {};
      if (minCapacity) query.capacity.$gte = parseInt(minCapacity);
      if (maxCapacity) query.capacity.$lte = parseInt(maxCapacity);
    }
    
    // Filter by floor
    if (floor) {
      query.floor = floor;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Execute query
    const tables = await Table.find(query)
      .populate('restaurantId', 'name slug')
      .populate('currentReservation', 'reservationNumber customer.name reservationDate timeSlot')
      .populate('currentOrder', 'orderNumber customer.name')
      .sort({ restaurantId: 1, tableNumber: 1 })
      .lean();
    
    return ResponseHelper.success(res, 200, 'Tables retrieved successfully', {
      tables,
      total: tables.length
    });
  } catch (error) {
    logger.error('Get all tables error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve tables');
  }
};

/**
 * Get Single Table
 * GET /api/tables/:id
 */
const getTableById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    const table = await Table.findById(id)
      .populate('restaurantId', 'name slug address')
      .populate('currentReservation')
      .populate('currentOrder');
    
    if (!table) {
      return ResponseHelper.notFound(res, 'Table not found');
    }
    
    // Check manager access
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(table.restaurantId._id.toString())) {
        return ResponseHelper.forbidden(res, 'You do not have access to this table');
      }
    }
    
    return ResponseHelper.success(res, 200, 'Table retrieved successfully', {
      table
    });
  } catch (error) {
    logger.error('Get table by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve table');
  }
};

/**
 * Update Table
 * PUT /api/tables/:id
 */
const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return ResponseHelper.notFound(res, 'Table not found');
    }
    
    // Check manager access
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(table.restaurantId.toString())) {
        return ResponseHelper.forbidden(res, 'You do not have access to this table');
      }
    }
    
    // Check if new table number already exists (if being changed)
    if (updateData.tableNumber && updateData.tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({
        restaurantId: table.restaurantId,
        tableNumber: updateData.tableNumber,
        _id: { $ne: id }
      });
      
      if (existingTable) {
        return ResponseHelper.error(res, 400, `Table ${updateData.tableNumber} already exists`);
      }
    }
    
    // Update allowed fields
    const allowedFields = [
      'tableNumber',
      'capacity',
      'tableType',
      'pricing',
      'floor',
      'shape',
      'amenities',
      'position',
      'notes',
      'isActive'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
          table[field] = { ...table[field], ...updateData[field] };
        } else {
          table[field] = updateData[field];
        }
      }
    });
    
    await table.save();
    
    logger.info(`Table updated: ${table._id} by ${req.user.role}: ${req.user.id}`);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant:${table.restaurantId}`).emit('table:updated', {
      tableId: table._id,
      updates: updateData
    });
    
    return ResponseHelper.success(res, 200, 'Table updated successfully', {
      table
    });
  } catch (error) {
    logger.error('Update table error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update table');
  }
};

/**
 * Delete Table
 * DELETE /api/tables/:id
 */
const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return ResponseHelper.notFound(res, 'Table not found');
    }
    
    // Check manager access
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(table.restaurantId.toString())) {
        return ResponseHelper.forbidden(res, 'You do not have access to this table');
      }
    }
    
    // Check if table is currently in use
    if (table.status === 'occupied' || table.status === 'reserved') {
      return ResponseHelper.error(res, 400, 'Cannot delete table that is currently in use');
    }
    
    // Soft delete
    table.isActive = false;
    table.status = 'maintenance';
    await table.save();
    
    logger.warn(`Table deleted: ${table._id} by ${req.user.role}: ${req.user.id}`);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant:${table.restaurantId}`).emit('table:deleted', {
      tableId: table._id
    });
    
    return ResponseHelper.success(res, 200, 'Table deleted successfully');
  } catch (error) {
    logger.error('Delete table error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete table');
  }
};

/**
 * Update Table Status
 * PATCH /api/tables/:id/status
 */
const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, orderId, reservationId } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    const table = await Table.findById(id);
    
    if (!table) {
      return ResponseHelper.notFound(res, 'Table not found');
    }
    
    // Update status
    const oldStatus = table.status;
    table.status = status;
    
    // Handle different statuses
    switch (status) {
      case 'occupied':
        if (orderId) table.currentOrder = orderId;
        table.currentReservation = null;
        break;
      case 'reserved':
        if (reservationId) table.currentReservation = reservationId;
        table.currentOrder = null;
        break;
      case 'available':
        table.currentOrder = null;
        table.currentReservation = null;
        break;
      case 'maintenance':
        // Keep current assignments
        break;
    }
    
    await table.save();
    
    logger.info(`Table status updated: ${table._id} from ${oldStatus} to ${status}`);
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.to(`restaurant:${table.restaurantId}`).emit('table:statusChanged', {
      tableId: table._id,
      tableNumber: table.tableNumber,
      oldStatus,
      newStatus: status
    });
    
    return ResponseHelper.success(res, 200, 'Table status updated successfully', {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        status: table.status
      }
    });
  } catch (error) {
    logger.error('Update table status error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update table status');
  }
};

/**
 * Get Available Tables for Date/Time
 * GET /api/tables/available
 */
const getAvailableTables = async (req, res) => {
  try {
    const {
      restaurantId,
      date,
      timeSlot,
      numberOfGuests,
      diningDuration = 90
    } = req.query;
    
    if (!restaurantId || !date || !timeSlot || !numberOfGuests) {
      return ResponseHelper.error(res, 400, 'restaurantId, date, timeSlot, and numberOfGuests are required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    // Find all active tables at restaurant
    const allTables = await Table.find({
      restaurantId,
      isActive: true,
      status: { $ne: 'maintenance' }
    }).sort({ capacity: 1 });
    
    // Filter tables by capacity (within reasonable range)
    const guests = parseInt(numberOfGuests);
    const suitableTables = allTables.filter(table => 
      table.capacity >= guests && table.capacity <= guests + 2
    );
    
    if (suitableTables.length === 0) {
      return ResponseHelper.success(res, 200, 'No suitable tables found', {
        availableTables: [],
        message: `No tables available for ${guests} guests`
      });
    }
    
    // Check availability for each table
    const availableTables = [];
    for (let table of suitableTables) {
      const isAvailable = await table.isAvailableAt(date, timeSlot, parseInt(diningDuration));
      if (isAvailable) {
        availableTables.push(table);
      }
    }
    
    return ResponseHelper.success(res, 200, 'Available tables retrieved successfully', {
      availableTables,
      total: availableTables.length,
      searchCriteria: {
        date,
        timeSlot,
        numberOfGuests: guests,
        diningDuration: parseInt(diningDuration)
      }
    });
  } catch (error) {
    logger.error('Get available tables error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve available tables');
  }
};

/**
 * Get Table Availability Grid (Visual)
 * GET /api/tables/:restaurantId/availability-grid
 */
const getAvailabilityGrid = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return ResponseHelper.error(res, 400, 'Date is required');
    }
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    const Reservation = models.Reservation;
    
    // Get all tables
    const tables = await Table.find({
      restaurantId,
      isActive: true
    }).sort({ tableNumber: 1 });
    
    // Get all reservations for this date
    const reservations = await Reservation.find({
      restaurantId,
      reservationDate: date,
      status: { $in: ['confirmed', 'checked-in'] }
    }).populate('table.tableId');
    
    // Build availability grid
    const timeSlots = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute of ['00', '30']) {
        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
        timeSlots.push(time);
      }
    }
    
    const grid = tables.map(table => {
      const tableSlots = {};
      
      timeSlots.forEach(slot => {
        const isReserved = reservations.some(res => {
          if (!res.table?.tableId || res.table.tableId._id.toString() !== table._id.toString()) {
            return false;
          }
          
          const resTime = res.timeSlot;
          const resEnd = addMinutes(resTime, 90); // Default dining duration
          
          return slot >= resTime && slot < resEnd;
        });
        
        tableSlots[slot] = {
          available: !isReserved && table.status === 'available',
          status: isReserved ? 'reserved' : table.status
        };
      });
      
      return {
        tableId: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        slots: tableSlots
      };
    });
    
    return ResponseHelper.success(res, 200, 'Availability grid retrieved successfully', {
      date,
      tables: grid,
      timeSlots
    });
  } catch (error) {
    logger.error('Get availability grid error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve availability grid');
  }
};

// Helper function to add minutes to time
function addMinutes(time, minutes) {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

/**
 * Get Table Statistics
 * GET /api/tables/stats
 */
const getTableStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    
    const query = {};
    
    if (restaurantId) {
      query.restaurantId = restaurantId;
    } else if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }
    
    const [
      totalTables,
      availableTables,
      occupiedTables,
      reservedTables,
      maintenanceTables,
      tablesByType,
      tablesByCapacity
    ] = await Promise.all([
      Table.countDocuments({ ...query, isActive: true }),
      Table.countDocuments({ ...query, status: 'available', isActive: true }),
      Table.countDocuments({ ...query, status: 'occupied', isActive: true }),
      Table.countDocuments({ ...query, status: 'reserved', isActive: true }),
      Table.countDocuments({ ...query, status: 'maintenance', isActive: true }),
      Table.aggregate([
        { $match: { ...query, isActive: true } },
        {
          $group: {
            _id: '$tableType',
            count: { $sum: 1 }
          }
        }
      ]),
      Table.aggregate([
        { $match: { ...query, isActive: true } },
        {
          $group: {
            _id: '$capacity',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    return ResponseHelper.success(res, 200, 'Table statistics retrieved successfully', {
      stats: {
        total: totalTables,
        available: availableTables,
        occupied: occupiedTables,
        reserved: reservedTables,
        maintenance: maintenanceTables,
        byType: tablesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byCapacity: tablesByCapacity.map(item => ({
          capacity: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    logger.error('Get table stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve table statistics');
  }
};

/**
 * Bulk Create Tables
 * POST /api/tables/bulk
 */
const bulkCreateTables = async (req, res) => {
  try {
    const { restaurantId, tables } = req.body;
    
    const models = getOwnerModels(req.ownerId);
    const Table = models.Table;
    const Restaurant = models.Restaurant;
    
    // Verify restaurant
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.ownerId
    });
    
    if (!restaurant) {
      return ResponseHelper.notFound(res, 'Restaurant not found');
    }
    
    // Check manager access
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      if (!req.assignedRestaurants.includes(restaurantId)) {
        return ResponseHelper.forbidden(res, 'You do not have access to this restaurant');
      }
    }
    
    // Prepare tables for bulk insert
    const tablesToInsert = tables.map(t => ({
      restaurantId,
      tableNumber: t.tableNumber,
      capacity: t.capacity,
      tableType: t.tableType || 'indoor',
      pricing: {
        type: t.pricing?.type || 'per_person',
        amount: t.pricing?.amount || 0,
        currency: restaurant.currency
      },
      floor: t.floor || 'ground',
      shape: t.shape || 'square',
      status: 'available',
      isActive: true,
      createdBy: req.user.id
    }));
    
    // Insert all tables
    const createdTables = await Table.insertMany(tablesToInsert, { ordered: false });
    
    logger.info(`Bulk created ${createdTables.length} tables in restaurant: ${restaurantId}`);
    
    return ResponseHelper.created(res, `${createdTables.length} tables created successfully`, {
      tables: createdTables
    });
  } catch (error) {
    if (error.code === 11000) {
      return ResponseHelper.error(res, 400, 'Some table numbers already exist');
    }
    logger.error('Bulk create tables error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create tables');
  }
};

module.exports = {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
  updateTableStatus,
  getAvailableTables,
  getAvailabilityGrid,
  getTableStats,
  bulkCreateTables
};