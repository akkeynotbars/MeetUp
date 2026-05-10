const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

async function verifyRecaptcha(token) {
  // Skip reCAPTCHA in development (no secret set or token is placeholder)
  if (!process.env.RECAPTCHA_SECRET || process.env.NODE_ENV === 'development') return true;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
    });
    const data = await res.json();
    return data.success && data.score >= 0.5;
  } catch {
    return true; // fail open if Google unreachable
  }
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, role, company_name, industry, recaptchaToken } = req.body;

  if (recaptchaToken) {
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
  }

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  if (!['user', 'company'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "user" or "company"' });
  }

  const { data: existing } = await supabase
    .from('Users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const password_hash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('Users')
    .insert({ name, email, password_hash, role })
    .select('id, name, email, role')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create account' });

  if (role === 'company' && company_name) {
    await supabase.from('Companies').insert({
      user_id: user.id,
      name: company_name,
      industry: industry || null,
    });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, recaptchaToken } = req.body;

  if (recaptchaToken) {
    const ok = await verifyRecaptcha(recaptchaToken);
    if (!ok) return res.status(400).json({ error: 'reCAPTCHA verification failed. Please try again.' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: user } = await supabase
    .from('Users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  const valid = user && await verifyPassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('Users')
    .select('id, name, email, role')
    .eq('id', req.user.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// GET /api/auth/company — get current user's company row
router.get('/company', requireAuth, async (req, res) => {
  const { data: company } = await supabase
    .from('Companies')
    .select('id, name, industry')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json({ company });
});

// PATCH /api/auth/change-password
router.patch('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields are required' });
  if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const { data: user } = await supabase.from('Users').select('password_hash').eq('id', req.user.id).maybeSingle();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await verifyPassword(current_password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const password_hash = await hashPassword(new_password);
  const { error } = await supabase.from('Users').update({ password_hash }).eq('id', req.user.id);
  if (error) return res.status(500).json({ error: 'Failed to update password' });

  res.json({ message: 'Password updated successfully' });
});

// PATCH /api/auth/profile — update name (and any extra columns that exist)
router.patch('/profile', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const { data: user, error } = await supabase
    .from('Users')
    .update({ name: name.trim() })
    .eq('id', req.user.id)
    .select('id, name, email, role')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update profile' });
  res.json({ user });
});

// PATCH /api/auth/company-profile — update company row + user name
router.patch('/company-profile', requireAuth, requireRole('company'), async (req, res) => {
  const { name, company_name, industry } = req.body;

  if (name && name.trim()) {
    await supabase.from('Users').update({ name: name.trim() }).eq('id', req.user.id);
  }

  const companyUpdates = {};
  if (company_name && company_name.trim()) companyUpdates.name = company_name.trim();
  if (industry && industry.trim()) companyUpdates.industry = industry.trim();

  if (Object.keys(companyUpdates).length) {
    await supabase.from('Companies').update(companyUpdates).eq('user_id', req.user.id);
  }

  const { data: user } = await supabase
    .from('Users')
    .select('id, name, email, role')
    .eq('id', req.user.id)
    .maybeSingle();

  const { data: company } = await supabase
    .from('Companies')
    .select('id, name, industry')
    .eq('user_id', req.user.id)
    .maybeSingle();

  res.json({ user, company });
});

module.exports = router;
