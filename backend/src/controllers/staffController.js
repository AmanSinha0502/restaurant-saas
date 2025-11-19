const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * ========================================
 * MANAGER MANAGEMENT
 * ========================================
 */

/**
 * Create Manager
 * POST /api/staff/managers
 */
const createManager = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      assignedRestaurants,
      permissions
    } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;
    const Restaurant = models.Restaurant;

    // Check if manager with email already exists
    const existingManager = await Manager.findOne({ email, ownerId: req.ownerId });

    if (existingManager) {
      return ResponseHelper.error(res, 400, 'Manager with this email already exists');
    }

    // Verify all assigned restaurants exist and belong to this owner
    if (assignedRestaurants && assignedRestaurants.length > 0) {
      const restaurants = await Restaurant.find({
        _id: { $in: assignedRestaurants },
        ownerId: req.ownerId
      });

      if (restaurants.length !== assignedRestaurants.length) {
        return ResponseHelper.error(res, 400, 'One or more restaurants not found or do not belong to you');
      }
    }

    // Create manager
    const manager = await Manager.create({
      ownerId: req.ownerId,
      fullName,
      email,
      phone,
      password,
      assignedRestaurants: assignedRestaurants || [],
      permissions: permissions || {
        canEditMenu: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true,
        canEditSettings: false,
        canManageReservations: true,
        canProcessRefunds: false
      },
      createdBy: req.user.id
    });

    logger.info(`Manager created: ${manager._id} by owner: ${req.ownerId}`);

    return ResponseHelper.created(res, 'Manager created successfully', {
      manager: {
        id: manager._id,
        fullName: manager.fullName,
        email: manager.email,
        phone: manager.phone,
        assignedRestaurants: manager.assignedRestaurants,
        permissions: manager.permissions,
        createdAt: manager.createdAt
      },
      loginCredentials: {
        email: manager.email,
        loginUrl: `${process.env.FRONTEND_URL}/staff/login`,
        note: 'Manager can change password after first login'
      }
    });
  } catch (error) {
    logger.error('Create manager error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create manager');
  }
};

/**
 * Get All Managers
 * GET /api/staff/managers
 */
const getAllManagers = async (req, res) => {
  try {
    const { search, isActive, restaurantId } = req.query;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;

    // Build query
    const query = { ownerId: req.ownerId };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (restaurantId) {
      query.assignedRestaurants = restaurantId;
    }

    // Execute query
    const managers = await Manager.find(query)
     .populate({
  path: 'assignedRestaurants',
  model: models.Restaurant,
  select: 'name slug'
})

      .sort({ createdAt: -1 })
      .lean();

    return ResponseHelper.success(res, 200, 'Managers retrieved successfully', {
      managers,
      total: managers.length
    });
  } catch (error) {
    logger.error('Get all managers error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve managers');
  }
};

/**
 * Get Single Manager
 * GET /api/staff/managers/:id
 */
const getManagerById = async (req, res) => {
  try {
    const { id } = req.params;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;

    const manager = await Manager.findOne({
      _id: id,
      ownerId: req.ownerId
    }).populate({
  path: 'assignedRestaurants',
  model: models.Restaurant,
  select: 'name slug address'
});

    if (!manager) {
      return ResponseHelper.notFound(res, 'Manager not found');
    }

    return ResponseHelper.success(res, 200, 'Manager retrieved successfully', {
      manager
    });
  } catch (error) {
    logger.error('Get manager by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve manager');
  }
};

/**
 * Update Manager
 * PUT /api/staff/managers/:id
 */
const updateManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, assignedRestaurants, permissions, isActive } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;
    const Restaurant = models.Restaurant;

    const manager = await Manager.findOne({
      _id: id,
      ownerId: req.ownerId
    });

    if (!manager) {
      return ResponseHelper.notFound(res, 'Manager not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== manager.email) {
      const existingManager = await Manager.findOne({ email, ownerId: req.ownerId });
      if (existingManager) {
        return ResponseHelper.error(res, 400, 'Email already in use by another manager');
      }
    }

    // Verify assigned restaurants if being updated
    if (assignedRestaurants) {
      const restaurants = await Restaurant.find({
        _id: { $in: assignedRestaurants },
        ownerId: req.ownerId
      });

      if (restaurants.length !== assignedRestaurants.length) {
        return ResponseHelper.error(res, 400, 'One or more restaurants not found');
      }
    }

    // Update fields
    if (fullName) manager.fullName = fullName;
    if (email) manager.email = email;
    if (phone) manager.phone = phone;
    if (assignedRestaurants) manager.assignedRestaurants = assignedRestaurants;
    if (permissions) manager.permissions = { ...manager.permissions, ...permissions };
    if (isActive !== undefined) manager.isActive = isActive;

    await manager.save();

    logger.info(`Manager updated: ${manager._id} by owner: ${req.ownerId}`);

    return ResponseHelper.success(res, 200, 'Manager updated successfully', {
      manager
    });
  } catch (error) {
    logger.error('Update manager error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update manager');
  }
};

/**
 * Delete Manager
 * DELETE /api/staff/managers/:id
 */
const deleteManager = async (req, res) => {
  try {
    const { id } = req.params;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;

    const manager = await Manager.findOne({
      _id: id,
      ownerId: req.ownerId
    });

    if (!manager) {
      return ResponseHelper.notFound(res, 'Manager not found');
    }

    // Soft delete - deactivate
    manager.isActive = false;
    await manager.save();

    logger.warn(`Manager deactivated: ${manager._id} by owner: ${req.ownerId}`);

    return ResponseHelper.success(res, 200, 'Manager deactivated successfully');
  } catch (error) {
    logger.error('Delete manager error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete manager');
  }
};

/**
 * Assign/Unassign Restaurant to Manager
 * PATCH /api/staff/managers/:id/restaurants
 */
const updateManagerRestaurants = async (req, res) => {
  try {
    const { id } = req.params;
    const { restaurantIds, action } = req.body; // action: 'assign' or 'unassign'

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;
    const Restaurant = models.Restaurant;

    const manager = await Manager.findOne({
      _id: id,
      ownerId: req.ownerId
    });

    if (!manager) {
      return ResponseHelper.notFound(res, 'Manager not found');
    }

    // Verify restaurants exist
    const restaurants = await Restaurant.find({
      _id: { $in: restaurantIds },
      ownerId: req.ownerId
    });

    if (restaurants.length !== restaurantIds.length) {
      return ResponseHelper.error(res, 400, 'One or more restaurants not found');
    }

    if (action === 'assign') {
      // Add restaurants (avoid duplicates)
      const newRestaurants = restaurantIds.filter(
        rid => !manager.assignedRestaurants.some(ar => ar.toString() === rid)
      );
      manager.assignedRestaurants.push(...newRestaurants);
    } else if (action === 'unassign') {
      // Remove restaurants
      manager.assignedRestaurants = manager.assignedRestaurants.filter(
        ar => !restaurantIds.includes(ar.toString())
      );
    } else {
      return ResponseHelper.error(res, 400, 'Invalid action. Use "assign" or "unassign"');
    }

    await manager.save();

    logger.info(`Manager ${id} restaurants ${action}ed by owner: ${req.ownerId}`);

    return ResponseHelper.success(res, 200, `Restaurants ${action}ed successfully`, {
      manager: {
        id: manager._id,
        fullName: manager.fullName,
        assignedRestaurants: manager.assignedRestaurants
      }
    });
  } catch (error) {
    logger.error('Update manager restaurants error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update manager restaurants');
  }
};

/**
 * ========================================
 * EMPLOYEE MANAGEMENT
 * ========================================
 */

/**
 * Create Employee
 * POST /api/staff/employees
 */
const createEmployee = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      restaurantId,
      employeeType
    } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Employee = models.Employee;
    const Restaurant = models.Restaurant;

    // Verify restaurant exists and belongs to owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.ownerId
    });

    if (!restaurant) {
      return ResponseHelper.error(res, 400, 'Restaurant not found');
    }

    // Check if employee with email already exists in this restaurant
    const existingEmployee = await Employee.findOne({
      email,
      ownerId: req.ownerId
    });

    if (existingEmployee) {
      return ResponseHelper.error(res, 400, 'Employee with this email already exists in this restaurant');
    }

    // Create employee (permissions auto-set based on employeeType in pre-save hook)
    const employee = await Employee.create({
      ownerId: req.ownerId,
      restaurantId,
      fullName,
      email,
      phone,
      password,
      employeeType,
      createdBy: req.user.id
    });

    logger.info(`Employee created: ${employee._id} for restaurant: ${restaurantId}`);

    return ResponseHelper.created(res, 'Employee created successfully', {
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        restaurantId: employee.restaurantId,
        employeeType: employee.employeeType,
        permissions: employee.permissions,
        createdAt: employee.createdAt
      },
      loginCredentials: {
        email: employee.email,
        loginUrl: `${process.env.FRONTEND_URL}/staff/login`,
        note: 'Employee can change password after first login'
      }
    });
  } catch (error) {
    logger.error('Create employee error:', error);
    return ResponseHelper.error(res, 500, 'Failed to create employee');
  }
};

/**
 * Get All Employees
 * GET /api/staff/employees
 */
const getAllEmployees = async (req, res) => {
  try {
    const { search, isActive, restaurantId, employeeType } = req.query;

    const models = getOwnerModels(req.ownerId);
    const Employee = models.Employee;

    // Build query
    const query = { ownerId: req.ownerId };


    // If manager, filter by assigned restaurants
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    if (employeeType) {
      query.employeeType = employeeType;
    }

    // Execute query
    const employees = await Employee.find(query)
   .populate({
  path: 'restaurantId',
  model: models.Restaurant,
  select: 'name slug'
})

      .sort({ createdAt: -1 })
      .lean();

    return ResponseHelper.success(res, 200, 'Employees retrieved successfully', {
      employees,
      total: employees.length
    });
  } catch (error) {
    logger.error('Get all employees error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve employees');
  }
};

/**
 * Get Single Employee
 * GET /api/staff/employees/:id
 */
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const models = getOwnerModels(req.ownerId);
    const Employee = models.Employee;

    const query = { _id: id };

    // If manager, ensure employee belongs to assigned restaurant
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }

    const employee = await Employee.findOne(query)
      .populate({
  path: 'restaurantId',
  model: models.Restaurant,
  select: 'name slug address'
})


    if (!employee) {
      return ResponseHelper.notFound(res, 'Employee not found');
    }

    return ResponseHelper.success(res, 200, 'Employee retrieved successfully', {
      employee
    });
  } catch (error) {
    logger.error('Get employee by ID error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve employee');
  }
};

/**
 * Update Employee
 * PUT /api/staff/employees/:id
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, employeeType, permissions, isActive } = req.body;

    const models = getOwnerModels(req.ownerId);
    const Employee = models.Employee;

    const query = { _id: id };

    // If manager, ensure employee belongs to assigned restaurant
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      return ResponseHelper.notFound(res, 'Employee not found');
    }

    // Check if email is being changed and already exists
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email,
        restaurantId: employee.restaurantId
      });

      if (existingEmployee) {
        return ResponseHelper.error(res, 400, 'Email already in use by another employee');
      }
    }

    // Update fields
    if (fullName) employee.fullName = fullName;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (employeeType) employee.employeeType = employeeType;
    if (permissions) employee.permissions = { ...employee.permissions, ...permissions };
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    logger.info(`Employee updated: ${employee._id} by ${req.user.role}: ${req.user.id}`);

    return ResponseHelper.success(res, 200, 'Employee updated successfully', {
      employee
    });
  } catch (error) {
    logger.error('Update employee error:', error);
    return ResponseHelper.error(res, 500, 'Failed to update employee');
  }
};

/**
 * Delete Employee
 * DELETE /api/staff/employees/:id
 */
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const models = getOwnerModels(req.ownerId);
    const Employee = models.Employee;

    const query = { _id: id };

    // If manager, ensure employee belongs to assigned restaurant
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      query.restaurantId = { $in: req.assignedRestaurants };
    }

    const employee = await Employee.findOne(query);

    if (!employee) {
      return ResponseHelper.notFound(res, 'Employee not found');
    }

    // Soft delete - deactivate
    employee.isActive = false;
    await employee.save();

    logger.warn(`Employee deactivated: ${employee._id} by ${req.user.role}: ${req.user.id}`);

    return ResponseHelper.success(res, 200, 'Employee deactivated successfully');
  } catch (error) {
    logger.error('Delete employee error:', error);
    return ResponseHelper.error(res, 500, 'Failed to delete employee');
  }
};

/**
 * Get Staff Statistics
 * GET /api/staff/stats
 */
const getStaffStats = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    const models = getOwnerModels(req.ownerId);
    const Manager = models.Manager;
    const Employee = models.Employee;

    let managerQuery = { ownerId: req.ownerId };
    let employeeQuery = {};

    // If manager role, filter by assigned restaurants
    if (req.user.role === 'manager' && req.assignedRestaurants) {
      managerQuery = { _id: req.user.id };
      employeeQuery.restaurantId = { $in: req.assignedRestaurants };
    }

    if (restaurantId) {
      managerQuery.assignedRestaurants = restaurantId;
      employeeQuery.restaurantId = restaurantId;
    }

    const [
      totalManagers,
      activeManagers,
      totalEmployees,
      activeEmployees,
      employeesByType
    ] = await Promise.all([
      Manager.countDocuments(managerQuery),
      Manager.countDocuments({ ...managerQuery, isActive: true }),
      Employee.countDocuments(employeeQuery),
      Employee.countDocuments({ ...employeeQuery, isActive: true }),
      Employee.aggregate([
        { $match: employeeQuery },
        {
          $group: {
            _id: '$employeeType',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    return ResponseHelper.success(res, 200, 'Staff statistics retrieved successfully', {
      managers: {
        total: totalManagers,
        active: activeManagers,
        inactive: totalManagers - activeManagers
      },
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
        byType: employeesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Get staff stats error:', error);
    return ResponseHelper.error(res, 500, 'Failed to retrieve staff statistics');
  }
};

module.exports = {
  // Manager Management
  createManager,
  getAllManagers,
  getManagerById,
  updateManager,
  deleteManager,
  updateManagerRestaurants,

  // Employee Management
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,

  // Statistics
  getStaffStats
};