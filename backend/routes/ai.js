const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// POST /api/ai/resume-summary — summarize a CV (FR-04)
router.post('/resume-summary', requireAuth, async (req, res) => {
  const { cv_text } = req.body;
  if (!cv_text) return res.status(400).json({ error: 'cv_text is required' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: "You are an expert HR recruiter. Analyze the resume and provide: 1) A brief summary, 2) Key strengths, 3) Areas for improvement, 4) Missing keywords for the job market, 5) An overall score out of 100. Be specific and actionable.",
          },
          { role: 'user', content: cv_text },
        ],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq error:', err);
      throw new Error('Groq error');
    }
    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '';
    res.json({ summary });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/score — score a CV against job requirements (FR-05)
router.post('/score', requireAuth, requireRole('company'), async (req, res) => {
  const { cv_text, job_requirements } = req.body;
  if (!cv_text || !job_requirements) {
    return res.status(400).json({ error: 'cv_text and job_requirements are required' });
  }

  const prompt = `You are a hiring assistant. Score the following resume against the job requirements.

Job Requirements:
${job_requirements}

Resume:
${cv_text}

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"score":<0-100>,"red_flags":[<up to 3 strings>],"strengths":[<up to 3 strings>]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
      }),
    });

    if (!response.ok) throw new Error('OpenAI error');
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(raw);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;
