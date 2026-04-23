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
            content: `You are an expert HR recruiter. Analyze the resume and provide a structured evaluation using this EXACT scoring rubric (total 100 points):

SCORING RUBRIC:
1. Technical Skills (max 30 pts): Award 3 points per relevant technical skill found (languages, frameworks, tools). Max 10 skills = 30 pts.
2. Experience (max 25 pts): Less than 1 year = 10pts, 2-3 years = 15pts, 4-6 years = 20pts, 7+ years = 25pts.
3. Education (max 15 pts): No degree = 5pts, Bachelor/S1 = 10pts, Master/S2 or higher = 15pts. Add 2pts per certification found (max +5pts total).
4. Soft Skills (max 15 pts): Award 3 points per soft skill mentioned (leadership, teamwork, communication, problem-solving, management, etc). Max 5 soft skills = 15pts.
5. CV Structure & Completeness (max 15 pts): Has professional summary = +3pts, has quantifiable achievements with numbers/metrics = +4pts, has clear work history with dates = +4pts, has dedicated skills section = +2pts, has contact information = +2pts.

Calculate the score transparently by showing points awarded in each category, then sum them for the final score.

Respond in this exact format:
**1. Brief Summary:**
[2-3 sentences overview]

**2. Key Strengths:**
[bullet points]

**3. Areas for Improvement:**
[bullet points]

**4. Missing Keywords for the Job Market:**
[bullet points]

**5. Score Breakdown:**
- Technical Skills: X/30 pts (list skills found)
- Experience: X/25 pts (state years found)
- Education: X/15 pts (state degree/certs found)
- Soft Skills: X/15 pts (list soft skills found)
- CV Structure: X/15 pts (list what's present/missing)

**Overall Score: X/100**
[one sentence verdict]`,
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
