// Role-checking middleware (Task 13 — Min, FR-02).
//
// After login the JWT contains the user's role ('user' or 'company').
// Use this middleware to restrict an endpoint to one or more roles.
//
// Usage:
//   const requireAuth = require('./middleware/auth');
//   const requireRole = require('./middleware/role');
//
//   app.post('/api/jobs', requireAuth, requireRole('company'), postJob);
//   app.get('/api/applications/me', requireAuth, requireRole('user'), listMyApplications);
//
// Pass multiple roles to allow either:
//   requireRole('user', 'company')
//
// requireAuth must run BEFORE requireRole so req.user is populated.

function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated. requireAuth must run before requireRole.',
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. This endpoint requires role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = requireRole;
