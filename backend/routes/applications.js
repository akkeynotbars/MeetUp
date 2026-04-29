const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /api/applications — user applies to a job
router.post('/', requireAuth, requireRole('user'), async (req, res) => {
  const { job_id, match_percentage } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  const { data: existing } = await supabase
    .from('Applications')
    .select('id')
    .eq('job_id', job_id)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'You already applied to this job' });

  const insertData = { job_id, user_id: req.user.id, status: 'pending' };
  if (match_percentage != null) insertData.match_percentage = match_percentage;

  const { data, error } = await supabase
    .from('Applications')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Apply error:', error);
    return res.status(500).json({ error: error.message || 'Failed to apply' });
  }
  res.status(201).json({ message: 'Application submitted!', application: data });
});

// GET /api/applications/my — user's own applications
router.get('/my', requireAuth, requireRole('user'), async (req, res) => {
  const { data, error } = await supabase
    .from('Applications')
    .select('*, Jobs(title, location, job_type, Companies(name))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch applications' });
  res.json({ applications: data });
});

module.exports = router;
