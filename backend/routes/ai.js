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
            content: `You are a friendly senior HR colleague analyzing a resume. Use this scoring rubric internally (never reveal individual scores to the user):
- Technical Skills: 3pts per relevant skill found (languages, frameworks, tools), max 30pts
- Experience: <1yr=10pts, 2-3yr=15pts, 4-6yr=20pts, 7+yr=25pts
- Education: no degree=5pts, bachelor=10pts, master=15pts, +2pts per certification (max +5pts bonus)
- Soft Skills: 3pts per soft skill found (leadership, teamwork, communication, etc), max 15pts
- CV Structure: has summary=+3, has metrics/numbers=+4, clear work history with dates=+4, skills section=+2, contact info=+2, max 15pts

Calculate all scores internally, then respond ONLY with valid JSON (no markdown, no explanation outside the JSON):
{
  "summary": "2-3 warm conversational sentences about the overall impression, like a friend giving feedback",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "missing_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "scores": {
    "technical": <0-30>,
    "experience": <0-25>,
    "education": <0-20>,
    "soft_skills": <0-15>,
    "structure": <0-15>,
    "total": <0-100>
  }
}`,
          },
          { role: 'user', content: cv_text },
        ],
        max_tokens: 900,
        temperature: 0,
        seed: 42,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq error:', err);
      throw new Error('Groq error');
    }
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(result);
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
