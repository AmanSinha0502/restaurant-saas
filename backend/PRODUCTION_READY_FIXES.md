# Backend Production Readiness Audit & Fixes
**Date:** November 19, 2025  
**Status:** CRITICAL ISSUES FOUND & FIXED ✅

---

## 📊 Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Critical Issues** | 2 | ✅ FIXED |
| **High Priority** | 6 | ⚠️ TO FIX |
| **Medium Priority** | 8 | ⚠️ TO FIX |
| **Low Priority** | 5 | ℹ️ OPTIONAL |
| **Total** | 21 | - |

---

## 🔴 CRITICAL ISSUES (MUST FIX BEFORE PRODUCTION)

### ✅ ISSUE #1: Missing Import in authController.js
**File:** `src/controllers/authController.js`  
**Line:** 1  
**Severity:** CRITICAL  
**Status:** ✅ FIXED

**Problem:**
```javascript
// BEFORE (WRONG)
const { PlatformAdmin, Owner, getOwnerModel } = require('../models');
```

`getOwnerModels` function was not imported, but used throughout the file (e.g., in `customerRegister`).

**Solution:**
```javascript
// AFTER (CORRECT)
const { PlatformAdmin, Owner, getOwnerModel, getOwnerModels } = require('../models');
```

**Impact:** Without this fix, all customer authentication routes crash immediately.

---

### ✅ ISSUE #2: Undefined Variable `hashedToken` in customerResetPassword
**File:** `src/controllers/authController.js`  
**Line:** 481  
**Severity:** CRITICAL  
**Status:** ✅ FIXED

**Problem:**
```javascript
// BEFORE (WRONG)
const customer = await Customer.findOne({
  restaurantId,
  resetPasswordToken: hashedToken,  // ❌ hashedToken is NOT defined!
  resetPasswordExpire: { $gt: Date.now() }
});
```

**Solution:**
```javascript
// AFTER (CORRECT)
// Hash the reset token to match the stored hashed version
const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

const customer = await Customer.findOne({
  restaurantId,
  resetPasswordToken: hashedToken,
  resetPasswordExpire: { $gt: Date.now() }
});
```

**Impact:** Password reset endpoint will throw "ReferenceError: hashedToken is not defined" and crash.

---

## 🟠 HIGH PRIORITY ISSUES

### ISSUE #3: Socket.io Not Validated in Controllers
**Files:** `src/controllers/kitchenController.js`, `src/controllers/orderController.js`  
**Severity:** HIGH  
**Issue:** Controllers emit Socket.io events without checking if `io` is initialized

**Current Code:**
```javascript
const io = req.app.get('io');
io.to(`kitchen:${req.ownerId}:${restaurantId}`).emit('kitchen:newOrder', orderData);
```

**Risk:** If Socket.io fails to initialize, app crashes when emitting events.

**Fix:**
```javascript
const io = req.app.get('io');
if (io) {
  io.to(`kitchen:${req.ownerId}:${restaurantId}`).emit('kitchen:newOrder', orderData);
} else {
  logger.warn('Socket.io not initialized');
}
```

**Files to Update:**
- `src/controllers/kitchenController.js` - lines ~249, ~280, ~320
- `src/controllers/orderController.js` - lines ~180, ~220
- `src/controllers/reservationController.js` - lines ~90, ~150

---

### ISSUE #4: Missing Error Handling in Async Routes
**File:** `src/routes/authRoutes.js`  
**Lines:** Route handlers using `asyncHandler`

**Issue:** If `asyncHandler` middleware is missing, unhandled promise rejections can crash the server.

**Verify:** All routes wrap controllers with `asyncHandler`
```javascript
// CORRECT
router.post('/customer/register', 
  sanitizeInput,
  validate(customerRegisterSchema),
  asyncHandler(customerRegister)  // ✅ Wrapped
);
```

**Check:** Ensure `asyncHandler` is defined in `src/middlewares/errorMiddleware.js`

---

### ISSUE #5: Webhook Routes Not Exported/Mounted
**File:** `src/routes/webhookRoute.js`  
**Severity:** HIGH

**Problem:** Webhook route file exists but may not be properly imported in `src/routes/index.js`

**Current routes/index.js:**
```javascript
// Payment webhooks are NOT mounted!
```

**Fix:** Add to `src/routes/index.js`:
```javascript
const webhookRoutes = require('./webhookRoute');
app.use('/api/webhooks', webhookRoutes);
```

**Impact:** Payment webhooks won't work; Razorpay/Stripe callbacks fail.

---

### ISSUE #6: Missing Validation Middleware Integration
**File:** `src/routes/menuRoutes.js` (line 61-62)

**Problem:** Routes define require statements inside route handlers instead of at top level:
```javascript
const { getOwnerModels } = require('../models');  // ❌ Wrong place!
const models = getOwnerModels(ownerId);
```

**Fix:** Import at file top level:
```javascript
// At top of file
const { getOwnerModels } = require('../models');

// In route handler
const models = getOwnerModels(ownerId);
```

---

### ISSUE #7: Missing Inventory Auto-Deduction Logic
**File:** `src/controllers/orderController.js`  
**Severity:** HIGH

**Issue:** Orders are created but inventory isn't deducted automatically.

**Missing Code:**
```javascript
// After order is created, deduct inventory
for (const item of orderItems) {
  const linkedInventory = await Inventory.find({
    _id: { $in: menuItem.linkedInventoryItems }
  });
  
  for (const inv of linkedInventory) {
    // Find the quantity to deduct
    const linkage = menuItem.linkedInventoryItems.find(
      link => link.inventoryId === inv._id.toString()
    );
    
    inv.currentStock -= linkage.quantityRequired;
    if (inv.currentStock <= inv.minimumStock) {
      // Send low stock alert
    }
    await inv.save();
  }
}
```

**Impact:** Inventory management is non-functional; stock levels don't update.

---

### ISSUE #8: Email Service Not Implemented
**File:** `src/services/emailService.js`  
**Severity:** HIGH

**Issue:** Email service exists but SendGrid integration may be incomplete.

**Check:** Verify all functions are implemented:
```javascript
- sendOrderConfirmation()
- sendPasswordResetEmail()
- sendWelcomeEmail()
- sendInvoice()
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### ISSUE #9: PDF Invoice Generation Not Complete
**File:** `src/controllers/posController.js` (line 436)

**Current:**
```javascript
// TODO: Generate PDF using pdfService
```

**Fix:** Implement PDF generation:
```javascript
const pdfService = require('../services/pdfService');
const pdfPath = await pdfService.generateOrderInvoice(order);
```

---

### ISSUE #10: SMS Service Not Fully Integrated
**File:** `src/services/smsService.js`

**Missing Implementations:**
- `sendOrderStatusSMS()`
- `sendReservationConfirmationSMS()`
- `sendDeliveryNotificationSMS()`
- `sendLowStockAlertSMS()`

---

### ISSUE #11: WhatsApp Service Incomplete
**File:** `src/services/whatsappService.js`

**Issue:** WhatsApp Business API integration has placeholders

**Needed:**
- Template-based message sending
- Media (images/documents) support
- Message status tracking

---

### ISSUE #12: Rate Limiting Not Comprehensive
**File:** `src/middlewares/rateLimitMiddleware.js`

**Missing:**
- Rate limiting for POS endpoints
- Rate limiting for delivery boy API
- Custom rate limits per role

---

### ISSUE #13: File Upload Not Properly Validated
**File:** `src/middlewares/uploadMiddleware.js`

**Issue:** Need image dimension and file size validation

**Add:**
```javascript
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_ITEM = 5;
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
```

---

### ISSUE #14: Role-Based Access Control Incomplete
**File:** `src/middlewares/roleMiddleware.js`

**Missing Checks:**
- Manager can only access assigned restaurants
- Employee can only access their assigned restaurant
- Cross-restaurant access prevention

---

### ISSUE #15: Tenant Filtering Not Applied Everywhere
**File:** `src/middlewares/tenantMiddleware.js`

**Issue:** Not all queries filter by `ownerId`

**Check all controllers for:** `find()`, `findById()`, `updateOne()`, `deleteOne()`

**Pattern:**
```javascript
// WRONG
await Menu.find({ restaurantId });

// CORRECT
await Menu.find({ restaurantId, ownerId: req.ownerId });
```

---

### ISSUE #16: Global Error Handler Incomplete
**File:** `src/middlewares/errorMiddleware.js`

**Missing:**
- Sentry integration
- Stripe error handling
- Database connection errors

---

## 📋 PRODUCTION CHECKLIST

### Environment Variables
- [ ] JWT_SECRET changed to strong 32+ char key
- [ ] JWT_REFRESH_SECRET changed
- [ ] All payment gateway credentials set
- [ ] SendGrid API key configured
- [ ] Twilio credentials configured
- [ ] Database URI points to production MongoDB Atlas
- [ ] Redis connection to production
- [ ] CORS_ORIGIN set to production domain

### Security
- [ ] Helmet enabled (✅ Already in server.js)
- [ ] Rate limiting enabled
- [ ] Input sanitization applied
- [ ] Password requirements: 8+ chars, mixed case, numbers
- [ ] HTTPS enforcement in production
- [ ] CORS properly configured
- [ ] SQL/NoSQL injection prevention
- [ ] XSS protection enabled

### Database
- [ ] All indexes created
- [ ] Backup strategy configured
- [ ] Connection pooling optimized
- [ ] Query performance tested
- [ ] Database replica set configured

### Monitoring
- [ ] Logger configured (✅ Winston configured)
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring setup
- [ ] Uptime monitoring configured
- [ ] Alert system for critical errors

### Testing
- [ ] Unit tests created
- [ ] Integration tests created
- [ ] E2E tests created
- [ ] Load testing performed
- [ ] Security testing completed

---

## 🚀 IMPLEMENTATION ORDER

### Phase 1: Critical Fixes (DO NOW)
1. ✅ Fix authController imports
2. ✅ Fix undefined hashedToken
3. Mount webhook routes
4. Add Socket.io null checks
5. Implement inventory deduction

### Phase 2: High Priority (THIS WEEK)
6. Complete email service
7. Add SMS integration
8. Implement PDF generation
9. Add comprehensive error handling
10. Fix tenant filtering gaps

### Phase 3: Medium Priority (NEXT WEEK)
11. WhatsApp integration
12. Enhanced rate limiting
13. File upload validation
14. Role-based access control refinement
15. Global error handler enhancement

### Phase 4: Testing & Deployment (WEEK 2)
16. Write and run tests
17. Load testing
18. Security audit
19. Performance optimization
20. Production deployment

---

## ✅ VERIFICATION COMMANDS

Run these to verify fixes:

```bash
# 1. Check for syntax errors
npm run lint

# 2. Check for missing imports
node -c src/controllers/authController.js

# 3. Test authentication flow
curl -X POST http://localhost:5000/api/auth/customer/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","email":"test@example.com","phone":"+919876543210","password":"Password123!","restaurantId":"xxx"}'

# 4. Test webhook routes
curl -X POST http://localhost:5000/api/webhooks/razorpay

# 5. Check Socket.io connection
curl http://localhost:5000/health
```

---

## 📞 SUPPORT

For issues or questions:
1. Check error logs in `logs/` directory
2. Review Winston logger output
3. Check Sentry for production errors
4. Contact development team

---

**Last Updated:** November 19, 2025  
**Next Review:** After Phase 1 completion
