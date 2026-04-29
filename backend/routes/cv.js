const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /api/cv/save — save or update the user's CV analysis result
router.post('/save', requireAuth, requireRole('user'), async (req, res) => {
  const { ai_score, ai_summary, red_flags, file_name, cv_text } = req.body;
  if (ai_score == null) return res.status(400).json({ error: 'ai_score is required' });

  const payload = {
    ai_score,
    ai_summary,
    red_flags: red_flags || [],
    file_url: file_name || null,
    cv_text: cv_text || null,
  };

  // Check if user already has a CV record
  const { data: existing } = await supabase
    .from('CVs')
    .select('id')
    .eq('user_id', req.user.id)
    .maybeSingle();

  let result;
  if (existing) {
    const { data, error } = await supabase
      .from('CVs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) { console.error('CV update error:', error); return res.status(500).json({ error: 'Failed to save CV' }); }
    result = data;
  } else {
    const { data, error } = await supabase
      .from('CVs')
      .insert({ user_id: req.user.id, ...payload })
      .select()
      .single();
    if (error) { console.error('CV insert error:', error); return res.status(500).json({ error: 'Failed to save CV' }); }
    result = data;
  }

  res.json({ message: 'CV saved', cv: result });
});

// GET /api/cv/my — get the user's latest CV record
router.get('/my', requireAuth, requireRole('user'), async (req, res) => {
  const { data, error } = await supabase
    .from('CVs')
    .select('*')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to fetch CV' });
  res.json({ cv: data });
});

module.exports = router;
