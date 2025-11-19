// At the very top of testendpoint.js
require('dotenv').config();

// Mock Razorpay
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn().mockResolvedValue({ id: 'fake_order' }) },
  }));
});

const axios = require('axios');
const listEndpoints = require('express-list-endpoints');

// Import your Express app
const app = require('../src/server'); // adjust path to your main app file

// Get all endpoints
const endpoints = listEndpoints(app);

const baseURL = 'http://localhost:5000'; // Change to your backend URL

(async () => {
  console.log('Starting API tests...\n');

  for (const ep of endpoints) {
    for (const method of ep.methods) {
      try {
        let response;

        // Only testing GET requests for now
        if (method === 'GET') {
          response = await axios.get(baseURL + ep.path);
        }
        // You can extend for POST/PUT/DELETE later
        else {
          console.log(`[SKIPPED] ${method} ${ep.path} (not handled yet)`);
          continue;
        }

        console.log(`[SUCCESS] ${method} ${ep.path} => Status: ${response.status}`);
      } catch (err) {
        console.log(`[FAIL] ${method} ${ep.path} => ${err.response?.status || err.message}`);
      }
    }
  }

  console.log('\nAPI tests finished.');
})();
