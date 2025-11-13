//src/jobs/birthdayRewards.js

const { getOwnerModels } = require('../models');
const logger = require('../utils/logger');

const processBirthdayRewards = async () => {
  try {
    // Get all owner databases
    // Loop through each and award birthday bonuses
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    // Example for one owner:
    const models = getOwnerModels('owner_123');
    const Customer = models.Customer;
    const LoyaltyTransaction = models.LoyaltyTransaction;
    
    const birthdayCustomers = await Customer.find({
      isDeleted: false,
      status: 'active'
    });
    
    for (const customer of birthdayCustomers) {
      if (!customer.dateOfBirth) continue;
      
      const birthday = new Date(customer.dateOfBirth);
      if (birthday.getMonth() === currentMonth && birthday.getDate() === currentDay) {
        // Award birthday bonus
        const bonusPoints = 100;
        
        await customer.awardPoints(bonusPoints, 'Happy Birthday! 🎉');
        
        await LoyaltyTransaction.create({
          restaurantId: customer.restaurantId,
          customerId: customer._id,
          type: 'bonus',
          points: bonusPoints,
          previousBalance: customer.loyalty.points - bonusPoints,
          newBalance: customer.loyalty.points,
          source: 'birthday',
          description: 'Birthday bonus points',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdByModel: 'System'
        });
        
        logger.info(`Birthday bonus awarded to customer ${customer._id}`);
        
        // TODO: Send birthday SMS/Email
      }
    }
    
  } catch (error) {
    logger.error('Birthday rewards error:', error);
  }
};

module.exports = processBirthdayRewards;