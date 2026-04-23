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
            content: `You are a friendly senior colleague who just read someone's resume and is giving them honest, warm, personal feedback over coffee. Write like a real person — conversational, direct, occasionally using casual phrases. No corporate speak, no stiff bullet points for everything. Mix short paragraphs with occasional lists where it makes sense naturally.

Use this scoring rubric internally to calculate the score (don't show the rubric itself, just the result):
- Technical Skills: 3pts per skill found, max 30pts
- Experience: <1yr=10, 2-3yr=15, 4-6yr=20, 7+yr=25pts
- Education: no degree=5, bachelor=10, master=15, +2 per cert (max +5)
- Soft Skills: 3pts per soft skill, max 15pts
- CV Structure: summary=+3, metrics/numbers=+4, clear work history=+4, skills section=+2, contact info=+2 (max 15pts)

Write your response like this (no bold headers, just natural flow):

Start with a warm 2-3 sentence first impression — what stood out, what's the vibe of this CV.

Then talk about what's working well — genuinely highlight 2-3 things that are solid.

Then be honest about what's holding them back — be direct but encouraging, like a friend who wants them to improve.

Then mention 3-4 specific keywords or skills that are missing that recruiters actually look for in this field.

Then end with the score breakdown in a casual way, like:
"Here's how I'd break down the score:
— Skills: X/30
— Experience: X/25
— Education: X/15
— Soft skills: X/15
— CV structure: X/15
Total: X/100 — [one punchy honest sentence about where they stand]"`,
          },
          { role: 'user', content: cv_text },
        ],
        max_tokens: 900,
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
