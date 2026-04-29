const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../supabase');
const auth = require('../middleware/authMiddleware');

// Setup multer (simpan di memory sementara)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// POST upload CV
router.post('/upload', auth, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileName = `${req.user.id}_${Date.now()}.pdf`;

  // Upload ke Supabase Storage
  const { data, error } = await supabase.storage
    .from('cvs')
    .upload(fileName, req.file.buffer, {
      contentType: 'application/pdf'
    });

  if (error) return res.status(500).json({ error: error.message });

  // Ambil public URL file
  const { data: urlData } = supabase.storage
    .from('cvs')
    .getPublicUrl(fileName);

  // Simpan URL ke tabel cvs di database
  const { data: cvRecord, error: dbError } = await supabase
    .from('cvs')
    .insert([{ user_id: req.user.id, file_url: urlData.publicUrl }])
    .select()
    .single();

  if (dbError) return res.status(500).json({ error: dbError.message });

  res.status(201).json({
    message: 'CV uploaded successfully',
    cv: cvRecord
  });
});

// GET CV milik user yang sedang login
router.get('/my-cv', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;