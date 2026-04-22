const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const auth = require('../middleware/authMiddleware');

// GET semua jobs
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('Jobs').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST buat job baru (hanya company)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'company') {
    return res.status(403).json({ error: 'Only companies can post jobs' });
  }

  const { title, description, requirements, location } = req.body;

  const { data, error } = await supabase
    .from('Jobs')
    .insert([{ title, description, requirements, location, company_id: req.user.id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Job posted successfully', job: data });
});

// PUT edit job
router.put('/:id', auth, async (req, res) => {
  const { title, description, requirements, location } = req.body;

  const { data, error } = await supabase
    .from('Jobs')
    .update({ title, description, requirements, location })
    .eq('id', req.params.id)
    .eq('company_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Job updated', job: data });
});

// DELETE job
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('Jobs')
    .delete()
    .eq('id', req.params.id)
    .eq('company_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Job deleted successfully' });
});

module.exports = router;