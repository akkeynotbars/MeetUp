// Auth middleware — verifies the JWT on incoming requests.
// Attach to any route that requires a logged-in user.
//
// Usage:
//   const requireAuth = require('./middleware/auth');
//   app.get('/api/jobs', requireAuth, handler);
//
// Reads the token from the "Authorization: Bearer <token>" header.

const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      error: 'Missing or malformed Authorization header. Expected "Bearer <token>".',
    });
  }

  try {
    const payload = verifyToken(token);
    // Make user info available to downstream handlers via req.user
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth;
