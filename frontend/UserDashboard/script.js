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

  // Inject toast animation style
  const s = document.createElement('style');
  s.textContent = `
    @keyframes toastIn{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}
    .priority-high{background:#f871711a;color:#f87171;border:1px solid #f8717140;padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:600;}
    .priority-medium{background:#f7944d1a;color:#f7944d;border:1px solid #f7944d40;padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:600;}
    .priority-low{background:#27c93f1a;color:#27c93f;border:1px solid #27c93f40;padding:2px 8px;border-radius:99px;font-size:0.72rem;font-weight:600;}
    .coaching-gap-item{padding:0.75rem;border-radius:8px;background:var(--card-bg);border:1px solid var(--border);margin-bottom:0.6rem;}
    .coaching-tip-item{display:flex;gap:0.8rem;align-items:flex-start;padding:0.75rem;border-radius:8px;background:var(--card-bg);border:1px solid var(--border);margin-bottom:0.6rem;}
    .tip-icon{width:32px;height:32px;background:linear-gradient(135deg,#f7944d,#f15a24);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
    .coaching-resource-item{padding:0.75rem;border-radius:8px;background:var(--card-bg);border:1px solid var(--border);margin-bottom:0.6rem;}
    .resource-type{font-size:0.72rem;font-weight:600;background:#4285f41a;color:#4285f4;padding:2px 8px;border-radius:99px;margin-bottom:0.4rem;display:inline-block;}
    .coaching-section{margin-bottom:1.4rem;}
    .coaching-section h4{font-size:0.9rem;font-weight:600;margin-bottom:0.8rem;display:flex;align-items:center;gap:0.5rem;}
  `;
  document.head.appendChild(s);

  // Dynamic date badge (current month range)
  const dateBadge = document.getElementById('dashDateBadge');
  if (dateBadge) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateBadge.innerHTML = `<i class="fas fa-calendar-alt"></i> ${fmt(now)} – ${fmt(end)}, ${now.getFullYear()}`;
  }

  // Populate user data
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) {
    const cvName = document.getElementById('cvName');
    if (cvName) cvName.textContent = user.name;
  }
  populateProfileDisplay();

  // Load real dashboard data (also handles CV score, grade, profile score)
  loadDashboard();
});

// =====================
// LOGOUT
// =====================
function logout() {
  showConfirm('Are you sure you want to log out?', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../LandingPage/login.html';
  });
}

// =====================
// PROFILE FUNCTIONS
// =====================
function populateProfileDisplay() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const extra = JSON.parse(localStorage.getItem('userProfileExtra') || '{}');

  if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.name || '—';
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email || '—';
  if (document.getElementById('profileRole')) document.getElementById('profileRole').textContent = user.role === 'user' ? 'Job Seeker' : 'Company';
  if (document.getElementById('profilePhone')) document.getElementById('profilePhone').textContent = extra.phone || '—';
  if (document.getElementById('profileLocation')) document.getElementById('profileLocation').textContent = extra.location || '—';
  if (document.getElementById('settingsEmailInfo')) document.getElementById('settingsEmailInfo').textContent = user.email || '—';

  // Pre-fill edit form
  if (document.getElementById('editProfileName')) document.getElementById('editProfileName').value = user.name || '';
  if (document.getElementById('editProfileEmail')) document.getElementById('editProfileEmail').value = user.email || '';
  if (document.getElementById('editProfilePhone')) document.getElementById('editProfilePhone').value = extra.phone || '';
  if (document.getElementById('editProfileLocation')) document.getElementById('editProfileLocation').value = extra.location || '';
  if (document.getElementById('editProfileBio')) document.getElementById('editProfileBio').value = extra.bio || '';
  if (document.getElementById('editProfileSkills')) document.getElementById('editProfileSkills').value = extra.skills || '';
}

async function changePassword() {
  const current = document.getElementById('pwCurrent')?.value;
  const next = document.getElementById('pwNew')?.value;
  const confirm = document.getElementById('pwConfirm')?.value;

  if (!current || !next || !confirm) { showToast('Fill in all fields', 'error'); return; }
  if (next.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
  if (next !== confirm) { showToast('Passwords do not match', 'error'); return; }

  try {
    const res = await fetch(`${API}/auth/change-password`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ current_password: current, new_password: next }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to change password', 'error'); return; }
    showToast('Password updated!', 'success');
    document.getElementById('pwCurrent').value = '';
    document.getElementById('pwNew').value = '';
    document.getElementById('pwConfirm').value = '';
  } catch {
    showToast('Network error — try again', 'error');
  }
}

async function saveUserProfile() {
  const name = document.getElementById('editProfileName')?.value?.trim();
  const phone = document.getElementById('editProfilePhone')?.value?.trim();
  const location = document.getElementById('editProfileLocation')?.value?.trim();
  const bio = document.getElementById('editProfileBio')?.value?.trim();
  const skills = document.getElementById('editProfileSkills')?.value?.trim();

  if (!name) { showToast('Name cannot be empty', 'error'); return; }

  try {
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to save', 'error'); return; }

    // Update localStorage user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.name = data.user.name;
    localStorage.setItem('user', JSON.stringify(user));

    // Save extra fields locally (bio, phone, location, skills not in DB yet)
    localStorage.setItem('userProfileExtra', JSON.stringify({ phone, location, bio, skills }));

    // Refresh display
    populateProfileDisplay();
    const cvName = document.getElementById('cvName');
    if (cvName) cvName.textContent = data.user.name;

    showToast('Profile updated successfully!', 'success');
  } catch (e) {
    showToast('Network error — try again', 'error');
  }
}

// =====================
// DASHBOARD LOADER
// =====================
async function loadDashboard() {
  try {
    const [appsRes, cvRes, jobsRes] = await Promise.all([
      fetch(`${API}/applications/my`, { headers: authHeaders() }),
      fetch(`${API}/cv/my`, { headers: authHeaders() }),
      fetch(`${API}/jobs`),
    ]);

    const appsData = appsRes.ok ? await appsRes.json() : { applications: [] };
    const cvData = cvRes.ok ? await cvRes.json() : { cv: null };
    const jobsData = jobsRes.ok ? await jobsRes.json() : { jobs: [] };

    const apps = appsData.applications || [];
    const cv = cvData.cv;
    const jobs = jobsData.jobs || [];

    // --- Stat cards ---
    const statApps = document.getElementById('statApplications');
    if (statApps) statApps.textContent = apps.length;

    const score = cv?.ai_score ?? null;
    const statCv = document.getElementById('statCvScore');
    if (statCv) {
      statCv.innerHTML = score != null
        ? `${score}<span class="stat-unit">/100</span>`
        : `0<span class="stat-unit">/100</span>`;
    }

    // Avg match from applications that have match_percentage
    const withMatch = apps.filter(a => a.match_percentage != null);
    const avgMatch = withMatch.length
      ? Math.round(withMatch.reduce((s, a) => s + a.match_percentage, 0) / withMatch.length)
      : null;
    const statMatch = document.getElementById('statAvgMatch');
    if (statMatch) {
      statMatch.innerHTML = avgMatch != null
        ? `${avgMatch}<span class="stat-unit">%</span>`
        : `0<span class="stat-unit">%</span>`;
    }

    const statJobs = document.getElementById('statJobsCount');
    if (statJobs) statJobs.textContent = jobs.length;

    // --- Grade banner ---
    const gradeEl = document.getElementById('dashGradeValue');
    if (gradeEl && score != null) {
      gradeEl.textContent = score >= 85 ? 'Senior' : score >= 70 ? 'Mid-Level' : score >= 50 ? 'Junior' : 'Entry-Level';
    } else if (gradeEl) {
      gradeEl.textContent = 'Upload CV to detect';
    }

    // --- CV score on profile page too ---
    const profileScore = document.getElementById('profileScore');
    if (profileScore && score != null) profileScore.textContent = score + ' / 100';
    const cvScoreNum = document.getElementById('cvScoreNum');
    if (cvScoreNum && score != null) cvScoreNum.textContent = score;
    const cvGrade = document.getElementById('cvGrade');
    if (cvGrade && score != null) {
      cvGrade.textContent = score >= 85 ? 'Senior' : score >= 70 ? 'Mid-Level' : score >= 50 ? 'Junior' : 'Entry-Level';
    }
    if (cv?.cv_text) localStorage.setItem('cvAnalyzed', '1');

    // --- Recent Activity list ---
    const actList = document.getElementById('dashActivityList');
    if (actList) {
      if (apps.length === 0) {
        actList.innerHTML = `<li class="activity-item"><span class="activity-desc" style="color:var(--text-muted);">No applications yet — browse jobs to apply!</span></li>`;
      } else {
        actList.innerHTML = apps.slice(0, 5).map(a => {
          const statusClass = a.status === 'active' ? 'badge-active' : '';
          const statusBadge = statusClass ? `<span class="${statusClass}">${a.status}</span>` : `<span style="color:var(--text-muted);font-size:0.78rem;">${a.status}</span>`;
          const when = timeAgo(a.created_at);
          return `<li class="activity-item">
            <span class="activity-desc">Applied to <b>${a.Jobs?.title || 'a job'}</b> ${statusBadge}</span>
            <span class="activity-time">${when}</span>
          </li>`;
        }).join('');
      }
    }

    // --- Job cards (top 2 latest jobs) ---
    const jobStack = document.getElementById('dashJobCards');
    if (jobStack) {
      if (jobs.length === 0) {
        jobStack.innerHTML = `<div class="activity-item"><span style="color:var(--text-muted);">No jobs posted yet.</span></div>`;
      } else {
        jobStack.innerHTML = jobs.slice(0, 2).map(j => `
          <div class="job-card" style="cursor:pointer;" onclick="showPage('jobsPage')">
            <div class="job-title-row">
              <span class="job-title">${j.title}</span>
              <span class="job-badge-active"><i class="fas fa-circle" style="font-size:0.45rem;margin-right:4px;color:#f15a24;"></i>Active</span>
            </div>
            <div class="job-location"><i class="fas fa-briefcase"></i> ${j.Companies?.name || 'Company'} · ${j.location || 'Remote'}</div>
            <div class="job-metrics">
              <div class="metric"><span class="metric-value">${j.job_type || '—'}</span><span class="metric-label">Type</span></div>
              <div class="metric"><span class="metric-value">${j.salary_range || '—'}</span><span class="metric-label">Salary</span></div>
              <span class="view-link" onclick="showPage('jobsPage')">View <i class="fas fa-arrow-right"></i></span>
            </div>
          </div>
        `).join('');
      }
    }

    // --- Application Trends chart ---
    buildTrendChart(apps);

    // --- Recent apps in quick actions panel ---
    const recentApps = document.getElementById('dashRecentApps');
    if (recentApps) {
      if (apps.length === 0) {
        recentApps.innerHTML = `<div class="interview-item"><span class="interview-role" style="color:var(--text-muted);">No applications yet</span></div>`;
      } else {
        recentApps.innerHTML = apps.slice(0, 3).map(a => `
          <div class="interview-item">
            <div class="interview-info"><i class="fas fa-calendar-alt"></i><span class="interview-time">${timeAgo(a.created_at)}</span></div>
            <span class="interview-role">${a.Jobs?.title || 'Job'}</span>
          </div>
        `).join('');
      }
    }

  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// =====================
// API HELPERS
// =====================
const API = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000/api';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
}

// =====================
// CONFIRM MODAL (replaces window.confirm)
// =====================
function showConfirm(message, onConfirm) {
  const existing = document.getElementById('confirmOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'confirmOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--card-bg,#1e2440);border:1px solid var(--border,#2a3050);border-radius:14px;padding:2rem 2.2rem;max-width:400px;width:90%;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
      <p style="color:var(--text,#e4e8f0);font-size:1rem;margin:0 0 1.6rem;line-height:1.5;">${message}</p>
      <div style="display:flex;gap:0.75rem;justify-content:center;">
        <button id="confirmNo" style="padding:0.65rem 1.5rem;border-radius:8px;border:1px solid var(--border,#2a3050);background:transparent;color:var(--muted,#8892b0);cursor:pointer;font-size:0.9rem;font-family:Nunito,sans-serif;">Cancel</button>
        <button id="confirmYes" style="padding:0.65rem 1.5rem;border-radius:8px;border:none;background:#f7944d;color:#fff;cursor:pointer;font-size:0.9rem;font-weight:700;font-family:Nunito,sans-serif;">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('confirmYes').onclick = () => { overlay.remove(); onConfirm(); };
  document.getElementById('confirmNo').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// =====================
// TOAST SYSTEM (Week 6)
// =====================
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const colors = { success: '#27c93f', error: '#f87171', warning: '#f7944d', info: '#4285f4' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    display:flex;align-items:center;gap:0.6rem;padding:0.8rem 1.1rem;
    background:var(--card-bg,#1e2440);border:1px solid ${colors[type]}33;
    border-left:3px solid ${colors[type]};border-radius:8px;
    color:var(--text,#e4e8f0);font-size:0.86rem;font-family:Inter,sans-serif;
    box-shadow:0 4px 16px rgba(0,0,0,0.35);min-width:220px;max-width:360px;
    animation:toastIn 0.3s ease;
  `;
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]};flex-shrink:0"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// =====================
// JOBS — load real jobs from DB
// =====================
async function loadJobs() {
  const grid = document.getElementById('jobListingsGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--muted);padding:1rem;text-align:center"><i class="fas fa-spinner fa-spin"></i> Loading jobs...</div>';
  try {
    const [jobsRes, appsRes] = await Promise.all([
      fetch(`${API}/jobs`),
      fetch(`${API}/applications/my`, { headers: authHeaders() }),
    ]);
    const data = await jobsRes.json();
    const appsData = appsRes.ok ? await appsRes.json() : { applications: [] };
    const appliedJobIds = new Set((appsData.applications || []).map(a => a.job_id));

    if (!data.jobs || data.jobs.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted)">No active jobs yet.</p>';
      return;
    }
    const colors = ['#4285f4','#00aa5b','#f7944d','#e94235','#9b59b6','#1abc9c'];
    const hasCv = localStorage.getItem('cvAnalyzed') === '1';
    grid.innerHTML = data.jobs.map((j, i) => {
      const letter = (j.Companies?.name || j.title || '?')[0].toUpperCase();
      const color = colors[i % colors.length];
      const alreadyApplied = appliedJobIds.has(j.id);
      const matchBadge = hasCv
        ? `<span class="match-badge" id="match-${j.id}" style="font-size:0.75rem;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i></span>`
        : `<span style="font-size:0.72rem;color:var(--muted)">Upload CV to see match</span>`;
      const applyBtn = alreadyApplied
        ? `<button class="btn-sm" disabled style="background:var(--card-bg);border:1px solid var(--border);color:var(--muted);cursor:default;border-radius:8px;padding:0.4rem 0.85rem;font-size:0.82rem;"><i class="fas fa-check"></i> Applied</button>`
        : `<button class="btn-primary btn-sm" onclick="applyToJob('${j.id}', '${j.title.replace(/'/g, '')}')"><i class="fas fa-paper-plane"></i> Apply</button>`;
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
          ${j.description ? `<p style="color:var(--muted);font-size:0.85rem;margin:0.6rem 0">${j.description.slice(0, 100)}...</p>` : ''}
          <div class="jl-footer">
            <span>${matchBadge}</span>
            <div style="display:flex;gap:0.5rem">
              ${j.Companies?.user_id ? `<button class="btn-secondary btn-sm" onclick="messageCompany('${j.Companies.user_id}','${(j.Companies.name||'Company').replace(/'/g,'')}')"><i class="fas fa-comment-alt"></i></button>` : ''}
              ${applyBtn}
            </div>
          </div>
        </div>`;
    }).join('');

    if (hasCv) {
      data.jobs.forEach(j => {
        fetch(`${API}/ai/match`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ job_id: j.id }) })
          .then(r => r.json())
          .then(d => {
            const el = document.getElementById(`match-${j.id}`);
            if (!el) return;
            if (d.match_percentage != null) {
              const pct = d.match_percentage;
              const col = pct >= 70 ? '#27c93f' : pct >= 50 ? '#f7944d' : 'var(--muted)';
              el.innerHTML = `<i class="fas fa-bullseye" style="color:${col}"></i> <strong style="color:${col}">${pct}%</strong> match`;
            } else {
              el.textContent = '';
            }
          }).catch(() => { const el = document.getElementById(`match-${j.id}`); if (el) el.textContent = ''; });
      });
    }
  } catch {
    grid.innerHTML = '<p style="color:var(--muted)">Cannot load jobs — make sure backend is running.</p>';
  }
}

async function applyToJob(jobId, jobTitle) {
  showConfirm(`Apply to "${jobTitle}"?`, async () => {
    try {
      let matchPct = null;
      if (localStorage.getItem('cvAnalyzed') === '1') {
        try {
          const mr = await fetch(`${API}/ai/match`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ job_id: jobId }) });
          const md = await mr.json();
          if (md.match_percentage != null) matchPct = md.match_percentage;
        } catch { /* ignore */ }
      }
      const res = await fetch(`${API}/applications`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ job_id: jobId, match_percentage: matchPct }),
      });
      const data = await res.json();
      if (res.ok) {
        const matchMsg = matchPct != null ? ` Match score: ${matchPct}%` : '';
        showToast(`Applied to "${jobTitle}"!${matchMsg}`, 'success');
        // Navigate to My Applications so result is immediately visible
        document.querySelector('[data-page="applicationsPage"]')?.click();
      } else {
        showToast(data.error || 'Failed to apply.', 'error');
      }
    } catch {
      showToast('Cannot connect to server.', 'error');
    }
  });
}

// =====================
// MY APPLICATIONS (FR-09)
// =====================
async function loadMyApplications() {
  const container = document.getElementById('myApplicationsList');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--muted);padding:1rem"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
  try {
    const res = await fetch(`${API}/applications/my`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { container.innerHTML = `<p style="color:#f87171;padding:1rem">${data.error}</p>`; return; }
    if (!data.applications?.length) {
      container.innerHTML = '<p style="color:var(--muted);padding:1rem">No applications yet. Browse jobs and apply!</p>';
      return;
    }
    const statusClass = s => s === 'shortlisted' ? 's-shortlisted' : s === 'rejected' ? 's-rejected' : s === 'pending' ? 's-new' : 's-interview';
    container.innerHTML = data.applications.map(a => {
      const matchPct = a.match_percentage;
      const matchBadge = matchPct != null
        ? (() => { const col = matchPct >= 70 ? '#27c93f' : matchPct >= 50 ? '#f7944d' : 'var(--muted)'; return `<span style="font-size:0.78rem;font-weight:600;color:${col}"><i class="fas fa-bullseye"></i> ${matchPct}% match</span>`; })()
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
  // Auto-load data for specific pages
  if (pageId === 'coachingPage') loadCoaching();
  if (pageId === 'gradePage') detectGrade();
  if (pageId === 'messagesPage') loadConversations();
  if (pageId === 'interviewPage') renderInterviewHistory();
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', function () { showPage(this.dataset.page); });
});

document.getElementById('profileBtn').addEventListener('click', function () {
  showPage('profilePage');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  populateProfileDisplay();
});

document.getElementById('notifBtn').addEventListener('click', function () {
  showPage('notificationPage');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page="jobsPage"]').forEach(btn => btn.addEventListener('click', loadJobs));
  document.querySelectorAll('.nav-item[data-page="applicationsPage"]').forEach(btn => btn.addEventListener('click', loadMyApplications));
});

// =====================
// STAT COUNTER ANIMATION
// =====================
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const unit = el.querySelector('.stat-unit');
  const unitHTML = unit ? unit.outerHTML : '';
  const steps = Math.floor(1200 / 16);
  let current = 0;
  const timer = setInterval(() => {
    current++;
    el.innerHTML = Math.round((current / steps) * target) + unitHTML;
    if (current >= steps) { el.innerHTML = target + unitHTML; clearInterval(timer); }
  }, 16);
}
document.querySelectorAll('.stat-number[data-target]').forEach(animateCounter);

// =====================
// CHART.JS — real data
// =====================
let trendChartInstance = null;

function buildTrendChart(applications) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  // Bucket applications into last 6 weeks
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const counts = Array(6).fill(0);
  applications.forEach(a => {
    const diff = now - new Date(a.created_at).getTime();
    const weekIdx = Math.floor(diff / weekMs); // 0 = this week, 1 = last week, etc.
    if (weekIdx < 6) counts[5 - weekIdx]++;   // reverse so oldest is left
  });

  const labels = ['5w ago', '4w ago', '3w ago', '2w ago', 'Last week', 'This week'];

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Applications',
        data: counts,
        borderColor: '#f15a24',
        backgroundColor: 'rgba(241, 90, 36, 0.08)',
        borderWidth: 3, pointBackgroundColor: '#f15a24',
        pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#5b6f94', font: { family: 'Inter', size: 12 } } },
        y: { grid: { color: 'rgba(91,111,148,0.1)' }, ticks: { color: '#5b6f94', font: { family: 'Inter', size: 12 }, stepSize: 1 }, beginAtZero: true },
      },
    },
  });
}

// =====================
// CV UPLOAD (FR-08)
// =====================
function handleFileUpload(file) {
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'docx'].includes(ext)) { showToast('Unsupported format. Use PDF or DOCX.', 'warning'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('File too large (max 10MB).', 'warning'); return; }
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
  if (!fileInput?.files?.length) { showToast('Please upload a CV file first.', 'warning'); return; }
  const file = fileInput.files[0];
  const btn = document.getElementById('analyzeBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...'; btn.disabled = true; }
  try {
    const cv_text = await extractTextFromFile(file);
    if (!cv_text.trim()) { showToast('Could not extract text. Try a different file.', 'error'); return; }

    const res = await fetch(`${API}/ai/resume-summary`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ cv_text }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'AI error', 'error'); return; }

    const total = data.scores?.total || 0;
    const cvScoreNum = document.getElementById('cvScoreNum');
    if (cvScoreNum) cvScoreNum.textContent = total;
    const cvSkills = document.getElementById('cvSkills');
    if (cvSkills) cvSkills.textContent = data.scores?.foundTech?.slice(0, 5).join(', ') || 'No tech skills detected';
    const cvGrade = document.getElementById('cvGrade');
    if (cvGrade) cvGrade.textContent = total >= 85 ? 'Senior' : total >= 70 ? 'Mid-Level' : total >= 50 ? 'Junior' : 'Entry-Level';

    document.getElementById('aiSummaryOutput').textContent = data.summary || '';

    const scoreEl = document.getElementById('aiScoreNumber');
    let count = 0;
    const interval = setInterval(() => {
      count += 2; if (count >= total) { count = total; clearInterval(interval); }
      scoreEl.textContent = count;
    }, 20);

    const verdict = total >= 85 ? 'Excellent — ready for senior roles' :
                    total >= 70 ? 'Good — solid candidate' :
                    total >= 55 ? 'Average — room to grow' : 'Needs work — let\'s improve this';
    document.getElementById('aiScoreVerdict').textContent = verdict;

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

    const impEl = document.getElementById('aiImprovements');
    if (impEl) impEl.innerHTML = (data.improvements || []).map(i =>
      `<li class="activity-item"><span class="activity-desc">${i}</span></li>`).join('');

    const kwEl = document.getElementById('aiKeywords');
    if (kwEl) kwEl.innerHTML = (data.missing_keywords || []).map(k =>
      `<span class="skill-gap-tag">${k}</span>`).join('');

    document.getElementById('aiSummaryCard').style.display = 'block';
    document.getElementById('aiPlaceholder').style.display = 'none';

    const profileScore = document.getElementById('profileScore');
    if (profileScore) profileScore.textContent = total + ' / 100';

    // Upload raw file to Supabase Storage (background, non-blocking)
    let file_url = null;
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const token = localStorage.getItem('token');
      const uploadRes = await fetch(`${API}/cv/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        file_url = uploadData.file_url;
      }
    } catch {}

    fetch(`${API}/cv/save`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ai_score: total, ai_summary: data.summary || '', red_flags: data.missing_keywords || [], file_name: file.name, cv_text, file_url }),
    }).then(() => loadDashboard()).catch(() => {});
    localStorage.setItem('cvAnalyzed', '1');
    showToast('CV analyzed successfully!', 'success');

  } catch (e) {
    console.error(e);
    showToast('Cannot connect to server.', 'error');
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-robot"></i> Analyze with AI'; btn.disabled = false; }
  }
}

// =====================
// FILTER BUTTONS
// =====================
function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// =====================
// AI INTERVIEW (FR-13) — Real Groq
// =====================
let interviewMode = 'text';
let isRecording = false;
let recognition = null;
let interviewSaved = false;
let interviewState = { category: '', currentQuestion: '', questionNumber: 0, totalQuestions: 5, scores: [] };

function selectMode(el, mode) {
  interviewMode = mode;
  document.querySelectorAll('.mode-option').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
}

async function startInterview() {
  const category = document.getElementById('interviewCategory').value;
  interviewState = { category, currentQuestion: '', questionNumber: 0, totalQuestions: 5, scores: [] };
  interviewSaved = false;

  document.getElementById('interviewSetup').style.display = 'none';
  document.getElementById('interviewSession').style.display = 'block';
  document.getElementById('interviewModeLabel').textContent = (interviewMode === 'voice' ? 'Voice' : 'Text') + ' Mode — ' + category;

  if (interviewMode === 'voice') {
    document.getElementById('textInputRow').style.display = 'none';
    document.getElementById('voiceInputRow').style.display = 'flex';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Text';
  } else {
    document.getElementById('textInputRow').style.display = 'flex';
    document.getElementById('voiceInputRow').style.display = 'none';
    document.getElementById('switchModeBtn').innerHTML = '<i class="fas fa-exchange-alt"></i> Switch to Voice';
  }

  document.getElementById('interviewChatBody').innerHTML = '';
  addBotMessage(`Hello! I'm your AI interviewer for <strong>${category}</strong>. I'll ask you 5 questions. Take your time and answer clearly.`, true);

  // Fetch first question from AI
  const loadingId = 'loading-' + Date.now();
  addBotMessage('<i class="fas fa-spinner fa-spin"></i> Preparing your first question...', true, loadingId);
  try {
    const res = await fetch(`${API}/ai/interview/start`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ category }),
    });
    const data = await res.json();
    document.getElementById(loadingId)?.remove();
    interviewState.currentQuestion = data.question || `Tell me about yourself and your experience with ${category}.`;
    interviewState.questionNumber = 1;
    addBotMessage(`<strong>Q1 / 5:</strong> ${interviewState.currentQuestion}`, true);
  } catch {
    document.getElementById(loadingId)?.remove();
    interviewState.currentQuestion = `Tell me about yourself and your experience with ${category}.`;
    interviewState.questionNumber = 1;
    addBotMessage(`<strong>Q1 / 5:</strong> ${interviewState.currentQuestion}`, true);
  }
}

function addBotMessage(text, isHTML = false, id = null) {
  const body = document.getElementById('interviewChatBody');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble received';
  if (id) bubble.id = id;
  if (isHTML) bubble.innerHTML = text; else bubble.textContent = text;
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

async function sendInterviewMsg() {
  const input = document.getElementById('interviewInput');
  const text = input.value.trim();
  if (!text) return;
  await submitInterviewAnswer(text);
  input.value = '';
}

async function submitInterviewAnswer(answer) {
  addUserMessage(answer);
  const sendBtn = document.querySelector('#textInputRow button');
  if (sendBtn) sendBtn.disabled = true;

  const loadingId = 'eval-' + Date.now();
  addBotMessage('<i class="fas fa-spinner fa-spin"></i> Evaluating your answer...', true, loadingId);

  try {
    const res = await fetch(`${API}/ai/interview/answer`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        category: interviewState.category,
        question: interviewState.currentQuestion,
        answer,
        question_number: interviewState.questionNumber,
        total_questions: interviewState.totalQuestions,
      }),
    });
    const data = await res.json();
    document.getElementById(loadingId)?.remove();

    if (data.feedback) {
      document.getElementById('fbRelevance').textContent = data.feedback.relevance || '—';
      document.getElementById('fbClarity').textContent = data.feedback.clarity || '—';
      document.getElementById('fbConfidence').textContent = data.feedback.confidence || '—';
      const score = data.feedback.score;
      document.getElementById('fbOverall').textContent = score ? `${score}/100` : '—';
      if (score) interviewState.scores.push(score);
      if (data.feedback.comment) addBotMessage(`💬 ${data.feedback.comment}`);
    }

    interviewState.questionNumber++;

    if (!data.is_final && data.next_question) {
      interviewState.currentQuestion = data.next_question;
      setTimeout(() => addBotMessage(`<strong>Q${interviewState.questionNumber} / 5:</strong> ${data.next_question}`, true), 700);
    } else {
      const avg = interviewState.scores.length
        ? Math.round(interviewState.scores.reduce((a, b) => a + b, 0) / interviewState.scores.length)
        : '—';
      setTimeout(() => {
        addBotMessage(`🎉 <strong>Interview complete!</strong> Your average score: <strong>${avg}/100</strong>. Check the feedback panel on the right for details.`, true);
        saveInterviewToHistory(); // auto-save on completion
      }, 700);
    }
  } catch {
    document.getElementById(loadingId)?.remove();
    addBotMessage('Sorry, I couldn\'t evaluate that answer. Please try again.');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
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
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!isRecording) {
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser. Switch to Text mode.', 'warning');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;       // keep listening until manually stopped
    recognition.interimResults = true;   // show live transcript while speaking
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      isRecording = true;
      finalTranscript = '';
      btn.classList.add('recording');
      status.textContent = '🎙️ Listening... speak freely, click to stop';
    };
    recognition.onresult = (e) => {
      // Build transcript from all results
      finalTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        finalTranscript += e.results[i][0].transcript + ' ';
      }
      status.textContent = `🎙️ "${finalTranscript.trim().slice(0, 60)}${finalTranscript.length > 60 ? '…' : ''}"`;
    };
    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return; // ignore silence, keep recording
      isRecording = false;
      btn.classList.remove('recording');
      status.textContent = 'Error: ' + e.error + '. Try again.';
      showToast('Voice error: ' + e.error, 'error');
    };
    recognition.onend = () => {
      // Only fires when manually stopped
      if (finalTranscript.trim()) {
        status.textContent = 'Processing...';
        submitInterviewAnswer(finalTranscript.trim());
      }
      isRecording = false;
      btn.classList.remove('recording');
      status.textContent = 'Click to start speaking';
      finalTranscript = '';
    };
    recognition.start();
  } else {
    if (recognition) recognition.stop();
    isRecording = false;
    btn.classList.remove('recording');
    status.textContent = 'Processing...';
  }
}

function saveInterviewToHistory() {
  if (interviewSaved || interviewState.scores.length === 0) return;
  interviewSaved = true;
  const avg = Math.round(interviewState.scores.reduce((a, b) => a + b, 0) / interviewState.scores.length);
  const history = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
  history.unshift({ category: interviewState.category, score: avg, date: Date.now() });
  if (history.length > 10) history.pop();
  localStorage.setItem('interviewHistory', JSON.stringify(history));
  renderInterviewHistory();
}

function renderInterviewHistory() {
  const list = document.getElementById('interviewHistoryList');
  if (!list) return;
  const history = JSON.parse(localStorage.getItem('interviewHistory') || '[]');
  if (!history.length) {
    list.innerHTML = '<li class="activity-item" style="color:var(--muted);font-size:0.85rem">No sessions yet. Start a mock interview!</li>';
    return;
  }
  list.innerHTML = history.map(h => {
    const scoreClass = h.score >= 75 ? 'high' : h.score >= 55 ? 'mid' : 'low';
    const diff = Date.now() - h.date;
    const timeAgo = diff < 3600000 ? 'just now'
      : diff < 86400000 ? Math.floor(diff / 3600000) + 'h ago'
      : diff < 604800000 ? Math.floor(diff / 86400000) + 'd ago'
      : Math.floor(diff / 604800000) + 'w ago';
    return `<li class="activity-item">
      <span class="activity-desc">${h.category} <span class="match-score ${scoreClass}" style="font-size:0.7rem;">${h.score}/100</span></span>
      <span class="activity-time">${timeAgo}</span>
    </li>`;
  }).join('');
}

function endInterview() {
  saveInterviewToHistory();
  document.getElementById('interviewSession').style.display = 'none';
  document.getElementById('interviewSetup').style.display = 'block';
  showToast('Interview session ended. Results saved!', 'success');
}

// =====================
// GRADE DETECTION & VERIFICATION (FR-14, FR-15) — Real Groq
// =====================
let gradeState = { detected: null, questions: [], answers: [], currentStep: 0 };

async function detectGrade() {
  const letterEl = document.getElementById('gradeDetectLetter');
  const textEl = document.getElementById('gradeDetectText');
  const reasonsEl = document.getElementById('gradeReasonsList');
  if (!letterEl) return;

  letterEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:1rem"></i>';
  textEl.textContent = 'Detecting...';
  if (reasonsEl) reasonsEl.innerHTML = '<li style="color:var(--muted)">Analyzing your CV...</li>';

  try {
    const res = await fetch(`${API}/ai/grade/detect`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();

    if (!data.grade) {
      letterEl.textContent = '?';
      textEl.textContent = 'Upload CV first';
      if (reasonsEl) reasonsEl.innerHTML = `<li style="color:var(--muted)">${data.message || 'Please upload and analyze your CV.'}</li>`;
      return;
    }

    gradeState.detected = data.grade;
    const gradeLetters = { 'Entry-Level': 'E', 'Junior': 'J', 'Mid-Level': 'M', 'Senior': 'S' };
    letterEl.textContent = gradeLetters[data.grade] || data.grade[0];
    textEl.textContent = data.grade;

    if (reasonsEl) {
      const signals = data.key_signals?.length ? data.key_signals : [data.reasoning].filter(Boolean);
      reasonsEl.innerHTML = signals.map(s => `<li>${s}</li>`).join('');
    }

    // Load quiz questions in background
    loadGradeQuiz(data.grade);
  } catch (e) {
    letterEl.textContent = '!';
    textEl.textContent = 'Error';
    if (reasonsEl) reasonsEl.innerHTML = '<li style="color:#f87171">Could not detect grade. Check backend connection.</li>';
  }
}

async function loadGradeQuiz(grade) {
  try {
    const res = await fetch(`${API}/ai/grade/quiz`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ grade }),
    });
    const data = await res.json();
    if (data.questions?.length) {
      gradeState.questions = data.questions;
      gradeState.answers = new Array(data.questions.length).fill('');
      gradeState.currentStep = 0;
      renderQuizQuestion(0);
    }
  } catch { /* keep static Q1 visible */ }
}

function renderQuizQuestion(index) {
  const q = gradeState.questions[index];
  if (!q) return;
  const total = gradeState.questions.length;
  const qEl = document.getElementById('quizQuestion');
  const numEl = document.querySelector('.quiz-q-num');
  const fillEl = document.getElementById('quizProgressFill');
  const progSpan = document.querySelector('.quiz-progress span');
  const ansEl = document.getElementById('quizAnswer');
  if (qEl) qEl.textContent = q;
  if (numEl) numEl.textContent = `Q${index + 1} of ${total}`;
  if (fillEl) fillEl.style.width = ((index / total) * 100) + '%';
  if (progSpan) progSpan.textContent = `${index} of ${total} completed`;
  if (ansEl) ansEl.value = gradeState.answers[index] || '';
}

function submitQuizAnswer() {
  const answer = document.getElementById('quizAnswer').value.trim();
  if (!answer) { showToast('Please type your answer before submitting.', 'warning'); return; }
  gradeState.answers[gradeState.currentStep] = answer;
  gradeState.currentStep++;

  if (gradeState.currentStep < gradeState.questions.length) {
    renderQuizQuestion(gradeState.currentStep);
    const fillEl = document.getElementById('quizProgressFill');
    const progSpan = document.querySelector('.quiz-progress span');
    if (fillEl) fillEl.style.width = ((gradeState.currentStep / gradeState.questions.length) * 100) + '%';
    if (progSpan) progSpan.textContent = `${gradeState.currentStep} of ${gradeState.questions.length} completed`;
  } else {
    verifyGrade();
  }
}

function skipQuestion() {
  gradeState.answers[gradeState.currentStep] = '';
  gradeState.currentStep++;
  if (gradeState.currentStep < gradeState.questions.length) {
    renderQuizQuestion(gradeState.currentStep);
  } else {
    verifyGrade();
  }
}

async function verifyGrade() {
  const submitBtn = document.querySelector('#verificationQuiz .btn-primary');
  const origHTML = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...'; submitBtn.disabled = true; }

  try {
    const res = await fetch(`${API}/ai/grade/verify`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ grade: gradeState.detected, questions: gradeState.questions, answers: gradeState.answers }),
    });
    const data = await res.json();

    document.getElementById('verificationQuiz').style.display = 'none';
    document.getElementById('verificationResult').style.display = 'block';

    const gradeLetters = { 'Entry-Level': 'E', 'Junior': 'J', 'Mid-Level': 'M', 'Senior': 'S' };
    const confirmed = data.confirmed_grade || gradeState.detected;
    const letterEl = document.getElementById('finalGradeLetter');
    const textEl = document.getElementById('finalGradeText');
    if (letterEl) letterEl.textContent = gradeLetters[confirmed] || confirmed[0];
    if (textEl) textEl.textContent = `${confirmed} (Confirmed)`;

    // Show score and feedback below result
    const result = document.getElementById('verificationResult');
    if (result && data.feedback) {
      const extra = document.createElement('div');
      extra.style.cssText = 'margin-top:1rem;padding:0.8rem;background:var(--card-bg);border-radius:8px;border:1px solid var(--border);';
      extra.innerHTML = `
        <p style="font-weight:600;margin-bottom:0.4rem">Score: <span style="color:#f7944d">${data.score || 0}/100</span></p>
        <p style="color:var(--muted);font-size:0.85rem;line-height:1.5">${data.feedback}</p>
        ${data.strong_areas?.length ? `<p style="margin-top:0.6rem;font-size:0.82rem"><strong>Strong areas:</strong> ${data.strong_areas.join(', ')}</p>` : ''}
        ${data.improvement_areas?.length ? `<p style="font-size:0.82rem"><strong>Improve:</strong> ${data.improvement_areas.join(', ')}</p>` : ''}
      `;
      result.appendChild(extra);
    }

    showToast(`Grade verified: ${confirmed}!`, 'success');
  } catch {
    showToast('Verification failed. Please try again.', 'error');
    if (submitBtn) { submitBtn.innerHTML = origHTML; submitBtn.disabled = false; }
  }
}

// =====================
// SKILL COACHING (FR-12) — Real Groq
// =====================
function getResourceSearchUrl(type, name) {
  const q = encodeURIComponent(name);
  switch (type) {
    case 'Course':     return `https://www.udemy.com/courses/search/?q=${q}`;
    case 'Book':       return `https://www.google.com/search?q=${q}+book+pdf`;
    case 'Practice':   return `https://github.com/search?q=${q}&type=repositories`;
    case 'Community':  return `https://www.reddit.com/search/?q=${q}`;
    default:           return `https://www.google.com/search?q=${q}`;
  }
}
let coachingLoaded = false;
const COACHING_VERSION = 'v2'; // bump to invalidate cache

async function loadCoaching() {
  if (coachingLoaded && sessionStorage.getItem('coachingVer') === COACHING_VERSION) return;
  sessionStorage.setItem('coachingVer', COACHING_VERSION);
  coachingLoaded = true;

  const gapsRow = document.getElementById('coachingGapsRow');
  const grid = document.getElementById('coachingGrid');

  try {
    const res = await fetch(`${API}/ai/coaching`, { method: 'POST', headers: authHeaders() });
    const data = await res.json();

    if (data.message) {
      if (gapsRow) gapsRow.innerHTML = `<span style="color:var(--muted);font-size:0.85rem">${data.message}</span>`;
      if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-upload fa-2x"></i><p style="margin-top:0.8rem">${data.message}</p></div>`;
      return;
    }

    // Skill gaps row
    if (gapsRow) {
      gapsRow.innerHTML = (data.skill_gaps || []).map(g =>
        `<span class="skill-gap-tag" title="${g.reason}">${g.skill}</span>`
      ).join('') || '<span style="color:var(--muted);font-size:0.85rem">No major gaps — great CV!</span>';
    }

    // Coaching cards grid
    if (grid) {
      const typeIcons = { Course: 'fa-graduation-cap', Book: 'fa-book', Practice: 'fa-code', Community: 'fa-users' };
      const priorityColors = { high: '#f87171', medium: '#f7944d', low: '#27c93f' };
      grid.innerHTML = (data.tips || []).map(t => `
        <div class="coaching-card">
          <div class="coaching-icon"><i class="fas fa-lightbulb"></i></div>
          <h3>${t.title}</h3>
          <p>${t.description}</p>
        </div>
      `).join('') + (data.resources || []).map(r => {
        const searchUrl = getResourceSearchUrl(r.type, r.name);
        return `
        <div class="coaching-card" style="cursor:pointer" onclick="window.open('${searchUrl}','_blank')">
          <div class="coaching-icon"><i class="fas ${typeIcons[r.type] || 'fa-link'}"></i></div>
          <h3>${r.name} <i class="fas fa-external-link-alt" style="font-size:0.65rem;opacity:0.5;margin-left:4px"></i></h3>
          <p>${r.description}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;">
            <span style="font-size:0.75rem;font-weight:600;background:#4285f41a;color:#4285f4;padding:2px 8px;border-radius:99px;">${r.type}</span>
            <span style="font-size:0.75rem;color:#4285f4;opacity:0.7">Search →</span>
          </div>
        </div>`;
      }).join('');

      if (data.weekly_plan) {
        const plan = document.createElement('div');
        plan.style.cssText = 'grid-column:1/-1;padding:1rem;background:linear-gradient(135deg,rgba(241,90,36,0.08),rgba(247,148,77,0.08));border:1px solid rgba(241,90,36,0.2);border-radius:12px;';
        plan.innerHTML = `<p style="font-weight:600;margin-bottom:0.4rem"><i class="fas fa-calendar-alt" style="color:#f15a24;margin-right:0.4rem"></i>Your Weekly Plan</p><p style="color:var(--muted);font-size:0.88rem;line-height:1.6">${data.weekly_plan}</p>`;
        grid.appendChild(plan);
      }
    }
    showToast('Coaching advice loaded!', 'success');
  } catch {
    if (gapsRow) gapsRow.innerHTML = '<span style="color:#f87171;font-size:0.85rem">Could not load — check backend connection.</span>';
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted)"><i class="fas fa-exclamation-circle fa-2x"></i><p style="margin-top:0.8rem">Could not load coaching advice.</p></div>';
    coachingLoaded = false; // Allow retry
  }
}

// =====================
// MESSAGES — Real API with static fallback
// =====================
let activeConversation = null; // { otherUserId, name, role }
const staticConversations = [
  { name: 'Sarah Chen', role: 'HR Manager at TechFlow', avatar: 'SC', messages: [
    { type: 'received', text: "Hi! We reviewed your application and were really impressed with your profile." },
    { type: 'sent', text: "Thank you! I'm very excited about the opportunity." },
    { type: 'received', text: "We'd love to schedule your interview! Are you available this Thursday at 2 PM?" },
  ]},
  { name: 'Mike Johnson', role: 'Recruiter at DataCorp', avatar: 'MJ', messages: [
    { type: 'received', text: "Hello! I think you'd be a great fit for our Full Stack Developer role." },
    { type: 'sent', text: "Hi Mike! Could you share more about the tech stack?" },
    { type: 'received', text: "Your application has been reviewed. The engineering team was impressed with your React experience." },
  ]},
];
let activeStaticIndex = 0;
let usingStaticMode = false;

async function loadConversations() {
  const list = document.getElementById('msgConvList');
  if (!list) return;
  list.innerHTML = '<div style="padding:1rem;color:var(--muted);text-align:center;font-size:0.85rem"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const res = await fetch(`${API}/messages/conversations`, { headers: authHeaders() });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const convs = data.conversations || [];

    if (!convs.length) {
      // Fall back to static demo conversations
      renderStaticConversations(list);
      return;
    }

    usingStaticMode = false;
    const colors = ['#f7944d','#a78bfa','#34d399','#f472b6','#4285f4'];
    list.innerHTML = convs.map((conv, i) => {
      const initials = (conv.other_user_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const col = colors[i % colors.length];
      return `
        <div class="msg-item" onclick="selectConversation(this,'${escapeAttr(conv.other_user_name)}','','${conv.other_user_id}',${i})">
          <div class="cand-avatar msg-avatar" style="background:${col}">${initials}</div>
          <div class="msg-preview">
            <div class="msg-name">${conv.other_user_name || 'Unknown'}</div>
            <div class="msg-snippet">${(conv.last_message || '').slice(0, 48)}${(conv.last_message?.length || 0) > 48 ? '…' : ''}</div>
          </div>
          <div class="msg-meta">
            ${conv.unread > 0 ? `<span class="msg-unread">${conv.unread}</span>` : ''}
          </div>
        </div>`;
    }).join('');

    // Auto-open first conversation
    const firstItem = list.querySelector('.msg-item');
    if (firstItem && convs[0]) firstItem.click();
  } catch {
    renderStaticConversations(list);
  }
}

function renderStaticConversations(list) {
  usingStaticMode = true;
  const colors = ['linear-gradient(135deg,#f7944d,#f15a24)', 'linear-gradient(135deg,#a78bfa,#7c3aed)'];
  list.innerHTML = staticConversations.map((c, i) => `
    <div class="msg-item${i === 0 ? ' active' : ''}" onclick="selectStaticConversation(this,${i})">
      <div class="cand-avatar msg-avatar" style="background:${colors[i % colors.length]}">${c.avatar}</div>
      <div class="msg-preview">
        <div class="msg-name">${c.name}</div>
        <div class="msg-snippet">${c.messages[c.messages.length - 1].text.slice(0, 48)}…</div>
      </div>
      <div class="msg-meta">${i === 0 ? '<span class="msg-unread">2</span>' : ''}</div>
    </div>
  `).join('');

  // Show first conversation
  selectStaticConversation(list.querySelector('.msg-item'), 0);
}

function selectStaticConversation(el, index) {
  document.querySelectorAll('.msg-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  el.querySelector('.msg-unread')?.remove();
  activeStaticIndex = index;
  const conv = staticConversations[index];
  document.getElementById('msgChatName').textContent = conv.name;
  document.getElementById('msgChatRole').textContent = conv.role;
  const body = document.getElementById('msgChatBody');
  body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
  conv.messages.forEach(m => {
    const b = document.createElement('div');
    b.className = 'chat-bubble ' + m.type;
    b.textContent = m.text;
    body.appendChild(b);
  });
  body.scrollTop = body.scrollHeight;
}

async function selectConversation(el, name, role, otherUserId, index) {
  document.querySelectorAll('.msg-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  el.querySelector('.msg-unread')?.remove();
  activeConversation = { otherUserId, name, role };
  document.getElementById('msgChatName').textContent = name;
  document.getElementById('msgChatRole').textContent = role || '';

  const body = document.getElementById('msgChatBody');
  body.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const res = await fetch(`${API}/messages/${otherUserId}`, { headers: authHeaders() });
    const data = await res.json();
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
    (data.messages || []).forEach(msg => {
      const b = document.createElement('div');
      b.className = 'chat-bubble ' + (msg.sender_id === currentUserId ? 'sent' : 'received');
      b.textContent = msg.content || '';
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  } catch {
    body.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:0.85rem">Could not load messages.</div>';
  }
}

async function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  const body = document.getElementById('msgChatBody');

  if (usingStaticMode || !activeConversation) {
    // Static mode — local only
    const b = document.createElement('div');
    b.className = 'chat-bubble sent';
    b.textContent = text;
    body.appendChild(b);
    staticConversations[activeStaticIndex]?.messages.push({ type: 'sent', text });
    body.scrollTop = body.scrollHeight;
    setTimeout(() => {
      const replies = ['Thanks for your message! I\'ll get back to you shortly.', 'That sounds great! Let me check with the team.', 'Perfect, I\'ll send the details via email.'];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      staticConversations[activeStaticIndex]?.messages.push({ type: 'received', text: reply });
      const rb = document.createElement('div');
      rb.className = 'chat-bubble received';
      rb.textContent = reply;
      body.appendChild(rb);
      body.scrollTop = body.scrollHeight;
    }, 1400);
    return;
  }

  // Real API mode
  const b = document.createElement('div');
  b.className = 'chat-bubble sent';
  b.textContent = text;
  body.appendChild(b);
  body.scrollTop = body.scrollHeight;

  try {
    await fetch(`${API}/messages/send`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ receiver_id: activeConversation.otherUserId, content: text, receiver_name: activeConversation.name }),
    });
  } catch {
    showToast('Message failed to send.', 'error');
  }
}

function filterMessages(query) {
  const items = document.querySelectorAll('.msg-item');
  const q = query.toLowerCase();
  items.forEach(item => {
    const name = item.querySelector('.msg-name')?.textContent.toLowerCase() || '';
    const snippet = item.querySelector('.msg-snippet')?.textContent.toLowerCase() || '';
    item.style.display = (name.includes(q) || snippet.includes(q)) ? 'flex' : 'none';
  });
}

// =====================
// MESSAGE COMPANY (from job card)
// =====================
async function messageCompany(companyUserId, companyName) {
  showPage('messagesPage');
  // Set active conversation
  activeConversation = { otherUserId: companyUserId, name: companyName, role: 'Company' };
  usingStaticMode = false;

  document.getElementById('msgChatName').textContent = companyName;
  document.getElementById('msgChatRole').textContent = 'Company';

  // Load conversation list then open this conversation
  await loadConversations();

  const body = document.getElementById('msgChatBody');
  body.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--muted)"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(`${API}/messages/${companyUserId}`, { headers: authHeaders() });
    const data = await res.json();
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
    if (!data.messages?.length) {
      body.innerHTML += '<div style="text-align:center;padding:1rem;color:var(--muted);font-size:0.85rem">No messages yet. Say hello! 👋</div>';
    } else {
      data.messages.forEach(msg => {
        const b = document.createElement('div');
        b.className = 'chat-bubble ' + (msg.sender_id === currentUserId ? 'sent' : 'received');
        b.textContent = msg.content;
        body.appendChild(b);
      });
    }
    body.scrollTop = body.scrollHeight;
  } catch { /* ignore */ }
}

// =====================
// UTILITIES
// =====================
function escapeAttr(str) {
  return (str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
