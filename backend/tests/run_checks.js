const assert = require('assert');
const { getOwnerModels } = require('../src/models');
const { generateTokenPair, verifyRefreshToken } = require('../src/config/jwt');

(async () => {
  try {
    console.log('Running basic repo checks...');

    // 1) getOwnerModels returns expected model getters
    const ownerId = 'testowner1234567890abcdef';
    const models = getOwnerModels(ownerId);
    const expectedModels = ['Restaurant','Manager','Employee','Menu','Order','Customer','Table','Reservation','Inventory','Coupon','LoyaltyPoint','Transaction','Notification','AuditLog'];

    expectedModels.forEach(name => {
      assert.ok(models[name], `Expected owner model ${name} to be present`);
    });
    console.log('✔ getOwnerModels returned expected model getters');

    // 2) JWT refresh token contains role and ownerId when generated
    const payload = { userId: 'abc123', role: 'manager', ownerId: 'owner_test' };
    const tokens = generateTokenPair(payload);
    assert.ok(tokens.accessToken, 'accessToken should be present');
    assert.ok(tokens.refreshToken, 'refreshToken should be present');

    const decoded = verifyRefreshToken(tokens.refreshToken);
    assert.strictEqual(decoded.userId, payload.userId, 'refresh token should contain userId');
    assert.strictEqual(decoded.role, payload.role, 'refresh token should contain role');
    assert.strictEqual(decoded.ownerId, payload.ownerId, 'refresh token should contain ownerId');
    console.log('✔ JWT refresh token contains expected claims');

    console.log('\nAll checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('Checks failed:', err.message || err);
    process.exit(2);
  }
})();
