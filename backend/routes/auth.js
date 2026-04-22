const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

// SIGNUP
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Cek apakah email sudah ada
  const { data: existing } = await supabase
    .from('Users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Simpan ke Supabase
  const { data, error } = await supabase
    .from('Users')
    .insert([{ name, email, password: hashedPassword, role }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ message: 'Signup successful', user: { id: data.id, name, email, role } });
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Cari user di database
  const { data: user, error } = await supabase
    .from('Users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Cek password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Buat JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ message: 'Login successful', token, role: user.role });
});

module.exports = router;