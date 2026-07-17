const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function generateAccessToken(payload) {
  // Access token umur pendek (15 menit) sesuai blueprint security
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(payload) {
  // Refresh token umur panjang (7 hari)
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
