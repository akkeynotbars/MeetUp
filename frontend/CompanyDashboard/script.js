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
});

// =====================
// API HELPERS
// =====================
const API = 'http://localhost:3000/api';

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
    if (!res.ok) { alert(data.error || 'Failed to post job'); return; }
    alert('Job posted successfully!');
    e.target.reset();
    loadMyJobs();
    showPage('jobPostingsPage');
  } catch {
    alert('Cannot connect to server.');
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
  if (!confirm('Delete this job posting?')) return;
  const res = await fetch(`${API}/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (res.ok) { alert('Job deleted.'); loadMyJobs(); }
  else alert('Failed to delete job.');
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
    if (this.dataset.page === 'applicantsPage') loadApplicants();
    if (this.dataset.page === 'jobPostingsPage') loadMyJobs();
  });
});

// Profile & Notification icon buttons
document.getElementById('profileBtn').addEventListener('click', function () {
  showPage('profilePage');
  // Remove active from sidebar since this isn't a sidebar page
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
// MESSAGES — select conversation
// =====================
function selectMsg(el, name, role) {
  document.querySelectorAll('.msg-item').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('chatName').textContent = name;
  document.getElementById('chatRole').textContent = role;
  // Clear unread badge on the clicked item
  const badge = el.querySelector('.msg-unread');
  if (badge) badge.remove();
}

// =====================
// MESSAGES — send message
// =====================
function sendMsg() {
  const input = document.getElementById('chatInput');
  const body = document.getElementById('chatBody');
  const text = input.value.trim();
  if (!text) return;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble sent';
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
  input.value = '';
}

// =====================
// SHORTLIST / REJECT (FR-07)
// =====================
async function shortlistCandidate(id, name) {
  if (!confirm(`Shortlist ${name}? The candidate will be notified.`)) return;
  try {
    const res = await fetch(`${API}/applicants/${id}/shortlist`, { method: 'POST', headers: authHeaders() });
    if (res.ok) {
      alert(`${name} has been shortlisted.`);
      const row = document.getElementById(`app-${id}`);
      if (row) row.querySelector('[style*="background:rgba(91"]').textContent = 'shortlisted';
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to shortlist.');
    }
  } catch { alert('Cannot connect to server.'); }
}

async function rejectCandidate(id, name) {
  if (!confirm(`Reject ${name}?`)) return;
  try {
    const res = await fetch(`${API}/applicants/${id}/reject`, { method: 'POST', headers: authHeaders() });
    if (res.ok) {
      alert(`${name} has been rejected.`);
      const row = document.getElementById(`app-${id}`);
      if (row) row.querySelector('[style*="background:rgba(91"]').textContent = 'rejected';
    } else {
      const d = await res.json();
      alert(d.error || 'Failed to reject.');
    }
  } catch { alert('Cannot connect to server.'); }
}
