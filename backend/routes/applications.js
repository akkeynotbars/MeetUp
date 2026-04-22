const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const auth = require('../middleware/authMiddleware');

// GET semua applicants untuk job tertentu (hanya company)
router.get('/job/:jobId', auth, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can view applicants' });
  }

  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', req.params.jobId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH shortlist applicant
router.patch('/:id/shortlist', auth, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can shortlist applicants' });
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'shortlisted' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Applicant shortlisted', application: data });
});

// PATCH reject applicant
router.patch('/:id/reject', auth, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can reject applicants' });
  }

  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'rejected' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Applicant rejected', application: data });
});

module.exports = router;