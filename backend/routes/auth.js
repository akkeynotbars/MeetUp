// Auth routes:
//   POST /api/auth/signup  — Task 10 (Nasyith, FR-01)
//   POST /api/auth/login   — Task 11 (Nasyith, FR-01)
//
// Notes for the team:
// - Passwords are hashed with bcrypt before being saved (Task 12, NFR-01).
// - On successful login we return a JWT containing the user's role,
//   so the frontend (Kent's Task 16) can redirect to the right dashboard
//   and downstream protected endpoints can use middleware/role.js (Task 13).

const express = require('express');
const router = express.Router();

const supabase = require('../config/supabase');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');

const VALID_ROLES = ['user', 'company'];

// Very basic email shape check. We do NOT try to fully validate emails here —
// real verification happens via the email confirmation flow.
function looksLikeEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// =============================================================================
// POST /api/auth/signup
// Body: { email, password, full_name, role, company_name?, industry? }
// =============================================================================
router.post('/signup', async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      role,
      company_name,
      industry,
    } = req.body || {};

    // ---- Validation ----
    if (!looksLikeEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (typeof full_name !== 'string' || full_name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}.` });
    }
    if (role === 'company') {
      if (typeof company_name !== 'string' || company_name.trim().length === 0) {
        return res.status(400).json({ error: 'Company name is required for company accounts.' });
      }
    }

    // ---- Duplicate-email check ----
    const { data: existing, error: lookupErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (lookupErr) {
      console.error('[signup] lookup error:', lookupErr);
      return res.status(500).json({ error: 'Database error during signup.' });
    }
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // ---- Hash password (NEVER store plain text!) ----
    const password_hash = await hashPassword(password);

    // ---- Insert user ----
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        full_name: full_name.trim(),
        role,
      })
      .select('id, email, full_name, role, created_at')
      .single();

    if (insertErr) {
      console.error('[signup] insert error:', insertErr);
      return res.status(500).json({ error: 'Could not create account.' });
    }

    // ---- If company, also insert into companies table ----
    if (role === 'company') {
      const { error: companyErr } = await supabase
        .from('companies')
        .insert({
          user_id: newUser.id,
          name: company_name.trim(),
          industry: industry || null,
          status: 'pending_verification',
        });

      if (companyErr) {
        // Best effort — log and continue. A cleanup task can backfill.
        console.error('[signup] companies insert error:', companyErr);
      }
    }

    return res.status(201).json({
      message: 'Account created.',
      user: newUser,
    });
  } catch (err) {
    console.error('[signup] unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

// =============================================================================
// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user: { id, email, full_name, role } }
// =============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!looksLikeEmail(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Look the user up
    const { data: user, error: lookupErr } = await supabase
      .from('users')
      .select('id, email, full_name, role, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (lookupErr) {
      console.error('[login] lookup error:', lookupErr);
      return res.status(500).json({ error: 'Database error during login.' });
    }

    // Use the SAME error message for "no such email" and "wrong password"
    // so attackers can't enumerate which emails are registered.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Build the JWT (contains role for Kent's Task 16 redirect logic)
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
});

// =============================================================================
// GET /api/auth/me
// Returns the current user's info (decoded from the JWT).
// Useful for the frontend to verify a stored token is still valid.
// =============================================================================
const requireAuth = require('../middleware/auth');
router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
