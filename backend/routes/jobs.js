const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/jobs — public list of active jobs
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('Jobs')
    .select('*, Companies(name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch jobs' });
  res.json({ jobs: data });
});

// GET /api/jobs/my — company's own jobs (all statuses)
router.get('/my', requireAuth, requireRole('company'), async (req, res) => {
  const { data: company } = await supabase
    .from('Companies')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(404).json({ error: 'Company profile not found' });

  const { data, error } = await supabase
    .from('Jobs')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch jobs' });
  res.json({ jobs: data });
});

// POST /api/jobs — create a job posting
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { title, description, requirements, location, salary_range, job_type } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const { data: company } = await supabase
    .from('Companies')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(404).json({ error: 'Company profile not found' });

  const { data, error } = await supabase
    .from('Jobs')
    .insert({ company_id: company.id, title, description, requirements, location, salary_range, job_type, status: 'active' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'Failed to create job' });
  res.status(201).json({ job: data });
});

// PUT /api/jobs/:id — edit a job
router.put('/:id', requireAuth, requireRole('company'), async (req, res) => {
  const { title, description, requirements, location, salary_range, job_type, status } = req.body;

  const { data: company } = await supabase
    .from('Companies')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(404).json({ error: 'Company profile not found' });

  const { data, error } = await supabase
    .from('Jobs')
    .update({ title, description, requirements, location, salary_range, job_type, status })
    .eq('id', req.params.id)
    .eq('company_id', company.id)
    .select()
    .maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Job not found or unauthorized' });
  res.json({ job: data });
});

// DELETE /api/jobs/:id — delete a job
router.delete('/:id', requireAuth, requireRole('company'), async (req, res) => {
  const { data: company } = await supabase
    .from('Companies')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(404).json({ error: 'Company profile not found' });

  const { error } = await supabase
    .from('Jobs')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', company.id);
  if (error) return res.status(404).json({ error: 'Job not found or unauthorized' });
  res.json({ message: 'Job deleted' });
});

module.exports = router;
