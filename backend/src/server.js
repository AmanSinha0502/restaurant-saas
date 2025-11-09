require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./config/database');
const { redis } = require('./config/redis');
const logger = require('./utils/logger');
 const mountRoutes = require('./routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// Connect to Database
connectDB();

// Security Middlewares
app.use(helmet());
// app.use(mongoSanitize());

// Basic sanitization middleware (safe with Express 5)
// app.use((req, res, next) => {
//   const sanitize = (obj) => {
//     if (obj && typeof obj === 'object') {
//       for (const key in obj) {
//         if (key.startsWith('$') || key.includes('.')) delete obj[key];
//         else sanitize(obj[key]);
//       }
//     }
//   };
//   sanitize(req.body);
//   sanitize(req.params);
//   sanitize(req.query);
//   next();
// });


// app.use(xss());

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body Parser Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

mountRoutes(app);

// HTTP Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);

// API Info Route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Restaurant Management API v1.0',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      menu: '/api/menu',
      orders: '/api/orders',
      reservations: '/api/reservations',
      // Add more as we build
    },
    documentation: '/api/docs'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Global Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  // Join room based on restaurant ID
  socket.on('join:restaurant', (restaurantId) => {
    socket.join(`restaurant:${restaurantId}`);
    logger.info(`Socket ${socket.id} joined restaurant:${restaurantId}`);
  });
  
  // Join kitchen room
  socket.on('join:kitchen', (restaurantId) => {
    socket.join(`kitchen:${restaurantId}`);
    logger.info(`Socket ${socket.id} joined kitchen:${restaurantId}`);
  });
  
  // Join admin dashboard room
  socket.on('join:admin', (ownerId) => {
    socket.join(`admin:${ownerId}`);
    logger.info(`Socket ${socket.id} joined admin:${ownerId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`📡 Socket.io server ready`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

module.exports = { app, io, server };