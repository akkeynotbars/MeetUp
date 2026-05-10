const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF and DOCX allowed'));
  },
});

// POST /api/cv/upload — upload raw CV file to Supabase Storage
router.post('/upload', requireAuth, requireRole('user'), upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const ext = req.file.originalname.split('.').pop();
  const fileName = `${req.user.id}_${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('cvs')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file to storage', detail: error.message });
  }

  const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(fileName);
  res.json({ file_url: urlData.publicUrl, path: data.path });
});

// POST /api/cv/save — save or update the user's CV analysis result
router.post('/save', requireAuth, requireRole('user'), async (req, res) => {
  const { ai_score, ai_summary, red_flags, file_name, cv_text, file_url } = req.body;
  if (ai_score == null) return res.status(400).json({ error: 'ai_score is required' });

  const payload = {
    ai_score,
    ai_summary,
    red_flags: red_flags || [],
    file_url: file_url || file_name || null, // prefer real storage URL, fallback to filename
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
      .update(payload)
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
