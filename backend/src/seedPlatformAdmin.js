// require('dotenv').config();
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const { connectDB, getPlatformDB } = require('./config/database');

// const seedAdmin = async () => {
//   try {
//     // Check if MONGO_URI is set
//     if (!process.env.MONGO_URI) {
//       throw new Error('MONGO_URI not found in environment variables');
//     }

//     // Connect to MongoDB
//     await connectDB();
//     console.log('✅ Connected to MongoDB');

//     // Get platform database connection and model
//     const platformDB = getPlatformDB();
//     const PlatformAdmin = platformDB.model('PlatformAdmin', require('./models/PlatformAdmin').schema);

//     // Check if admin already exists
//     const existingAdmin = await PlatformAdmin.findOne({ email: 'admin@platform.com' });
    
//     if (existingAdmin) {
//       console.log('ℹ️ Platform admin already exists:');
//       console.log(`Email: admin@platform.com`);
//       console.log(`Password: Admin@123 (if unchanged)`);
//       process.exit(0);
//     }

//     // Create new admin
//     const hashedPassword = await bcrypt.hash('Admin@123', 12);

//     const admin = await PlatformAdmin.create({
//       email: 'admin@platform.com',
//       password: hashedPassword,
//       fullName: 'Super Admin',
//       role: 'superadmin',
//       isActive: true
//     });

//     console.log('✅ Platform admin created successfully:');
//     console.log(`Email: ${admin.email}`);
//     console.log(`Password: Admin@123`);
//     console.log('\nYou can now login with these credentials at:');
//     console.log(`${process.env.FRONTEND_URL}/platform/login`);
    
//     process.exit(0);
//   } catch (error) {
//     console.error('❌ Error:', error.message);
//     console.error('\nPossible solutions:');
//     console.error('1. Make sure MongoDB is running');
//     console.error('2. Check your MONGO_URI in .env file');
//     console.error('3. Ensure you have correct database permissions');
//     process.exit(1);
//   }
// };

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   console.error('❌ UNHANDLED REJECTION:', err);
//   process.exit(1);
// });

// seedAdmin();


require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, getPlatformDB } = require('./config/database');

const seedAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    // Connect to DB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Use the same PlatformAdmin model that uses pre-save hashing
    const PlatformAdmin = require('./models/PlatformAdmin');

    // Check if admin already exists
    const existingAdmin = await PlatformAdmin.findOne({ email: 'admin@platform.com' });
    if (existingAdmin) {
      console.log('ℹ️ Platform admin already exists:');
      console.log(`Email: admin@platform.com`);
      console.log(`Password: Admin@123 (if unchanged)`);
      process.exit(0);
    }

    // ✅ Let the pre-save hook handle hashing
    const admin = new PlatformAdmin({
      email: 'admin@platform.com',
      password: 'Admin@123', // Plain text — will be hashed by pre('save')
      fullName: 'Super Admin',
      role: 'superadmin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Platform admin created successfully:');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: Admin@123`);
    console.log('\nYou can now login with these credentials at:');
    console.log(`${process.env.FRONTEND_URL}/platform/login`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Handle rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION:', err);
  process.exit(1);
});

seedAdmin();
