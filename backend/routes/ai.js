const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// =====================
// DETERMINISTIC SCORING ENGINE
// =====================
function calculateScore(text) {
  const t = text.toLowerCase();

  // 1. Technical Skills (max 30) — 3pts per skill found
  const techSkills = [
    'javascript','typescript','python','java','php','c++','c#','ruby','go','rust','swift','kotlin',
    'react','vue','angular','next.js','nuxt','svelte','node.js','express','django','laravel','spring',
    'html','css','sass','tailwind','bootstrap','jquery',
    'sql','mysql','postgresql','mongodb','redis','firebase','supabase',
    'docker','kubernetes','aws','azure','gcp','linux','git','ci/cd','rest api','graphql',
    'machine learning','tensorflow','pytorch','data analysis','pandas','numpy',
  ];
  const foundTech = techSkills.filter(s => t.includes(s));
  const technicalScore = Math.min(foundTech.length * 3, 30);

  // 2. Experience (max 25)
  let experienceScore = 10;
  const yearMatches = t.match(/(\d+)\+?\s*years?/g) || [];
  const maxYears = yearMatches.reduce((max, m) => {
    const n = parseInt(m); return n > max ? n : max;
  }, 0);
  if (maxYears >= 7) experienceScore = 25;
  else if (maxYears >= 4) experienceScore = 20;
  else if (maxYears >= 2) experienceScore = 15;
  else if (maxYears >= 1) experienceScore = 12;

  // 3. Education (max 20)
  let educationScore = 5;
  if (t.includes('master') || t.includes('s2') || t.includes('msc') || t.includes('m.sc') || t.includes('mba')) educationScore = 15;
  else if (t.includes('bachelor') || t.includes('s1') || t.includes('bsc') || t.includes('b.sc') || t.includes('sarjana')) educationScore = 10;
  const certCount = (t.match(/certif|certified|aws certified|google certified|microsoft certified|comptia/g) || []).length;
  educationScore = Math.min(educationScore + certCount * 2, 20);

  // 4. Soft Skills (max 15) — 3pts per soft skill
  const softSkills = [
    'leadership','teamwork','communication','collaboration','problem.solving','adaptability',
    'management','mentoring','presentation','negotiation','critical thinking','time management',
    'organized','initiative','motivated','analytical',
  ];
  const foundSoft = softSkills.filter(s => new RegExp(s).test(t));
  const softScore = Math.min(foundSoft.length * 3, 15);

  // 5. CV Structure (max 15)
  let structureScore = 0;
  if (t.includes('summary') || t.includes('objective') || t.includes('profile') || t.includes('about me')) structureScore += 3;
  if (/\d+%|\d+x|\$\d+|\d+ (users|clients|projects|teams|members)/.test(t)) structureScore += 4;
  if (/20\d\d\s*[-–]\s*(20\d\d|present|current|now)/.test(t)) structureScore += 4;
  if (t.includes('skill') || t.includes('technology') || t.includes('tools')) structureScore += 2;
  if (t.includes('@') || t.includes('phone') || t.includes('linkedin') || /\+\d{5,}/.test(t)) structureScore += 2;

  const total = technicalScore + experienceScore + educationScore + softScore + structureScore;

  return {
    technical: technicalScore,
    experience: experienceScore,
    education: educationScore,
    soft_skills: softScore,
    structure: structureScore,
    total,
    foundTech: foundTech.slice(0, 10),
  };
}

// POST /api/ai/resume-summary — summarize a CV (FR-04)
router.post('/resume-summary', requireAuth, async (req, res) => {
  const { cv_text } = req.body;
  if (!cv_text) return res.status(400).json({ error: 'cv_text is required' });

  // Calculate score deterministically
  const scores = calculateScore(cv_text);

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
            content: `You are a friendly senior HR colleague giving honest, warm resume feedback like a friend over coffee. Be specific, direct, and encouraging — no corporate speak.

Respond ONLY with valid JSON (no markdown):
{
  "summary": "2-3 casual, warm sentences about the overall impression of this person's profile",
  "improvements": ["specific actionable tip 1", "specific actionable tip 2", "specific actionable tip 3"],
  "missing_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`,
          },
          { role: 'user', content: cv_text },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Groq error:', err);
      throw new Error('Groq error');
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const aiResult = JSON.parse(raw.replace(/```json|```/g, '').trim());

    res.json({ ...aiResult, scores });
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

  const scores = calculateScore(cv_text);

  const prompt = `You are a hiring assistant. Based on this resume and job requirements, provide strengths and red flags.

Job Requirements: ${job_requirements}
Resume: ${cv_text}

Respond ONLY with valid JSON:
{"red_flags":["flag1","flag2"],"strengths":["strength1","strength2"]}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0,
      }),
    });

    if (!response.ok) throw new Error('Groq error');
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json({ ...result, score: scores.total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/match — hiring probability: how well does this user's CV match a job? (FR-10)
router.post('/match', requireAuth, async (req, res) => {
  const { job_id } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  // Fetch user's stored CV text
  const supabase = require('../config/supabase');
  const { data: cv } = await supabase
    .from('CVs')
    .select('cv_text, ai_score')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!cv?.cv_text) {
    return res.json({ match_percentage: null, message: 'Upload and analyze your CV first to see match score.' });
  }

  // Fetch job requirements
  const { data: job } = await supabase
    .from('Jobs')
    .select('title, description, requirements')
    .eq('id', job_id)
    .maybeSingle();

  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Deterministic keyword match (fast, free, consistent)
  const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
  const cvText = cv.cv_text.toLowerCase();

  // Extract meaningful words from job (3+ chars, not stopwords)
  const stopwords = new Set(['the','and','for','are','with','this','that','have','from','been','will','can','our','you','your','their','they','but','not','was','its','has','who','what','how','all','any','use','using','new','one','also','which','more']);
  const jobWords = [...new Set(
    jobText.match(/[a-z][a-z+#.]{2,}/g)?.filter(w => !stopwords.has(w)) || []
  )];

  if (jobWords.length === 0) return res.json({ match_percentage: 50, matched_skills: [], missing_skills: [] });

  const matched = jobWords.filter(w => cvText.includes(w));
  const missing = jobWords.filter(w => !cvText.includes(w)).slice(0, 8);

  // Base match from keyword overlap
  let match = Math.round((matched.length / jobWords.length) * 100);

  // Bonus: user's overall AI score boosts confidence (up to +10)
  if (cv.ai_score) match = Math.min(match + Math.round(cv.ai_score / 10), 95);

  // Floor at 10% so it never shows 0
  match = Math.max(match, 10);

  res.json({
    match_percentage: match,
    matched_skills: matched.slice(0, 8),
    missing_skills: missing,
  });
});


// =====================
// GROQ HELPER
// =====================
async function groq(messages, maxTokens = 500, temperature = 0.3) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages, max_tokens: maxTokens, temperature }),
  });
  if (!response.ok) throw new Error('Groq API error');
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw.replace(/```json\n?|```/g, '').trim());
}

// =====================
// INTERVIEW (FR-13)
// =====================

// POST /api/ai/interview/start — get opening interview question
router.post('/interview/start', requireAuth, async (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'category is required' });
  try {
    const result = await groq([{
      role: 'system',
      content: `You are a professional technical interviewer for a ${category} position. Ask a warm, focused opening question.
Respond ONLY with valid JSON: {"question": "your opening interview question here"}`,
    }], 200, 0.7);
    res.json({ question: result.question || 'Tell me about yourself and your relevant experience.' });
  } catch (e) {
    console.error(e);
    res.json({ question: `Tell me about yourself and your experience with ${category}.` });
  }
});

// POST /api/ai/interview/answer — evaluate answer, return feedback + next question
router.post('/interview/answer', requireAuth, async (req, res) => {
  const { category, question, answer, question_number, total_questions } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });
  const isLast = question_number >= (total_questions || 5);
  try {
    const result = await groq([
      {
        role: 'system',
        content: `You are a technical interviewer for a ${category} role. Evaluate the answer and ${isLast ? 'give a final summary — no next question.' : 'ask the next question on a different topic.'}
Respond ONLY with valid JSON (no markdown):
{
  "feedback": {
    "relevance": "Excellent|Good|Average|Needs Improvement",
    "clarity": "Excellent|Good|Average|Needs Improvement",
    "confidence": "Excellent|Good|Average|Needs Improvement",
    "score": <40-100>,
    "comment": "1-2 sentence honest feedback"
  },
  "next_question": ${isLast ? 'null' : '"next question string"'},
  "is_final": ${isLast}
}`,
      },
      { role: 'user', content: `Question: ${question}\n\nAnswer: ${answer}` },
    ], 450, 0.3);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// =====================
// GRADE DETECTION & VERIFICATION (FR-14, FR-15)
// =====================

// POST /api/ai/grade/detect — detect grade from stored CV
router.post('/grade/detect', requireAuth, async (req, res) => {
  const supabase = require('../config/supabase');
  const { data: cv } = await supabase.from('CVs').select('cv_text, ai_score').eq('user_id', req.user.id).maybeSingle();
  if (!cv?.cv_text) return res.json({ grade: null, message: 'Upload and analyze your CV first.' });

  // Deterministic fallback
  const score = cv.ai_score || 0;
  const fallbackGrade = score >= 85 ? 'Senior' : score >= 70 ? 'Mid-Level' : score >= 50 ? 'Junior' : 'Entry-Level';

  try {
    const result = await groq([
      {
        role: 'system',
        content: `You are a career expert. Analyze this resume and determine the candidate's experience level.
Respond ONLY with valid JSON:
{"grade":"Entry-Level|Junior|Mid-Level|Senior","reasoning":"1-2 sentence explanation","years_experience":<number or null>,"key_signals":["signal1","signal2","signal3"]}`,
      },
      { role: 'user', content: cv.cv_text.slice(0, 3000) },
    ], 300, 0.1);
    res.json(result);
  } catch (e) {
    res.json({ grade: fallbackGrade, reasoning: `Based on your CV score of ${score}/100.`, years_experience: null, key_signals: [] });
  }
});

// POST /api/ai/grade/quiz — generate 5 verification questions
router.post('/grade/quiz', requireAuth, async (req, res) => {
  const { grade } = req.body;
  if (!grade) return res.status(400).json({ error: 'grade is required' });
  const supabase = require('../config/supabase');
  const { data: cv } = await supabase.from('CVs').select('cv_text').eq('user_id', req.user.id).maybeSingle();
  const context = cv?.cv_text ? cv.cv_text.slice(0, 1500) : 'No CV provided.';
  try {
    const result = await groq([
      {
        role: 'system',
        content: `Generate 5 technical verification questions for a ${grade} developer based on their CV. Test real depth, not surface knowledge.
Respond ONLY with valid JSON: {"questions":["q1","q2","q3","q4","q5"]}`,
      },
      { role: 'user', content: context },
    ], 500, 0.5);
    res.json({ questions: result.questions || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/grade/verify — verify grade from quiz answers
router.post('/grade/verify', requireAuth, async (req, res) => {
  const { grade, questions, answers } = req.body;
  if (!grade || !questions || !answers) return res.status(400).json({ error: 'grade, questions and answers are required' });
  const qa = questions.map((q, i) => `Q${i + 1}: ${q}\nA: ${answers[i] || '(skipped)'}`).join('\n\n');
  try {
    const result = await groq([
      {
        role: 'system',
        content: `You are a senior technical evaluator. Based on the quiz answers, confirm or adjust the candidate's grade.
Grades: Entry-Level < Junior < Mid-Level < Senior
Respond ONLY with valid JSON:
{"confirmed_grade":"Entry-Level|Junior|Mid-Level|Senior","score":<0-100>,"feedback":"2-3 sentence assessment","strong_areas":["area1","area2"],"improvement_areas":["area1","area2"]}`,
      },
      { role: 'user', content: `Detected grade: ${grade}\n\n${qa}` },
    ], 400, 0.2);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// =====================
// SKILL COACHING (FR-12)
// =====================

// POST /api/ai/coaching — personalized coaching from CV
router.post('/coaching', requireAuth, async (req, res) => {
  const supabase = require('../config/supabase');
  const { data: cv } = await supabase.from('CVs').select('cv_text, ai_score').eq('user_id', req.user.id).maybeSingle();
  if (!cv?.cv_text) return res.json({ message: 'Upload and analyze your CV first for personalized coaching.' });
  try {
    const result = await groq([
      {
        role: 'system',
        content: `You are a friendly career coach. Based on this CV, identify skill gaps and give actionable advice.
Respond ONLY with valid JSON:
{
  "skill_gaps":[{"skill":"name","priority":"high|medium|low","reason":"why it matters"}],
  "tips":[{"title":"tip title","description":"2-sentence advice"}],
  "resources":[{"name":"resource name","type":"Course|Book|Practice|Community","description":"brief description"}],
  "weekly_plan":"2-3 sentence suggested plan"
}
(max 5 skill_gaps, 4 tips, 4 resources)`,
      },
      { role: 'user', content: cv.cv_text.slice(0, 3000) },
    ], 800, 0.3);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;

