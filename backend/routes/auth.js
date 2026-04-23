const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');

async function verifyRecaptcha(token) {
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET}&response=${token}`,
  });
  const data = await res.json();
  return data.success && data.score >= 0.5;
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

module.exports = router;
