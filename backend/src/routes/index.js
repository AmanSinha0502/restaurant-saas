/**
 * Centralized Routes Index
 * Mount all application routes here
 */

const express = require('express');
const authRoutes = require('./authRoutes');
const platformRoutes = require('./platformRoutes');
const restaurantRoutes = require('./restaurantRoutes');
const staffRoutes = require('./staffRoutes');
const menuRoutes = require('./menuRoutes');
const orderRoutes = require('./orderRoutes');
const tableRoutes = require('./tableRoutes');
const reservationRoutes = require('./reservationRoutes');
const inventoryRoutes = require('./InventoryRoutes');
const supplierRoutes = require('./supplierRoutes');
const customerRoutes = require('./customerRoutes');



const mountRoutes = (app) => {
  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime()
    });
  });

  // API info route
  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Restaurant Management API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        platform: '/api/platform',
        auth: '/api/auth',
        restaurants: '/api/restaurants',
        staff: '/api/staff',
        menu: '/api/menu',
        orders: '/api/orders',
        reservations: '/api/reservations',
        tables: '/api/tables',
        inventory: '/api/inventory',
        customers: '/api/customers',
        coupons: '/api/coupons',
        reports: '/api/reports'
      },
      documentation: {
        swagger: '/api/docs',
        postman: '/api/postman'
      }
    });
  });

  // Mount feature routes
  app.use('/api/platform', platformRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/menu', menuRoutes);

  // Orders
  app.use('/api/orders', orderRoutes);

  // TODO: Add more routes as we build them
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/customers', customerRoutes);
  // app.use('/api/coupons', couponRoutes);
  // app.use('/api/reports', reportRoutes);

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));
};

module.exports = mountRoutes;