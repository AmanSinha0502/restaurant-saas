const jwt = require('jsonwebtoken');

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_min_32_chars_here',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_min_32_chars',
  accessTokenExpiry: process.env.JWT_EXPIRE || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRE || '7d'
};

// Generate access token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiry
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshTokenExpiry
  });
};

// Verify access token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Generate token pair (access + refresh)
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: payload.userId });
  
  return {
    accessToken,
    refreshToken
  };
};

module.exports = {
  jwtConfig,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair
};