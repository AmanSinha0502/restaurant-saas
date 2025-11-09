require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PlatformAdmin } = require('./models'); // adjust path if needed

const MONGO_URI = 'mongodb://localhost:27017/platform_main';

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    const admin = await PlatformAdmin.create({
      email: 'admin@platform.com',
      password: hashedPassword,
      fullName: 'Super Admin'
    });

    console.log('✅ Platform admin created successfully:');
    console.log(`Email: ${admin.email}`);
    console.log(`Password: Admin@123`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
