// Password hashing helpers (Task 12 — NFR-01).
//
// NEVER store plain-text passwords in the database.
// Always hash with bcrypt before saving, and compare with bcrypt.compare on login.

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

/**
 * Hash a plain-text password.
 * @param {string} plain - the user's raw password
 * @returns {Promise<string>} - the hashed password to store in the DB
 */
async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Check a plain-text password against a stored hash.
 * @param {string} plain - the password the user just typed in
 * @param {string} hash  - the hash we previously stored
 * @returns {Promise<boolean>} - true if they match
 */
async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
