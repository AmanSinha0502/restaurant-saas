require('dotenv').config();

const { connectDB } = require('../config/database');
const { getOwnerModels } = require('../models');
const inventoryController = require('../controllers/inventoryController');
const mongoose = require('mongoose');

const argv = require('minimist')(process.argv.slice(2));

async function main() {
  const ownerId = argv.ownerId || argv.owner || process.env.SEED_OWNER_ID;
  const restaurantId = argv.restaurantId || argv.restaurant || process.env.SEED_RESTAURANT_ID;
  const managerId = argv.managerId || argv.manager || process.env.SEED_MANAGER_ID;

  if (!ownerId || !restaurantId) {
    console.error('Usage: node seed_sample_data.js --ownerId=<ownerId> --restaurantId=<restaurantId> [--managerId=<managerId>]');
    process.exit(1);
  }

  await connectDB();

  try {
    const models = getOwnerModels(ownerId);
    const { Inventory, Menu, Order } = models;

    console.log('Creating sample inventory items...');

    const inv1 = await Inventory.create({
      restaurantId,
      itemName: { en: 'Tomatoes' },
      category: 'vegetables',
      currentStock: 100,
      unit: 'kg',
      minimumStock: 10,
      reorderPoint: 20,
      unitPrice: 40,
      currency: 'INR',
      isPerishable: true,
      expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdBy: managerId || ownerId,
      createdByModel: managerId ? 'Manager' : 'Owner'
    });

    const inv2 = await Inventory.create({
      restaurantId,
      itemName: { en: 'Paneer' },
      category: 'dairy',
      currentStock: 50,
      unit: 'kg',
      minimumStock: 5,
      reorderPoint: 10,
      unitPrice: 300,
      currency: 'INR',
      isPerishable: true,
      expiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      createdBy: managerId || ownerId,
      createdByModel: managerId ? 'Manager' : 'Owner'
    });

    console.log('Inventory created:', inv1._id.toString(), inv2._id.toString());

    console.log('Creating sample menu items linked to inventory...');

    const menu1 = await Menu.create({
      restaurantId,
      ownerId,
      sharedAcrossBranches: false,
      specificBranches: [restaurantId],
      name: { en: 'Tomato Soup' },
      description: { en: 'Warm tomato soup' },
      category: 'Starters',
      price: 120,
      currency: 'INR',
      dietaryType: 'veg',
      linkedInventoryItems: [
        { inventoryId: inv1._id, quantityRequired: 0.2, unit: 'kg' }
      ],
      createdBy: managerId || ownerId
    });

    const menu2 = await Menu.create({
      restaurantId,
      ownerId,
      sharedAcrossBranches: false,
      specificBranches: [restaurantId],
      name: { en: 'Paneer Butter Masala' },
      description: { en: 'Creamy paneer curry' },
      category: 'Main Course',
      price: 320,
      currency: 'INR',
      dietaryType: 'veg',
      linkedInventoryItems: [
        { inventoryId: inv2._id, quantityRequired: 0.25, unit: 'kg' }
      ],
      createdBy: managerId || ownerId
    });

    console.log('Menu items created:', menu1._id.toString(), menu2._id.toString());

    console.log('Creating a test order for Tomato Soup (quantity 2)...');

    // Ensure orderNumber is generated using model helper
    const orderNumber = await Order.generateOrderNumber(restaurantId);

    const order = await Order.create({
      ownerId,
      restaurantId,
      orderNumber,
      customer: { name: 'Test Customer', phone: '9999999999' },
      orderType: 'takeaway',
      orderSource: 'pos',
      items: [
        {
          menuId: menu1._id,
          name: { en: menu1.name.en },
          quantity: 2,
          price: menu1.price,
          subtotal: menu1.price * 2
        }
      ],
      pricing: {
        subtotal: menu1.price * 2,
        tax: { type: 'GST', rate: 5, amount: Math.round((menu1.price * 2) * 0.05) },
        deliveryCharge: 0,
        total: Math.round((menu1.price * 2) * 1.05)
      },
      payment: { method: 'cod', status: 'pending' },
      createdBy: managerId || ownerId,
      createdByModel: managerId ? 'Manager' : 'Owner',
      isTestOrder: true
    });

    console.log('Order created:', order._id.toString(), 'orderNumber:', order.orderNumber);

    console.log('Running auto-deduction (if enabled) via inventory controller...');

    await inventoryController.autoDeductOnOrder(order, ownerId);

    // Refresh inventory items
    const refreshedInv1 = await Inventory.findById(inv1._id);
    const refreshedInv2 = await Inventory.findById(inv2._id);

    console.log('Post-order inventory levels:');
    console.log(`${refreshedInv1.itemName.en}: ${refreshedInv1.currentStock} ${refreshedInv1.unit}`);
    console.log(`${refreshedInv2.itemName.en}: ${refreshedInv2.currentStock} ${refreshedInv2.unit}`);

    console.log('\nSample data seeding completed successfully.');

    process.exit(0);

  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

main();
