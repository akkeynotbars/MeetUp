// JWT helpers — sign and verify tokens.
// Used by routes/auth.js (login) and middleware/auth.js (verify).

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  console.warn(
    '[jwt] JWT_SECRET is not set in .env. Tokens will be insecure. ' +
    'Set JWT_SECRET to a long random string before going to production.'
  );
}

/**
 * Sign a JWT for a given user.
 * Payload includes id, email, and role so the frontend can route on role
 * and protected endpoints can authorize without an extra DB hit.
 */
function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role, // 'user' or 'company'
  };
  return jwt.sign(payload, JWT_SECRET || 'insecure_dev_secret', {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT and return its payload.
 * Throws if invalid/expired — caller decides how to handle.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET || 'insecure_dev_secret');
}

module.exports = { signToken, verifyToken };
