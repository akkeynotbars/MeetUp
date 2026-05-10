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

  // Dynamic date badge
  const dateBadge = document.getElementById('dashDateBadge');
  if (dateBadge) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateBadge.innerHTML = `<i class="fas fa-calendar-alt"></i> ${fmt(now)} – ${fmt(end)}, ${now.getFullYear()}`;
  }

  loadCompanyProfileDisplay();
  loadCompanyDashboard();
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
// COMPANY DASHBOARD LOADER
// =====================
async function loadCompanyDashboard() {
  try {
    const [jobsRes, appsRes] = await Promise.all([
      fetch(`${API}/jobs/my`, { headers: authHeaders() }),
      fetch(`${API}/applications/company`, { headers: authHeaders() }).catch(() => ({ ok: false })),
    ]);

    const jobs = jobsRes.ok ? (await jobsRes.json()).jobs || [] : [];

    // --- Stat cards ---
    const activeJobs = jobs.filter(j => j.status === 'active');
    if (document.getElementById('statActiveJobs')) document.getElementById('statActiveJobs').textContent = activeJobs.length;

    // Fetch all applications for all company jobs
    let allApps = [];
    for (const job of jobs.slice(0, 5)) { // limit to avoid too many requests
      try {
        const r = await fetch(`${API}/applicants/${job.id}`, { headers: authHeaders() });
        if (r.ok) {
          const d = await r.json();
          allApps = allApps.concat((d.applicants || []).map(a => ({ ...a, jobTitle: job.title })));
        }
      } catch {}
    }

    if (document.getElementById('statTotalApplicants')) document.getElementById('statTotalApplicants').textContent = allApps.length;
    const shortlisted = allApps.filter(a => a.status === 'shortlisted').length;
    if (document.getElementById('statShortlisted')) document.getElementById('statShortlisted').textContent = shortlisted;

    const withMatch = allApps.filter(a => a.match_percentage != null);
    const avgMatch = withMatch.length
      ? Math.round(withMatch.reduce((s, a) => s + a.match_percentage, 0) / withMatch.length)
      : null;
    if (document.getElementById('statAvgMatch')) {
      document.getElementById('statAvgMatch').innerHTML = avgMatch != null
        ? `${avgMatch}<span class="stat-unit">%</span>`
        : `—<span class="stat-unit">%</span>`;
    }

    // --- Recent Activity ---
    const actList = document.getElementById('companyActivityList');
    if (actList) {
      if (allApps.length === 0 && jobs.length === 0) {
        actList.innerHTML = `<li class="activity-item"><span class="activity-desc" style="color:var(--text-muted);">No activity yet — post a job to get started!</span></li>`;
      } else {
        const recent = allApps.slice(0, 5);
        actList.innerHTML = recent.length
          ? recent.map(a => {
              const name = a.Users?.name || 'Applicant';
              const when = timeAgo(a.created_at);
              return `<li class="activity-item">
                <span class="activity-desc"><span class="badge-active">New</span> <strong>${name}</strong> applied to ${a.jobTitle || 'a job'}</span>
                <span class="activity-time">${when}</span>
              </li>`;
            }).join('')
          : `<li class="activity-item"><span class="activity-desc" style="color:var(--text-muted);">No applicants yet.</span></li>`;
      }
    }

    // --- Job Cards ---
    const jobCards = document.getElementById('companyJobCards');
    if (jobCards) {
      if (activeJobs.length === 0) {
        jobCards.innerHTML = `<div class="activity-item"><span style="color:var(--text-muted);">No active job postings. <a href="#" onclick="showPage('postJobPage');return false;">Post one!</a></span></div>`;
      } else {
        jobCards.innerHTML = activeJobs.slice(0, 2).map(j => `
          <div class="job-card" style="cursor:pointer;" onclick="showPage('applicantsPage');loadApplicants('${j.id}')">
            <div class="job-title-row">
              <span class="job-title">${j.title}</span>
              <span class="job-badge-active"><i class="fas fa-circle" style="font-size:0.45rem;margin-right:4px;color:#f15a24;"></i>Active</span>
            </div>
            <div class="job-location"><i class="fas fa-map-marker-alt"></i> ${j.location || 'Remote'} · ${j.job_type || 'Full-time'}</div>
            <div class="job-metrics">
              <div class="metric"><span class="metric-value">${j.salary_range || '—'}</span><span class="metric-label">salary</span></div>
              <span class="view-link">View Applicants <i class="fas fa-arrow-right"></i></span>
            </div>
          </div>
        `).join('');
      }
    }

    // --- Recent Applicants (quick actions panel) ---
    const recentApps = document.getElementById('companyRecentApplicants');
    if (recentApps) {
      if (allApps.length === 0) {
        recentApps.innerHTML = `<div class="interview-item"><span class="interview-role" style="color:var(--text-muted);">No applicants yet</span></div>`;
      } else {
        recentApps.innerHTML = allApps.slice(0, 3).map(a => `
          <div class="interview-item">
            <div class="interview-info"><i class="fas fa-calendar-alt"></i><span class="interview-time">${timeAgo(a.created_at)}</span></div>
            <span class="interview-role">${a.Users?.name || 'Applicant'} — ${a.jobTitle || 'Job'}</span>
          </div>
        `).join('');
      }
    }

    // --- Recent Decisions (shortlisted/rejected) ---
    const decisions = document.getElementById('recentDecisionsList');
    if (decisions) {
      const decided = allApps.filter(a => a.status === 'shortlisted' || a.status === 'rejected');
      if (decided.length === 0) {
        decisions.innerHTML = `<li class="activity-item"><span class="activity-desc" style="color:var(--text-muted);">No decisions made yet.</span></li>`;
      } else {
        decisions.innerHTML = decided.slice(0, 4).map(a => {
          const cls = a.status === 'shortlisted' ? 's-shortlisted' : 's-rejected';
          return `<li class="activity-item">
            <span class="activity-desc"><strong>${a.Users?.name || 'Applicant'}</strong> — ${a.jobTitle || 'Job'} <span class="status-badge ${cls}" style="font-size:0.6rem;padding:0.2rem 0.7rem;">${a.status}</span></span>
            <span class="activity-time">${timeAgo(a.created_at)}</span>
          </li>`;
        }).join('');
      }
    }

    // --- Notifications page ---
    const notifList = document.getElementById('companyNotifList');
    if (notifList) {
      if (allApps.length === 0) {
        notifList.innerHTML = `<li class="activity-item"><span class="activity-desc" style="color:var(--text-muted);">No notifications yet.</span></li>`;
      } else {
        notifList.innerHTML = allApps.slice(0, 5).map(a => `
          <li class="activity-item">
            <span class="activity-desc"><span class="badge-active">New</span> <strong>${a.Users?.name || 'Someone'}</strong> applied to <strong>${a.jobTitle || 'a job'}</strong></span>
            <span class="activity-time">${timeAgo(a.created_at)}</span>
          </li>
        `).join('');
      }
    }

    // --- Chart ---
    buildCompanyTrendChart(allApps);

  } catch (e) {
    console.error('Company dashboard error:', e);
  }
}

let companyChartInstance = null;
function buildCompanyTrendChart(apps) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const counts = Array(6).fill(0);
  apps.forEach(a => {
    const idx = Math.floor((now - new Date(a.created_at).getTime()) / weekMs);
    if (idx < 6) counts[5 - idx]++;
  });
  const labels = ['5w ago', '4w ago', '3w ago', '2w ago', 'Last week', 'This week'];
  if (companyChartInstance) companyChartInstance.destroy();
  companyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Applicants', data: counts, borderColor: '#f15a24', backgroundColor: 'rgba(241,90,36,0.08)', borderWidth: 3, pointBackgroundColor: '#f15a24', pointRadius: 5, pointHoverRadius: 7, tension: 0.4, fill: true }],
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

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// =====================
// COMPANY PROFILE
// =====================
async function loadCompanyProfileDisplay() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const extra = JSON.parse(localStorage.getItem('companyProfileExtra') || '{}');

  // Profile page display
  if (document.getElementById('profileName')) document.getElementById('profileName').textContent = user.name || '—';
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').textContent = user.email || '—';
  if (document.getElementById('profileIndustry')) document.getElementById('profileIndustry').textContent = extra.industry || '—';
  if (document.getElementById('profileWebsite')) document.getElementById('profileWebsite').textContent = extra.website || '—';

  // Fetch company from API
  try {
    const res = await fetch(`${API}/auth/company`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      const co = data.company;
      if (co) {
        // Save to extra
        const saved = JSON.parse(localStorage.getItem('companyProfileExtra') || '{}');
        if (!saved.company_name) saved.company_name = co.name;
        if (!saved.industry) saved.industry = co.industry || '';
        localStorage.setItem('companyProfileExtra', JSON.stringify(saved));

        if (document.getElementById('profileCompany')) document.getElementById('profileCompany').textContent = co.name || '—';
        if (document.getElementById('profileIndustry')) document.getElementById('profileIndustry').textContent = co.industry || '—';
      }
    }
  } catch (e) {}

  // Fallback for profileCompany
  const coExtra = JSON.parse(localStorage.getItem('companyProfileExtra') || '{}');
  if (document.getElementById('profileCompany')) document.getElementById('profileCompany').textContent = coExtra.company_name || user.name || '—';

  // Settings email display
  if (document.getElementById('settingsEmailDisplay')) document.getElementById('settingsEmailDisplay').textContent = user.email || '—';

  // Pre-fill settings form
  prefillCompanySettingsForm();
}

function prefillCompanySettingsForm() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const extra = JSON.parse(localStorage.getItem('companyProfileExtra') || '{}');

  if (document.getElementById('settingsUserName')) document.getElementById('settingsUserName').value = user.name || '';
  if (document.getElementById('settingsCompanyName')) document.getElementById('settingsCompanyName').value = extra.company_name || user.name || '';
  if (document.getElementById('settingsIndustry')) {
    const sel = document.getElementById('settingsIndustry');
    sel.value = extra.industry || '';
  }
  if (document.getElementById('settingsDescription')) document.getElementById('settingsDescription').value = extra.description || '';
  if (document.getElementById('settingsWebsite')) document.getElementById('settingsWebsite').value = extra.website || '';
  if (document.getElementById('settingsSize')) {
    const sel = document.getElementById('settingsSize');
    sel.value = extra.size || '';
  }
}

async function saveCompanyProfile() {
  const name = document.getElementById('settingsUserName')?.value?.trim();
  const company_name = document.getElementById('settingsCompanyName')?.value?.trim();
  const industry = document.getElementById('settingsIndustry')?.value;
  const description = document.getElementById('settingsDescription')?.value?.trim();
  const website = document.getElementById('settingsWebsite')?.value?.trim();
  const size = document.getElementById('settingsSize')?.value;

  if (!company_name) { showToast('Company name cannot be empty', 'error'); return; }

  try {
    const res = await fetch(`${API}/auth/company-profile`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ name, company_name, industry }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to save', 'error'); return; }

    // Update localStorage user name
    if (data.user) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.name = data.user.name;
      localStorage.setItem('user', JSON.stringify(user));
    }

    // Save extra fields
    const extra = { company_name, industry, description, website, size };
    localStorage.setItem('companyProfileExtra', JSON.stringify(extra));

    // Refresh display
    loadCompanyProfileDisplay();
    showToast('Company profile updated!', 'success');
  } catch (e) {
    showToast('Network error — try again', 'error');
  }
}

// =====================
// API HELPERS
// =====================
const API = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// =====================
// JOB POSTING (Task 23 — FR-03)
// =====================
async function submitJobPosting(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]') || document.getElementById('postJobBtn');
  const reqs = document.getElementById('jobReqs')?.value || '';
  const skills = document.getElementById('jobSkills')?.value || '';
  const body = {
    title: document.getElementById('jobTitle')?.value,
    description: document.getElementById('jobDesc')?.value,
    requirements: reqs + (skills ? '\n\nSkills: ' + skills : ''),
    location: document.getElementById('jobLocation')?.value,
    salary_range: document.getElementById('jobSalary')?.value,
    job_type: document.getElementById('jobType')?.value,
    status: document.getElementById('jobStatus')?.value || 'active',
  };

  if (btn) { btn.textContent = 'Posting...'; btn.disabled = true; }

  try {
    const res = await fetch(`${API}/jobs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to post job', 'error'); return; }
    showToast('Job posted successfully!', 'success');
    e.target.reset();
    loadMyJobs();
    showPage('jobPostingsPage');
  } catch {
    showToast('Cannot connect to server.', 'error');
  } finally {
    if (btn) { btn.textContent = 'Post Job'; btn.disabled = false; }
  }
}

async function loadMyJobs() {
  const container = document.getElementById('jobListings');
  if (!container) return;
  try {
    const res = await fetch(`${API}/jobs/my`, { headers: authHeaders() });
    const data = await res.json();
    if (!data.jobs) return;
    if (data.jobs.length === 0) {
      container.innerHTML = '<p style="color:#5b6f94;padding:1rem">No job postings yet. Post your first job!</p>';
      return;
    }
    container.innerHTML = data.jobs.map(j => {
      const isActive = j.status === 'active';
      const badge = isActive
        ? `<span class="job-badge-active"><i class="fas fa-circle" style="font-size:0.4rem;margin-right:4px;color:#f15a24;"></i> Active</span>`
        : `<span class="job-badge-closed" style="background:rgba(91,111,148,0.15);color:#5b6f94;padding:4px 10px;border-radius:20px;font-size:0.8rem">Closed</span>`;
      return `
        <div class="posting-card">
          <div class="posting-top">
            <div>
              <div class="posting-title">${j.title}</div>
              <div class="posting-meta"><i class="fas fa-map-marker-alt"></i> ${j.job_type || 'Full-time'} · ${j.location || 'Remote'}</div>
            </div>
            ${badge}
          </div>
          <div class="posting-stats">
            <div class="posting-stat"><span class="ps-num">—</span><span class="ps-label">applicants</span></div>
            <div class="posting-stat"><span class="ps-num">${j.salary_range || '—'}</span><span class="ps-label">salary</span></div>
          </div>
          <div class="posting-footer">
            <button class="btn-outline btn-sm" onclick="deleteJob('${j.id}')"><i class="fas fa-times"></i> Delete</button>
            <button class="btn-primary btn-sm" onclick="loadApplicants('${j.id}'); showPage('applicantsPage')"><i class="fas fa-users"></i> View Applicants</button>
          </div>
        </div>`;
    }).join('');
  } catch { /* server not running */ }
}

async function deleteJob(id) {
  showConfirm('Delete this job posting?', async () => {
    const res = await fetch(`${API}/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) { showToast('Job deleted.', 'success'); loadMyJobs(); }
    else showToast('Failed to delete job.', 'error');
  });
}

// =====================
// APPLICANTS (Task 24 — FR-05/06/07)
// =====================
async function loadApplicants(jobId) {
  const container = document.getElementById('applicantList');
  if (!container) return;

  // Always populate job selector dropdown
  const selector = document.getElementById('jobSelector');
  try {
    const r = await fetch(`${API}/jobs/my`, { headers: authHeaders() });
    const d = await r.json();
    if (!d.jobs || !d.jobs.length) {
      container.innerHTML = '<div class="table-row"><p style="color:#5b6f94;padding:1rem">No jobs posted yet.</p></div>';
      if (selector) selector.innerHTML = '<option value="">No jobs posted</option>';
      return;
    }
    if (selector) {
      selector.innerHTML = d.jobs.map(j =>
        `<option value="${j.id}" ${j.id === jobId ? 'selected' : ''}>${j.title}</option>`
      ).join('');
    }
    if (!jobId) jobId = d.jobs[0].id;
    if (selector) selector.value = jobId;
  } catch { return; }

  container.innerHTML = '<div class="table-row"><p style="color:#5b6f94;padding:1rem">Loading applicants...</p></div>';
  try {
    const res = await fetch(`${API}/applicants/${jobId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) {
      container.innerHTML = `<div class="table-row"><p style="color:#ff5050;padding:1rem">${data.error}</p></div>`;
      return;
    }
    if (!data.applicants.length) {
      container.innerHTML = '<div class="table-row"><p style="color:#5b6f94;padding:1rem">No applicants yet for this job.</p></div>';
      const countEl = document.getElementById('applicantCount');
      if (countEl) countEl.textContent = '0 applicants';
      return;
    }
    const countEl = document.getElementById('applicantCount');
    if (countEl) countEl.textContent = `${data.applicants.length} applicant${data.applicants.length > 1 ? 's' : ''}`;

    const cols = 'style="grid-template-columns: 1.5fr 1fr 0.6fr 0.5fr 0.7fr 0.8fr 1fr;"';
    container.innerHTML = data.applicants.map(a => {
      const name = a.Users?.name || 'Unknown';
      const email = a.Users?.email || '';
      const score = a.CVs?.ai_score;
      const summary = a.CVs?.ai_summary || '—';
      const flags = a.CVs?.red_flags?.length ? a.CVs.red_flags.join(', ') : null;
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const scoreClass = score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low';
      const statusClass = a.status === 'shortlisted' ? 's-shortlisted' : a.status === 'rejected' ? 's-rejected' : 's-new';
      return `
        <div class="table-row" id="app-${a.id}" ${cols}>
          <div class="candidate-cell">
            <div class="cand-avatar" style="background:#f7944d">${initials}</div>
            <div><div class="cand-name">${name}</div><div class="cand-email">${email}</div></div>
          </div>
          <span class="table-cell ai-summary">${summary}</span>
          <span class="table-cell">${score != null ? `<span class="ai-score ${scoreClass}">${score}</span>` : '—'}</span>
          <span class="table-cell">${flags ? `<span style="color:#ff5050;font-size:0.75rem">${flags}</span>` : '<span class="flag-none"><i class="fas fa-check-circle"></i></span>'}</span>
          <span class="table-cell muted">${new Date(a.created_at).toLocaleDateString()}</span>
          <span class="table-cell"><span class="status-badge ${statusClass}">${a.status}</span></span>
          <span class="table-cell action-cell">
            <button class="action-mini green" onclick="shortlistCandidate('${a.id}','${name.replace(/'/g,'')}')"><i class="fas fa-user-check"></i></button>
            <button class="action-mini red" onclick="rejectCandidate('${a.id}','${name.replace(/'/g,'')}')"><i class="fas fa-user-times"></i></button>
            <button class="action-mini" style="background:rgba(66,133,244,0.15);color:#4285f4" title="Message" onclick="messageApplicant('${a.user_id}','${name.replace(/'/g,'')}','${email}')"><i class="fas fa-comment-alt"></i></button>
          </span>
        </div>`;
    }).join('');
  } catch {
    container.innerHTML = '<div class="table-row"><p style="color:#5b6f94;padding:1rem">Could not load — backend offline.</p></div>';
  }
}

// =====================
// PAGE NAVIGATION
// =====================
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Show the selected page
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === pageId) {
      btn.classList.add('active');
    }
  });
}

// Attach click listeners to all sidebar nav buttons
document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
  btn.addEventListener('click', function () {
    showPage(this.dataset.page);
    if (this.dataset.page === 'dashboardPage') loadCompanyDashboard();
    if (this.dataset.page === 'applicantsPage') loadApplicants();
    if (this.dataset.page === 'jobPostingsPage') loadMyJobs();
  });
});

// Profile & Notification icon buttons
document.getElementById('profileBtn').addEventListener('click', function () {
  showPage('profilePage');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  loadCompanyProfileDisplay();
});

// Prefill settings form when navigating to settings page
document.querySelector('[data-page="settingsPage"]')?.addEventListener('click', function () {
  setTimeout(prefillCompanySettingsForm, 50);
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
    if (current >= steps) {
      el.innerHTML = target + unitHTML;
      clearInterval(timer);
    }
  }, step);
}

document.querySelectorAll('.stat-number[data-target]').forEach(animateCounter);


// =====================
// CHART.JS — TREND CHART
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
        borderWidth: 3,
        pointBackgroundColor: '#f15a24',
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#5b6f94', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(91,111,148,0.1)' },
          ticks: {
            color: '#5b6f94',
            font: { family: 'Inter', size: 12 },
            stepSize: 3
          },
          beginAtZero: true
        }
      }
    }
  });
}

// =====================
// FILTER BUTTONS (Applicants page)
// =====================
function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// =====================
// MESSAGES — Real API
// =====================
let companyActiveConv = null; // { otherUserId, name }

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(container);
  }
  const s = document.createElement('style');
  s.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(s);
  const colors = { success: '#27c93f', error: '#f87171', warning: '#f7944d', info: '#4285f4' };
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.style.cssText = `display:flex;align-items:center;gap:0.6rem;padding:0.8rem 1.1rem;background:var(--card-bg,#1e2440);border:1px solid ${colors[type]}33;border-left:3px solid ${colors[type]};border-radius:8px;color:var(--text,#e4e8f0);font-size:0.86rem;box-shadow:0 4px 16px rgba(0,0,0,0.3);min-width:220px;max-width:360px;animation:toastIn 0.3s ease;`;
  toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]};flex-shrink:0"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.transition = 'all 0.3s ease'; toast.style.opacity = '0'; toast.style.transform = 'translateX(110%)'; setTimeout(() => toast.remove(), 300); }, 5000);
}

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

async function loadCompanyConversations() {
  const list = document.getElementById('companyMsgList');
  if (!list) return;
  list.innerHTML = '<div style="padding:1rem;color:#5b6f94;text-align:center;font-size:0.85rem"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(`${API}/messages/conversations`, { headers: authHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const convs = data.conversations || [];
    if (!convs.length) {
      list.innerHTML = '<div style="padding:1rem;color:#5b6f94;text-align:center;font-size:0.85rem">No conversations yet.<br>Message an applicant from the Applicants page.</div>';
      return;
    }
    const colors = ['#f7944d','#4285f4','#27c93f','#a78bfa','#f472b6'];
    list.innerHTML = convs.map((c, i) => {
      const initials = (c.other_user_name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      return `<div class="msg-item" onclick="selectCompanyConv(this,'${c.other_user_id}','${escapeAttr(c.other_user_name)}')">
        <div class="cand-avatar msg-avatar" style="background:${colors[i % colors.length]};width:40px;height:40px;font-size:0.85rem;flex-shrink:0">${initials}</div>
        <div class="msg-preview" style="flex:1;min-width:0">
          <div class="msg-name">${c.other_user_name || 'Applicant'}</div>
          <div class="msg-snippet" style="font-size:0.8rem;color:#5b6f94;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(c.last_message || '').slice(0, 45)}…</div>
        </div>
        ${c.unread > 0 ? `<span class="msg-unread">${c.unread}</span>` : ''}
      </div>`;
    }).join('');
    // Auto-open first
    list.querySelector('.msg-item')?.click();
  } catch {
    list.innerHTML = '<div style="padding:1rem;color:#5b6f94;text-align:center;font-size:0.85rem">Could not load messages.</div>';
  }
}

async function selectCompanyConv(el, otherUserId, name) {
  document.querySelectorAll('.msg-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  el.querySelector('.msg-unread')?.remove();
  companyActiveConv = { otherUserId, name };
  const nameEl = document.getElementById('chatName');
  const roleEl = document.getElementById('chatRole');
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = 'Applicant';

  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:1rem;color:#5b6f94"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(`${API}/messages/${otherUserId}`, { headers: authHeaders() });
    const data = await res.json();
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
    (data.messages || []).forEach(msg => {
      const b = document.createElement('div');
      b.className = 'chat-bubble ' + (msg.sender_id === currentUserId ? 'sent' : 'received');
      b.textContent = msg.content;
      body.appendChild(b);
    });
    body.scrollTop = body.scrollHeight;
  } catch {
    body.innerHTML = '<div style="text-align:center;padding:1rem;color:#5b6f94">Could not load messages.</div>';
  }
}

async function sendMsg() {
  const input = document.getElementById('chatInput');
  const body = document.getElementById('chatBody');
  const text = input?.value.trim();
  if (!text || !companyActiveConv) return;
  input.value = '';

  const b = document.createElement('div');
  b.className = 'chat-bubble sent';
  b.textContent = text;
  body.appendChild(b);
  body.scrollTop = body.scrollHeight;

  try {
    await fetch(`${API}/messages/send`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ receiver_id: companyActiveConv.otherUserId, content: text, receiver_name: companyActiveConv.name }),
    });
  } catch {
    showToast('Message failed to send.', 'error');
  }
}

// Company clicks "Message" on an applicant row
async function messageApplicant(userId, name, email) {
  if (!userId || userId === 'undefined') {
    showToast('Cannot message — applicant has no user ID.', 'error');
    return;
  }
  showPage('messagesPage');
  // Send an opening message or just open conversation
  companyActiveConv = { otherUserId: userId, name };
  const nameEl = document.getElementById('chatName');
  const roleEl = document.getElementById('chatRole');
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = email || 'Applicant';

  // Reload conversation list then open this specific convo
  await loadCompanyConversations();
  // Fetch messages with this user
  const body = document.getElementById('chatBody');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:1rem;color:#5b6f94"><i class="fas fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch(`${API}/messages/${userId}`, { headers: authHeaders() });
    const data = await res.json();
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
    body.innerHTML = '<div class="msg-date-divider"><span>Today</span></div>';
    if (!data.messages?.length) {
      body.innerHTML += '<div style="text-align:center;padding:1rem;color:#5b6f94;font-size:0.85rem">No messages yet. Start the conversation!</div>';
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

function escapeAttr(str) {
  return (str || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// Load messages when navigating to messages page
document.querySelectorAll('.nav-item[data-page="messagesPage"]').forEach(btn => {
  btn.addEventListener('click', loadCompanyConversations);
});

// =====================
// SHORTLIST / REJECT (FR-07)
// =====================
async function shortlistCandidate(id, name) {
  showConfirm(`Shortlist ${name}? They will receive a notification.`, async () => {
    try {
      const res = await fetch(`${API}/applicants/${id}/shortlist`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        showToast(`${name} shortlisted — notification sent!`, 'success');
        const row = document.getElementById(`app-${id}`);
        if (row) {
          const badge = row.querySelector('.status-badge');
          if (badge) { badge.textContent = 'shortlisted'; badge.className = 'status-badge s-shortlisted'; }
        }
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to shortlist.', 'error');
      }
    } catch { showToast('Cannot connect to server.', 'error'); }
  });
}

async function rejectCandidate(id, name) {
  showConfirm(`Reject ${name}? They will receive a notification.`, async () => {
    try {
      const res = await fetch(`${API}/applicants/${id}/reject`, { method: 'POST', headers: authHeaders() });
      if (res.ok) {
        showToast(`${name} rejected — notification sent.`, 'info');
        const row = document.getElementById(`app-${id}`);
        if (row) {
          const badge = row.querySelector('.status-badge');
          if (badge) { badge.textContent = 'rejected'; badge.className = 'status-badge s-rejected'; }
        }
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to reject.', 'error');
      }
    } catch { showToast('Cannot connect to server.', 'error'); }
  });
}
