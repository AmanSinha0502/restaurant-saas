// ============================================
// CUSTOMER CONTROLLER - PART 1 (AUTH & PROFILE)
// ============================================
// Save as: backend/src/controllers/customerController.js

const { getOwnerModels } = require('../models');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

/**
 * Register Customer
 * POST /api/customers/register
 */
const registerCustomer = async (req, res) => {
    try {
        const {
            restaurantId,
            fullName,
            email,
            phone,
            password,
            dateOfBirth,
            gender,
            referralCode
        } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;
        const Restaurant = models.Restaurant;
        const LoyaltyTransaction = models.LoyaltyTransaction;

        // Verify restaurant
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return ResponseHelper.notFound(res, 'Restaurant not found');
        }

        // Check if customer already exists
        const existingCustomer = await Customer.findOne({
            restaurantId,
            $or: [{ email }, { phone }]
        });

        if (existingCustomer) {
            return ResponseHelper.error(res, 400, 'Customer with this email or phone already exists');
        }

        // Handle referral
        let referredBy = null;
        if (referralCode) {
            const referrer = await Customer.findOne({
                restaurantId,
                'referral.referralCode': referralCode
            });

            if (referrer) {
                referredBy = referrer._id;
            }
        }

        // Create customer
        const customer = await Customer.create({
            restaurantId,
            fullName,
            email,
            phone,
            password,
            dateOfBirth,
            gender,
            'referral.referredBy': referredBy,
            registrationSource: 'website'
        });

        // Award signup bonus points
        const signupBonus = 100;
        await customer.awardPoints(signupBonus, 'Signup bonus');

        // Log loyalty transaction
        await LoyaltyTransaction.create({
            restaurantId,
            customerId: customer._id,
            type: 'earned',
            points: signupBonus,
            previousBalance: 0,
            newBalance: signupBonus,
            source: 'signup',
            description: 'Welcome bonus for new registration',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            createdByModel: 'System'
        });

        // Handle referrer reward
        if (referredBy) {
            const referrer = await Customer.findById(referredBy);
            const referralBonus = 50;

            await referrer.awardPoints(referralBonus, `Referral bonus for referring ${fullName}`);
            referrer.referral.totalReferrals += 1;
            referrer.referral.referralEarnings += referralBonus;
            referrer.referral.referredCustomers.push({
                customerId: customer._id,
                registeredAt: new Date(),
                rewardGiven: true
            });
            await referrer.save();

            // Log referrer transaction
            await LoyaltyTransaction.create({
                restaurantId,
                customerId: referrer._id,
                type: 'earned',
                points: referralBonus,
                previousBalance: referrer.loyalty.points - referralBonus,
                newBalance: referrer.loyalty.points,
                source: 'referral',
                description: `Referral bonus for referring ${fullName}`,
                relatedReferral: customer._id,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                createdByModel: 'System'
            });
        }

        logger.info(`Customer registered: ${customer._id} (${customer.email}) at restaurant: ${restaurantId}`);

        // Generate JWT token
        const token = jwt.sign(
            {
                id: customer._id,
                role: 'customer',
                restaurantId: customer.restaurantId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return ResponseHelper.created(res, 'Customer registered successfully', {
            customer: {
                id: customer._id,
                customerCode: customer.customerCode,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                loyaltyPoints: customer.loyalty.points,
                tier: customer.loyalty.tier,
                referralCode: customer.referral.referralCode
            },
            token
        });

    } catch (error) {
        logger.error('Register customer error:', error);
        return ResponseHelper.error(res, 500, 'Failed to register customer');
    }
};

/**
 * Login Customer
 * POST /api/customers/login
 */
const loginCustomer = async (req, res) => {
    try {
        const { restaurantId, email, phone, password } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        // Find customer by email or phone
        const customer = await Customer.findOne({
            restaurantId,
            $or: [{ email }, { phone }]
        }).select('+password');

        if (!customer) {
            return ResponseHelper.error(res, 401, 'Invalid credentials');
        }

        // Check if blocked
        if (customer.status === 'blocked') {
            return ResponseHelper.error(res, 403, 'Your account has been blocked. Please contact support.');
        }

        // Verify password
        const isPasswordValid = await customer.comparePassword(password);

        if (!isPasswordValid) {
            return ResponseHelper.error(res, 401, 'Invalid credentials');
        }

        // Update last active
        customer.lastActive = new Date();
        await customer.save();

        logger.info(`Customer logged in: ${customer._id} (${customer.email})`);

        // Generate JWT token
        const token = jwt.sign(
            {
                id: customer._id,
                role: 'customer',
                restaurantId: customer.restaurantId
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return ResponseHelper.success(res, 200, 'Login successful', {
            customer: {
                id: customer._id,
                customerCode: customer.customerCode,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                loyaltyPoints: customer.loyalty.points,
                tier: customer.loyalty.tier,
                addresses: customer.addresses
            },
            token
        });

    } catch (error) {
        logger.error('Login customer error:', error);
        return ResponseHelper.error(res, 500, 'Failed to login');
    }
};

/**
 * Get Customer Profile
 * GET /api/customers/profile
 */
const getCustomerProfile = async (req, res) => {
    try {
        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id)
            .populate('referral.referredBy', 'fullName email')
            .populate('statistics.favoriteItems.menuId', 'name price images');

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        return ResponseHelper.success(res, 200, 'Profile retrieved successfully', {
            customer
        });

    } catch (error) {
        logger.error('Get customer profile error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve profile');
    }
};

/**
 * Update Customer Profile
 * PUT /api/customers/profile
 */
const updateCustomerProfile = async (req, res) => {
    try {
        const updateData = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        // Update allowed fields
        const allowedFields = ['fullName', 'email', 'alternatePhone', 'dateOfBirth', 'gender', 'preferences'];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (typeof updateData[field] === 'object' && !Array.isArray(updateData[field])) {
                    customer[field] = { ...customer[field], ...updateData[field] };
                } else {
                    customer[field] = updateData[field];
                }
            }
        });

        await customer.save();

        logger.info(`Customer profile updated: ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Profile updated successfully', {
            customer
        });

    } catch (error) {
        logger.error('Update customer profile error:', error);
        return ResponseHelper.error(res, 500, 'Failed to update profile');
    }
};

/**
 * Change Password
 * POST /api/customers/change-password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id).select('+password');

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        // Verify current password
        const isPasswordValid = await customer.comparePassword(currentPassword);

        if (!isPasswordValid) {
            return ResponseHelper.error(res, 401, 'Current password is incorrect');
        }

        // Update password
        customer.password = newPassword;
        await customer.save();

        logger.info(`Customer password changed: ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Password changed successfully');

    } catch (error) {
        logger.error('Change password error:', error);
        return ResponseHelper.error(res, 500, 'Failed to change password');
    }
};

/**
 * Add Address
 * POST /api/customers/addresses
 */
const addAddress = async (req, res) => {
    try {
        const addressData = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        // If this is set as default, unset other defaults
        if (addressData.isDefault) {
            customer.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // If no addresses exist, make this default
        if (customer.addresses.length === 0) {
            addressData.isDefault = true;
        }

        customer.addresses.push(addressData);
        await customer.save();

        logger.info(`Address added for customer: ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Address added successfully', {
            address: customer.addresses[customer.addresses.length - 1]
        });

    } catch (error) {
        logger.error('Add address error:', error);
        return ResponseHelper.error(res, 500, 'Failed to add address');
    }
};

/**
 * Update Address
 * PUT /api/customers/addresses/:addressId
 */
const updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const updateData = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        const address = customer.addresses.id(addressId);

        if (!address) {
            return ResponseHelper.notFound(res, 'Address not found');
        }

        // If setting as default, unset other defaults
        if (updateData.isDefault) {
            customer.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            address[key] = updateData[key];
        });

        await customer.save();

        logger.info(`Address updated for customer: ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Address updated successfully', {
            address
        });

    } catch (error) {
        logger.error('Update address error:', error);
        return ResponseHelper.error(res, 500, 'Failed to update address');
    }
};

/**
 * Delete Address
 * DELETE /api/customers/addresses/:addressId
 */
const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(req.user.id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        const address = customer.addresses.id(addressId);

        if (!address) {
            return ResponseHelper.notFound(res, 'Address not found');
        }

        const wasDefault = address.isDefault;

        customer.addresses.pull(addressId);

        // If deleted address was default, set first address as default
        if (wasDefault && customer.addresses.length > 0) {
            customer.addresses[0].isDefault = true;
        }

        await customer.save();

        logger.info(`Address deleted for customer: ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Address deleted successfully');

    } catch (error) {
        logger.error('Delete address error:', error);
        return ResponseHelper.error(res, 500, 'Failed to delete address');
    }
};


const getAllCustomers = async (req, res) => {
    try {
        const {
            restaurantId,
            status,
            tier,
            segment,
            minSpent,
            maxSpent,
            minOrders,
            maxOrders,
            registeredAfter,
            registeredBefore,
            lastOrderAfter,
            lastOrderBefore,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        // Build query
        const query = {};

        if (restaurantId) {
            query.restaurantId = restaurantId;
        } else if (req.user.role === 'manager' && req.assignedRestaurants) {
            query.restaurantId = { $in: req.assignedRestaurants };
        }

        if (status) query.status = status;
        if (tier) query['loyalty.tier'] = tier;
        if (segment) query['rfmScore.segment'] = segment;

        if (minSpent || maxSpent) {
            query['statistics.totalSpent'] = {};
            if (minSpent) query['statistics.totalSpent'].$gte = parseFloat(minSpent);
            if (maxSpent) query['statistics.totalSpent'].$lte = parseFloat(maxSpent);
        }

        if (minOrders || maxOrders) {
            query['statistics.totalOrders'] = {};
            if (minOrders) query['statistics.totalOrders'].$gte = parseInt(minOrders);
            if (maxOrders) query['statistics.totalOrders'].$lte = parseInt(maxOrders);
        }

        if (registeredAfter || registeredBefore) {
            query.createdAt = {};
            if (registeredAfter) query.createdAt.$gte = new Date(registeredAfter);
            if (registeredBefore) query.createdAt.$lte = new Date(registeredBefore);
        }

        if (lastOrderAfter || lastOrderBefore) {
            query['statistics.lastOrderDate'] = {};
            if (lastOrderAfter) query['statistics.lastOrderDate'].$gte = new Date(lastOrderAfter);
            if (lastOrderBefore) query['statistics.lastOrderDate'].$lte = new Date(lastOrderBefore);
        }

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { customerCode: { $regex: search, $options: 'i' } }
            ];
        }

        query.isDeleted = false;

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const [customers, totalCount] = await Promise.all([
            Customer.find(query)
                .select('-password')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Customer.countDocuments(query)
        ]);

        return ResponseHelper.success(res, 200, 'Customers retrieved successfully', {
            customers,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Get all customers error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve customers');
    }
};

/**
 * Get Customer by ID (Admin)
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;
        const Order = models.Order;

        const customer = await Customer.findById(id)
            .select('-password')
            .populate('statistics.favoriteItems.menuId', 'name price')
            .populate('referral.referredBy', 'fullName email')
            .populate('referral.referredCustomers.customerId', 'fullName email');

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        // Get recent orders
        const recentOrders = await Order.find({
            'customer.userId': customer._id
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderNumber status pricing.total createdAt')
            .lean();

        return ResponseHelper.success(res, 200, 'Customer retrieved successfully', {
            customer: {
                ...customer.toObject(),
                recentOrders
            }
        });

    } catch (error) {
        logger.error('Get customer by ID error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve customer');
    }
};

/**
 * Block Customer
 * POST /api/customers/:id/block
 */
const blockCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        await customer.blockCustomer(
            reason,
            req.user.id,
            req.user.role === 'manager' ? 'Manager' : 'Owner'
        );

        logger.warn(`Customer blocked: ${customer._id} by ${req.user.role}: ${req.user.id}`);

        return ResponseHelper.success(res, 200, 'Customer blocked successfully');

    } catch (error) {
        logger.error('Block customer error:', error);
        return ResponseHelper.error(res, 500, 'Failed to block customer');
    }
};

/**
 * Unblock Customer
 * POST /api/customers/:id/unblock
 */
const unblockCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const customer = await Customer.findById(id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        await customer.unblockCustomer();

        logger.info(`Customer unblocked: ${customer._id} by ${req.user.role}: ${req.user.id}`);

        return ResponseHelper.success(res, 200, 'Customer unblocked successfully');

    } catch (error) {
        logger.error('Unblock customer error:', error);
        return ResponseHelper.error(res, 500, 'Failed to unblock customer');
    }
};

/**
 * Award Loyalty Points (Admin)
 * POST /api/customers/loyalty/award
 */
const awardLoyaltyPoints = async (req, res) => {
    try {
        const { customerId, points, reason, source = 'manual' } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;
        const LoyaltyTransaction = models.LoyaltyTransaction;

        const customer = await Customer.findById(customerId);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        const previousBalance = customer.loyalty.points;
        await customer.awardPoints(points, reason);

        // Log transaction
        await LoyaltyTransaction.create({
            restaurantId: customer.restaurantId,
            customerId: customer._id,
            type: 'earned',
            points,
            previousBalance,
            newBalance: customer.loyalty.points,
            source,
            description: reason,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            createdBy: req.user.id,
            createdByModel: req.user.role === 'manager' ? 'Manager' : 'Owner'
        });

        logger.info(`${points} points awarded to customer ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Points awarded successfully', {
            customer: {
                id: customer._id,
                fullName: customer.fullName,
                previousPoints: previousBalance,
                currentPoints: customer.loyalty.points,
                tier: customer.loyalty.tier
            }
        });

    } catch (error) {
        logger.error('Award loyalty points error:', error);
        return ResponseHelper.error(res, 500, 'Failed to award points');
    }
};

/**
 * Redeem Loyalty Points (Customer)
 * POST /api/customers/loyalty/redeem
 */
const redeemLoyaltyPoints = async (req, res) => {
    try {
        const { points } = req.body;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;
        const LoyaltyTransaction = models.LoyaltyTransaction;

        const customer = await Customer.findById(req.user.id);

        if (!customer) {
            return ResponseHelper.notFound(res, 'Customer not found');
        }

        // Check minimum redemption
        const minRedemption = 50;
        if (points < minRedemption) {
            return ResponseHelper.error(res, 400, `Minimum redemption is ${minRedemption} points`);
        }

        const previousBalance = customer.loyalty.points;
        await customer.redeemPoints(points);

        // Calculate discount (100 points = ₹50)
        const discountAmount = (points / 100) * 50;

        // Log transaction
        await LoyaltyTransaction.create({
            restaurantId: customer.restaurantId,
            customerId: customer._id,
            type: 'redeemed',
            points: -points,
            previousBalance,
            newBalance: customer.loyalty.points,
            source: 'manual',
            description: `Redeemed ${points} points for ₹${discountAmount} discount`,
            redemption: {
                discountAmount
            },
            createdBy: req.user.id,
            createdByModel: 'Customer'
        });

        logger.info(`${points} points redeemed by customer ${customer._id}`);

        return ResponseHelper.success(res, 200, 'Points redeemed successfully', {
            customer: {
                id: customer._id,
                previousPoints: previousBalance,
                currentPoints: customer.loyalty.points,
                discountAmount
            }
        });

    } catch (error) {
        logger.error('Redeem loyalty points error:', error);
        return ResponseHelper.error(res, 500, error.message || 'Failed to redeem points');
    }
};

/**
 * Get Loyalty History
 * GET /api/customers/loyalty/history
 */
const getLoyaltyHistory = async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const models = getOwnerModels(req.ownerId);
        const LoyaltyTransaction = models.LoyaltyTransaction;

        const history = await LoyaltyTransaction.find({
            customerId: req.user.id
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        return ResponseHelper.success(res, 200, 'Loyalty history retrieved successfully', {
            history,
            total: history.length
        });

    } catch (error) {
        logger.error('Get loyalty history error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve loyalty history');
    }
};

/**
 * Get Customer Analytics
 * GET /api/customers/analytics
 */
const getCustomerAnalytics = async (req, res) => {
    try {
        const { restaurantId } = req.query;

        const models = getOwnerModels(req.ownerId);
        const Customer = models.Customer;

        const query = { isDeleted: false };
        if (restaurantId) query.restaurantId = restaurantId;

        const [
            totalCustomers,
            activeCustomers,
            vipCustomers,
            totalRevenue,
            customersByTier,
            customersBySegment,
            avgLifetimeValue
        ] = await Promise.all([
            Customer.countDocuments(query),
            Customer.countDocuments({ ...query, status: 'active' }),
            Customer.countDocuments({ ...query, 'loyalty.tier': { $in: ['gold', 'platinum'] } }),
            Customer.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$statistics.totalSpent' } } }
            ]),
            Customer.aggregate([
                { $match: query },
                { $group: { _id: '$loyalty.tier', count: { $sum: 1 } } }
            ]),
            Customer.aggregate([
                { $match: query },
                { $group: { _id: '$rfmScore.segment', count: { $sum: 1 } } }
            ]),
            Customer.aggregate([
                { $match: query },
                { $group: { _id: null, avgValue: { $avg: '$statistics.totalSpent' } } }
            ])
        ]);

        return ResponseHelper.success(res, 200, 'Customer analytics retrieved successfully', {
            analytics: {
                total: totalCustomers,
                active: activeCustomers,
                vip: vipCustomers,
                totalRevenue: totalRevenue[0]?.total || 0,
                avgLifetimeValue: avgLifetimeValue[0]?.avgValue || 0,
                byTier: customersByTier.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                bySegment: customersBySegment.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        logger.error('Get customer analytics error:', error);
        return ResponseHelper.error(res, 500, 'Failed to retrieve analytics');
    }
};


module.exports = {
    getAllCustomers,
    getCustomerById,
    blockCustomer,
    unblockCustomer,
    awardLoyaltyPoints,
    redeemLoyaltyPoints,
    getLoyaltyHistory,
    getCustomerAnalytics,
    registerCustomer,
    loginCustomer,
    getCustomerProfile,
    updateCustomerProfile,
    changePassword,
    addAddress,
    updateAddress,
    deleteAddress
};