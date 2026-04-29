// =====================
// THEME (dark / light)
// =====================
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const icon = saved === 'light' ? 'fa-sun' : 'fa-moon';
  document.querySelectorAll('#themeToggleBtn i, #themeToggleHeader i').forEach(el => {
    el.className = `fas ${icon}`;
  });
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const icon = next === 'light' ? 'fa-sun' : 'fa-moon';
  document.querySelectorAll('#themeToggleBtn i, #themeToggleHeader i').forEach(el => {
    el.className = `fas ${icon}`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('themeToggleHeader')?.addEventListener('click', toggleTheme);
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // Populate real user data throughout the dashboard
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) {
    const cvName = document.getElementById('cvName');
    if (cvName) cvName.textContent = user.name;
  }
  // Profile page
  if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.name || '—';
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email || '—';
  if (document.getElementById('profileRole')) document.getElementById('profileRole').textContent = user.role === 'user' ? 'Job Seeker' : 'Company';

  // Load saved CV score if it exists
  fetch(`${API}/cv/my`, { headers: authHeaders() })
    .then(r => r.json())
    .then(d => {
      if (d.cv?.ai_score != null) {
        const cvScoreNum = document.getElementById('cvScoreNum');
        if (cvScoreNum) cvScoreNum.textContent = d.cv.ai_score;
        const cvGrade = document.getElementById('cvGrade');
        if (cvGrade) {
          const s = d.cv.ai_score;
          cvGrade.textContent = s >= 85 ? 'Senior' : s >= 70 ? 'Mid-Level' : s >= 50 ? 'Junior' : 'Entry-Level';
        }
        const profileScore = document.getElementById('profileScore');
        if (profileScore) profileScore.textContent = d.cv.ai_score + ' / 100';
      }
    }).catch(() => {});
});

// =====================
// LOGOUT
// =====================
function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '../LandingPage/login.html';
}

// =====================
// API HELPERS
// =====================
const API = 'http://localhost:3000/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
}

// =====================
// JOBS — load real jobs from DB
// =====================
async function loadJobs() {
  const grid = document.getElementById('jobListingsGrid');
  if (!grid) return;
  try {
    const res = await fetch(`${API}/jobs`);
    const data = await res.json();
    if (!data.jobs || data.jobs.length === 0) {
      grid.innerHTML = '<p style="color:#5b6f94">No active jobs yet.</p>';
      return;
    }
    const colors = ['#4285f4','#00aa5b','#f7944d','#e94235','#9b59b6','#1abc9c'];
    const hasCv = localStorage.getItem('cvAnalyzed') === '1';
    grid.innerHTML = data.jobs.map((j, i) => {
      const letter = (j.Companies?.name || j.title || '?')[0].toUpperCase();
      const color = colors[i % colors.length];
      const matchBadge = hasCv
        ? `<span class="match-badge" id="match-${j.id}" style="font-size:0.75rem;color:#888;"><i class="fas fa-spinner fa-spin"></i></span>`
        : `<span style="font-size:0.72rem;color:#5b6f94;">Upload CV to see match</span>`;
      return `
        <div class="job-listing-card" id="jobcard-${j.id}">
          <div class="jl-top">
            <div class="jl-company-icon" style="background:${color}">${letter}</div>
            <div>
              <div class="jl-title">${j.title}</div>
              <div class="jl-company">${j.Companies?.name || 'Company'} · ${j.location || 'Remote'}</div>
            </div>
          </div>
          <div class="jl-tags"><span class="jl-tag">${j.job_type || 'Full-time'}</span></div>
          <div class="jl-salary"><i class="fas fa-dollar-sign"></i> ${j.salary_range || 'Salary TBD'}</div>
          ${j.description ? `<p style="color:#8a9bbf;font-size:0.85rem;margin:0.6rem 0">${j.description.slice(0, 100)}...</p>` : ''}
          <div class="jl-footer">
            <span>${matchBadge}</span>
            <button class="btn-primary btn-sm" onclick="applyToJob('${j.id}', '${j.title.replace(/'/g, '')}')">
              <i class="fas fa-paper-plane"></i> Apply
            </button>
          </div>
        </div>`;
    }).join('');

    // Fetch match % for each job in parallel (only if user has a CV)
    if (hasCv) {
      data.jobs.forEach(j => {
        fetch(`${API}/ai/match`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ job_id: j.id }) })
          .then(r => r.json())
          .then(d => {
            const el = document.getElementById(`match-${j.id}`);
            if (!el) return;
            if (d.match_percentage != null) {
              const pct = d.match_percentage;
              const col = pct >= 70 ? '#27c93f' : pct >= 50 ? '#f7944d' : '#5b6f94';
              el.innerHTML = `<i class="fas fa-bullseye" style="color:${col}"></i> <strong style="color:${col}">${pct}%</strong> match`;
            } else {
              el.textContent = '';
            }
          }).catch(() => { const el = document.getElementById(`match-${j.id}`); if (el) el.textContent = ''; });
      });
    }
  } catch {
    grid.innerHTML = '<p style="color:#5b6f94">Cannot load jobs — make sure backend is running.</p>';
  }
}

async function applyToJob(jobId, jobTitle) {
  if (!confirm(`Apply to "${jobTitle}"?`)) return;
  try {
    // Get match % first (if user has a CV)
    let matchPct = null;
    if (localStorage.getItem('cvAnalyzed') === '1') {
      try {
        const mr = await fetch(`${API}/ai/match`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ job_id: jobId }) });
        const md = await mr.json();
        if (md.match_percentage != null) matchPct = md.match_percentage;
      } catch { /* ignore */ }
    }

    const res = await fetch(`${API}/applications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ job_id: jobId, match_percentage: matchPct }),
    });
    const data = await res.json();
    if (res.ok) {
      const matchMsg = matchPct != null ? `\nYour match score: ${matchPct}% 🎯` : '';
      alert(`Applied to "${jobTitle}" successfully!${matchMsg}`);
    } else {
      alert(data.error || 'Failed to apply.');
    }
  } catch {
    alert('Cannot connect to server.');
  }
}

// =====================
// MY APPLICATIONS (FR-09)
// =====================
async function loadMyApplications() {
  const container = document.getElementById('myApplicationsList');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--muted);padding:1rem">Loading...</p>';
  try {
    const res = await fetch(`${API}/applications/my`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { container.innerHTML = `<p style="color:#f87171;padding:1rem">${data.error}</p>`; return; }
    if (!data.applications?.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:1rem">No applications yet. Browse jobs and apply!</p>'; return;
    }
    const statusClass = s => s === 'shortlisted' ? 's-shortlisted' : s === 'rejected' ? 's-rejected' : s === 'pending' ? 's-new' : 's-interview';
    container.innerHTML = data.applications.map(a => {
      const matchPct = a.match_percentage;
      const matchBadge = matchPct != null
        ? (() => { const col = matchPct >= 70 ? '#27c93f' : matchPct >= 50 ? '#f7944d' : '#5b6f94'; return `<span style="font-size:0.78rem;font-weight:600;color:${col}"><i class="fas fa-bullseye"></i> ${matchPct}% match</span>`; })()
        : '';
      return `
      <div class="job-listing-card" style="margin-bottom:1rem">
        <div class="jl-top">
          <div class="jl-company-icon" style="background:#f7944d">${(a.Jobs?.title||'?')[0].toUpperCase()}</div>
          <div>
            <div class="jl-title">${a.Jobs?.title || 'Unknown Job'}</div>
            <div class="jl-company">${a.Jobs?.Companies?.name || 'Company'} · ${a.Jobs?.location || 'Remote'}</div>
          </div>
          <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;">
            <span class="status-badge ${statusClass(a.status)}">${a.status}</span>
            ${matchBadge}
          </div>
        </div>
        <div class="jl-tags"><span class="jl-tag">${a.Jobs?.job_type || 'Full-time'}</span></div>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:0.4rem">Applied ${new Date(a.created_at).toLocaleDateString()}</div>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<p style="color:var(--muted);padding:1rem">Cannot connect — backend offline.</p>'; }
}

// Load jobs when Jobs page is shown
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page="jobsPage"]').forEach(btn => {
    btn.addEventListener('click', loadJobs);
  });
  document.querySelectorAll('.nav-item[data-page="applicationsPage"]').forEach(btn => {
    btn.addEventListener('click', loadMyApplications);
  });
});

// =====================
// PAGE NAVIGATION
// =====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === pageId) btn.classList.add('active');
  });
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', function () { showPage(this.dataset.page); });
});

document.getElementById('profileBtn').addEventListener('click', function () {
  showPage('profilePage');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
});

document.getElementById('notifBtn').addEventListener('click', function () {
  showPage('notificationPage');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
});

// =====================
// STAT COUNTER ANIMATION
// =====================
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const unit = el.querySelector('.stat-unit');
  const unitHTML = unit ? unit.outerHTML : '';
  const duration = 1200;
  const step = 16;
  const steps = Math.floor(duration / step);
  let current = 0;
  const timer = setInterval(() => {
    current++;
    const value = Math.round((current / steps) * target);
    el.innerHTML = value + unitHTML;
    if (current >= steps) { el.innerHTML = target + unitHTML; clearInterval(timer); }
  }, step);
}
document.querySelectorAll('.stat-number[data-target]').forEach(animateCounter);

// =====================
// CHART.JS
// =====================
const ctx = document.getElementById('trendChart');
if (ctx) {
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
      datasets: [{
        label: 'Applications',
        data: [3, 7, 5, 12, 9, 15],
        borderColor: '#f15a24',
        backgroundColor: 'rgba(241, 90, 36, 0.08)',
        borderWidth: 3, pointBackgroundColor: '#f15a24',
        pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5b6f94', font: { family: 'Inter', size: 12 } } },
        y: { grid: { color: 'rgba(91,111,148,0.1)' }, ticks: { color: '#5b6f94', font: { family: 'Inter', size: 12 }, stepSize: 3 }, beginAtZero: true }
      }
    }
  });
}

// =====================
// CV UPLOAD (FR-08)
// =====================
function handleFileUpload(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(ext)) {
    alert('Unsupported file format. Please upload a PDF or DOCX file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('File size exceeds the 10MB limit. Please upload a smaller file.');
    return;
  }
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileMeta').textContent = ext.toUpperCase() + ' - ' + (file.size / 1024).toFixed(0) + ' KB';
  document.getElementById('uploadedFileInfo').style.display = 'block';
  document.getElementById('uploadZone').style.display = 'none';
}

function removeCV() {
  document.getElementById('uploadedFileInfo').style.display = 'none';
  document.getElementById('uploadZone').style.display = 'block';
  document.getElementById('cvFileInput').value = '';
}

async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (ext === 'pdf') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }

  return new TextDecoder().decode(arrayBuffer);
}

async function analyzeResume() {
  const fileInput = document.getElementById('cvFileInput');
  if (!fileInput?.files?.length) { alert('Please upload a CV file first.'); return; }
  const file = fileInput.files[0];
  const btn = document.getElementById('analyzeBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...'; btn.disabled = true; }
  try {
    const cv_text = await extractTextFromFile(file);
    if (!cv_text.trim()) { alert('Could not extract text from file. Please try a different file.'); return; }

    const res = await fetch(`${API}/ai/resume-summary`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ cv_text }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'AI error'); return; }

    // Update Current CV card
    const total = data.scores?.total || 0;
    const cvScoreNum = document.getElementById('cvScoreNum');
    if (cvScoreNum) cvScoreNum.textContent = total;
    const cvSkills = document.getElementById('cvSkills');
    if (cvSkills) cvSkills.textContent = data.scores?.foundTech?.slice(0, 5).join(', ') || 'No tech skills detected';
    const cvGrade = document.getElementById('cvGrade');
    if (cvGrade) {
      const grade = total >= 85 ? 'Senior' : total >= 70 ? 'Mid-Level' : total >= 50 ? 'Junior' : 'Entry-Level';
      cvGrade.textContent = grade;
    }

    // Summary text
    document.getElementById('aiSummaryOutput').textContent = data.summary || '';

    // Final score with animated count-up
    const scoreEl = document.getElementById('aiScoreNumber');
    let count = 0;
    const interval = setInterval(() => {
      count += 2;
      if (count >= total) { count = total; clearInterval(interval); }
      scoreEl.textContent = count;
    }, 20);

    // Score verdict
    const verdict = total >= 85 ? 'Excellent — ready for senior roles' :
                    total >= 70 ? 'Good — solid candidate' :
                    total >= 55 ? 'Average — room to grow' : 'Needs work — let\'s improve this';
    document.getElementById('aiScoreVerdict').textContent = verdict;

    // Skill progress bars
    const maxMap = { technical: 30, experience: 25, education: 20, soft_skills: 15, structure: 15 };
    Object.entries(maxMap).forEach(([key, max]) => {
      const score = data.scores?.[key] || 0;
      const pct = Math.round((score / max) * 100);
      const fill = document.getElementById(`aiFill_${key}`);
      const pctEl = document.getElementById(`aiPct_${key}`);
      if (fill) setTimeout(() => { fill.style.width = pct + '%'; }, 300);
      if (pctEl) pctEl.textContent = pct + '%';
      const card = document.getElementById(`aiCard_${key}`);
      if (card) card.dataset.level = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';
    });

    // Improvements
    const impEl = document.getElementById('aiImprovements');
    if (impEl) impEl.innerHTML = (data.improvements || []).map(i =>
      `<li class="activity-item"><span class="activity-desc">${i}</span></li>`).join('');

    // Missing keywords as pill badges
    const kwEl = document.getElementById('aiKeywords');
    if (kwEl) kwEl.innerHTML = (data.missing_keywords || []).map(k =>
      `<span class="skill-gap-tag">${k}</span>`).join('');

    document.getElementById('aiSummaryCard').style.display = 'block';
    document.getElementById('aiPlaceholder').style.display = 'none';

    // Also update profileScore if on profile page
    const profileScore = document.getElementById('profileScore');
    if (profileScore) profileScore.textContent = total + ' / 100';

    // Save CV analysis + raw text to DB (enables hiring probability matching)
    fetch(`${API}/cv/save`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        ai_score: total,
        ai_summary: data.summary || '',
        red_flags: data.missing_keywords || [],
        file_name: file.name,
        cv_text: cv_text,
      }),
    }).catch(() => {}); // fire and forget — don't block the UI
    localStorage.setItem('cvAnalyzed', '1');

  } catch (e) {
    console.error(e);
    alert('Cannot connect to server.');
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-robot"></i> Analyze with AI'; btn.disabled = false; }
  }
}

// =====================
// JOB APPLICATION (FR-09)
// (applyToJob is defined above using the real API)

// =====================
// FILTER BUTTONS
// =====================
function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// =====================
// AI INTERVIEW (FR-13)
// =====================
let interviewMode = 'text';
let isRecording = false;
let questionIndex = 0;
const interviewQuestions = [
  "Tell me about yourself and your experience with frontend development.",
  "What is the difference between var, let, and const in JavaScript?",
  "Can you explain how React's virtual DOM works?",
  "How do you handle state management in a large React application?",
  "Describe a challenging bug you fixed. How did you approach debugging it?"
];

function selectMode(el, mode) {
  interviewMode = mode;
  document.querySelectorAll('.mode-option').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
}

function startInterview() {
  document.getElementById('interviewSetup').style.display = 'none';
  document.getElementById('interviewSession').style.display = 'block';
  const category = document.getElementById('interviewCategory').value;
  document.getElementById('interviewModeLabel').textContent = (interviewMode === 'voice' ? 'Voice' : 'Text') + ' Mode - ' + category;
  if (interviewMode === 'voice') {
    document.getElementById('textInputRow').style.display = 'none';
    document.getElementById('voiceInputRow').style.display = 'flex';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Text';
  } else {
    document.getElementById('textInputRow').style.display = 'flex';
    document.getElementById('voiceInputRow').style.display = 'none';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Voice';
  }
  questionIndex = 0;
  document.getElementById('interviewChatBody').innerHTML = '';
  addBotMessage("Hello! I'm your AI interviewer. Let's begin the mock interview for " + category + ".");
  setTimeout(() => addBotMessage(interviewQuestions[0]), 1000);
}

function addBotMessage(text) {
  const body = document.getElementById('interviewChatBody');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble received';
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function addUserMessage(text) {
  const body = document.getElementById('interviewChatBody');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble sent';
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

function sendInterviewMsg() {
  const input = document.getElementById('interviewInput');
  const text = input.value.trim();
  if (!text) return;
  addUserMessage(text);
  input.value = '';
  // Simulate AI feedback
  const scores = ['Good', 'Excellent', 'Average', 'Strong'];
  const score = scores[Math.floor(Math.random() * scores.length)];
  document.getElementById('fbRelevance').textContent = score;
  document.getElementById('fbClarity').textContent = scores[Math.floor(Math.random() * scores.length)];
  document.getElementById('fbConfidence').textContent = scores[Math.floor(Math.random() * scores.length)];
  document.getElementById('fbOverall').textContent = (60 + Math.floor(Math.random() * 30)) + '/100';
  questionIndex++;
  if (questionIndex < interviewQuestions.length) {
    setTimeout(() => addBotMessage(interviewQuestions[questionIndex]), 1200);
  } else {
    setTimeout(() => addBotMessage("Great job! That concludes our mock interview. Check the feedback panel below for your performance summary."), 1200);
  }
}

function switchInterviewMode() {
  if (interviewMode === 'text') {
    interviewMode = 'voice';
    document.getElementById('textInputRow').style.display = 'none';
    document.getElementById('voiceInputRow').style.display = 'flex';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Text';
  } else {
    interviewMode = 'text';
    document.getElementById('textInputRow').style.display = 'flex';
    document.getElementById('voiceInputRow').style.display = 'none';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Voice';
  }
}

function toggleVoiceRecording() {
  const btn = document.getElementById('voiceBtn');
  const status = document.getElementById('voiceStatus');
  if (!isRecording) {
    isRecording = true;
    btn.classList.add('recording');
    status.textContent = 'Recording... Click to stop';
  } else {
    isRecording = false;
    btn.classList.remove('recording');
    status.textContent = 'Processing speech...';
    setTimeout(() => {
      addUserMessage("(Voice response transcribed) I have experience with React and have worked on several production applications...");
      status.textContent = 'Click to start speaking';
      questionIndex++;
      if (questionIndex < interviewQuestions.length) {
        setTimeout(() => addBotMessage(interviewQuestions[questionIndex]), 800);
      }
    }, 1500);
  }
}

function endInterview() {
  document.getElementById('interviewSession').style.display = 'none';
  document.getElementById('interviewSetup').style.display = 'block';
  alert('Interview session ended. Your results have been saved to Interview History.');
}

// =====================
// GRADE VERIFICATION (FR-15)
// =====================
let quizStep = 1;
const quizQuestions = [
  "In React, what is the difference between useState and useReducer? When would you choose one over the other?",
  "Explain the concept of closures in JavaScript with a practical example.",
  "How would you optimize a React application that has slow rendering performance?",
  "What is the difference between REST and GraphQL? When would you use each?",
  "Describe how you would implement authentication in a single-page application."
];

function submitQuizAnswer() {
  const answer = document.getElementById('quizAnswer').value.trim();
  if (!answer) { alert('Please type your answer before submitting.'); return; }
  quizStep++;
  if (quizStep <= 5) {
    document.getElementById('quizQuestion').textContent = quizQuestions[quizStep - 1];
    document.getElementById('quizAnswer').value = '';
    document.querySelector('.quiz-q-num').textContent = 'Q' + quizStep + ' of 5';
    document.getElementById('quizProgressFill').style.width = (quizStep * 20) + '%';
    document.querySelector('.quiz-progress span').textContent = quizStep + ' of 5 completed';
  } else {
    document.getElementById('verificationQuiz').style.display = 'none';
    document.getElementById('verificationResult').style.display = 'block';
  }
}

function skipQuestion() {
  quizStep++;
  if (quizStep <= 5) {
    document.getElementById('quizQuestion').textContent = quizQuestions[quizStep - 1];
    document.getElementById('quizAnswer').value = '';
    document.querySelector('.quiz-q-num').textContent = 'Q' + quizStep + ' of 5';
    document.getElementById('quizProgressFill').style.width = (quizStep * 20) + '%';
    document.querySelector('.quiz-progress span').textContent = quizStep + ' of 5 completed';
  } else {
    document.getElementById('verificationQuiz').style.display = 'none';
    document.getElementById('verificationResult').style.display = 'block';
  }
}

// =====================
// MESSAGES
// =====================
const conversations = [
  {
    name: 'Sarah Chen',
    role: 'HR Manager at TechFlow',
    avatar: 'SC',
    messages: [
      { type: 'received', text: "Hi Kent! I'm Sarah from TechFlow. We reviewed your application for the Frontend Developer position and were really impressed with your profile." },
      { type: 'sent', text: "Thank you so much, Sarah! I'm very excited about the opportunity at TechFlow." },
      { type: 'received', text: "We'd love to schedule your interview! Are you available this Thursday at 2 PM?" }
    ]
  },
  {
    name: 'Mike Johnson',
    role: 'Recruiter at DataCorp',
    avatar: 'MJ',
    messages: [
      { type: 'received', text: "Hello! I came across your profile and think you'd be a great fit for our Full Stack Developer role." },
      { type: 'sent', text: "Hi Mike! Thanks for reaching out. Could you share more about the role and the tech stack?" },
      { type: 'received', text: "Your application has been reviewed by our engineering team. They were impressed with your React experience." }
    ]
  },
  {
    name: 'Rina Tanaka',
    role: 'CTO at CloudBase',
    avatar: 'RT',
    messages: [
      { type: 'received', text: "Hi Kent, I noticed you have experience with cloud-native applications. We're looking for someone exactly like you!" },
      { type: 'sent', text: "Thank you, Rina! CloudBase seems like an amazing company. What does the role involve?" },
      { type: 'received', text: "Can you share your GitHub profile? We'd love to see some of your open source work." }
    ]
  },
  {
    name: 'Alex Rivera',
    role: 'Hiring Lead at DesignHub',
    avatar: 'AR',
    messages: [
      { type: 'received', text: "Hey Kent! We saw your portfolio and love your design sense. We have a UI Engineer position open." },
      { type: 'sent', text: "Hi Alex! That sounds right up my alley. I'd love to learn more about DesignHub." },
      { type: 'received', text: "Thanks for your portfolio submission! Our design team will review it and get back to you within 48 hours." }
    ]
  }
];

let activeConversation = 0;

function selectConversation(el, name, role, index) {
  document.querySelectorAll('.msg-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  const badge = el.querySelector('.msg-unread');
  if (badge) badge.remove();
  activeConversation = index;
  document.getElementById('msgChatName').textContent = name;
  document.getElementById('msgChatRole').textContent = role;
  renderMessages(index);
}

function renderMessages(index) {
  const body = document.getElementById('msgChatBody');
  body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
  conversations[index].messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + msg.type;
    bubble.textContent = msg.text;
    body.appendChild(bubble);
  });
  body.scrollTop = body.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;
  conversations[activeConversation].messages.push({ type: 'sent', text: text });
  const body = document.getElementById('msgChatBody');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble sent';
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
  input.value = '';
  // Simulate reply
  setTimeout(() => {
    const replies = [
      "Thanks for your message! I'll get back to you shortly.",
      "That sounds great! Let me check with the team.",
      "Perfect, I'll send you the details via email.",
      "Got it! Looking forward to connecting with you."
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    conversations[activeConversation].messages.push({ type: 'received', text: reply });
    const replyBubble = document.createElement('div');
    replyBubble.className = 'chat-bubble received';
    replyBubble.textContent = reply;
    body.appendChild(replyBubble);
    body.scrollTop = body.scrollHeight;
  }, 1500);
}

function filterMessages(query) {
  const items = document.querySelectorAll('.msg-item');
  const q = query.toLowerCase();
  items.forEach(item => {
    const name = item.querySelector('.msg-name').textContent.toLowerCase();
    const snippet = item.querySelector('.msg-snippet').textContent.toLowerCase();
    item.style.display = (name.includes(q) || snippet.includes(q)) ? 'flex' : 'none';
  });
}
