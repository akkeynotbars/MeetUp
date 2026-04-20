const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// GET /api/applicants/:jobId — list applicants for a job (company only)
router.get('/:jobId', requireAuth, requireRole('company'), async (req, res) => {
  const { data: company } = await supabase
    .from('Companies')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (!company) return res.status(403).json({ error: 'Forbidden' });

  // Verify the job belongs to this company
  const { data: job } = await supabase
    .from('Jobs')
    .select('id')
    .eq('id', req.params.jobId)
    .eq('company_id', company.id)
    .maybeSingle();
  if (!job) return res.status(403).json({ error: 'Forbidden' });

  const { data, error } = await supabase
    .from('Applications')
    .select('*, Users(name, email), CVs(file_url, ai_score, ai_summary, red_flags)')
    .eq('job_id', req.params.jobId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed to fetch applicants' });
  res.json({ applicants: data });
});

// POST /api/applicants/:id/shortlist — shortlist an applicant (FR-07)
router.post('/:id/shortlist', requireAuth, requireRole('company'), async (req, res) => {
  const { data, error } = await supabase
    .from('Applications')
    .update({ status: 'shortlisted' })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Application not found' });
  res.json({ message: 'Applicant shortlisted', application: data });
});

// POST /api/applicants/:id/reject — reject an applicant (FR-07)
router.post('/:id/reject', requireAuth, requireRole('company'), async (req, res) => {
  const { data, error } = await supabase
    .from('Applications')
    .update({ status: 'rejected' })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error || !data) return res.status(404).json({ error: 'Application not found' });
  res.json({ message: 'Applicant rejected', application: data });
});

module.exports = router;
