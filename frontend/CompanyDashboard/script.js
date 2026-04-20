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
  const body = {
    title: document.getElementById('jobTitle')?.value,
    description: document.getElementById('jobDesc')?.value,
    requirements: document.getElementById('jobReqs')?.value,
    location: document.getElementById('jobLocation')?.value,
    salary_range: document.getElementById('jobSalary')?.value,
    job_type: document.getElementById('jobType')?.value,
  };

  if (btn) { btn.textContent = 'Posting...'; btn.disabled = true; }

  try {
    const res = await fetch(`${API}/jobs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Failed to post job'); return; }
    alert('Job posted successfully!');
    e.target.reset();
    loadMyJobs();
  } catch {
    alert('Cannot connect to server.');
  } finally {
    if (btn) { btn.textContent = 'Post Job'; btn.disabled = false; }
  }
}

async function loadMyJobs() {
  try {
    const res = await fetch(`${API}/jobs/my`, { headers: authHeaders() });
    const data = await res.json();
    const container = document.getElementById('jobListings');
    if (!container || !data.jobs) return;
    container.innerHTML = data.jobs.length === 0
      ? '<p style="color:#5b6f94">No job postings yet.</p>'
      : data.jobs.map(j => `
          <div class="job-card" style="background:#1a2236;border-radius:12px;padding:1rem 1.2rem;margin-bottom:0.8rem;border:1px solid rgba(255,255,255,0.06)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <strong style="color:#e2e8f0">${j.title}</strong>
                <span style="margin-left:0.6rem;font-size:0.75rem;color:#27c93f;background:rgba(39,201,63,0.1);padding:2px 8px;border-radius:20px">${j.status}</span>
              </div>
              <button onclick="deleteJob('${j.id}')" style="background:none;border:1px solid rgba(255,80,80,0.3);color:#ff5050;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:0.8rem">Delete</button>
            </div>
            <p style="color:#5b6f94;font-size:0.85rem;margin:0.4rem 0 0">${j.location || 'Remote'} · ${j.job_type || 'Full-time'} · ${j.salary_range || 'Salary TBD'}</p>
          </div>`).join('');
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
  if (!container || !jobId) return;
  container.innerHTML = '<p style="color:#5b6f94">Loading applicants...</p>';
  try {
    const res = await fetch(`${API}/applicants/${jobId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) { container.innerHTML = `<p style="color:#ff5050">${data.error}</p>`; return; }
    if (!data.applicants.length) { container.innerHTML = '<p style="color:#5b6f94">No applicants yet.</p>'; return; }
    container.innerHTML = data.applicants.map(a => `
      <div class="applicant-row" id="app-${a.id}" style="background:#1a2236;border-radius:12px;padding:1rem 1.2rem;margin-bottom:0.8rem;border:1px solid rgba(255,255,255,0.06)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong style="color:#e2e8f0">${a.Users?.name || 'Unknown'}</strong>
            <span style="margin-left:0.5rem;color:#5b6f94;font-size:0.85rem">${a.Users?.email || ''}</span>
            ${a.CVs?.ai_score != null ? `<span style="margin-left:0.8rem;color:#f7944d;font-weight:600">Score: ${a.CVs.ai_score}/100</span>` : ''}
          </div>
          <span style="font-size:0.8rem;padding:3px 10px;border-radius:20px;background:rgba(91,111,148,0.15);color:#5b6f94">${a.status}</span>
        </div>
        ${a.CVs?.ai_summary ? `<p style="color:#8a9bbf;font-size:0.85rem;margin:0.5rem 0 0">${a.CVs.ai_summary}</p>` : ''}
        ${a.CVs?.red_flags?.length ? `<p style="color:#ff5050;font-size:0.8rem;margin:0.3rem 0 0">⚠ ${a.CVs.red_flags.join(' · ')}</p>` : ''}
        <div style="margin-top:0.8rem;display:flex;gap:0.5rem">
          <button onclick="shortlistCandidate('${a.id}', '${a.Users?.name}')" style="background:rgba(39,201,63,0.1);border:1px solid rgba(39,201,63,0.3);color:#27c93f;border-radius:8px;padding:5px 14px;cursor:pointer;font-size:0.82rem">Shortlist</button>
          <button onclick="rejectCandidate('${a.id}', '${a.Users?.name}')" style="background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);color:#ff5050;border-radius:8px;padding:5px 14px;cursor:pointer;font-size:0.82rem">Reject</button>
        </div>
      </div>`).join('');
  } catch {
    container.innerHTML = '<p style="color:#5b6f94">Could not load applicants — backend offline.</p>';
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
