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
function shortlistCandidate(name) {
  if (confirm('Shortlist ' + name + '? The candidate will be notified.')) {
    alert(name + ' has been moved to Shortlisted. Notification sent: "You have been shortlisted by Acme Corp."');
  }
}

function rejectCandidate(name) {
  const reason = prompt('Reject ' + name + '? Enter a reason (optional):');
  if (reason !== null) {
    alert(name + ' has been moved to Rejected. Notification sent to the candidate.');
  }
}

function viewApplicantDetail(name) {
  alert('Viewing AI-generated summary for ' + name + ':\n\n' +
    '--- AI Resume Summary (FR-04) ---\n' +
    'Name: ' + name + '\n' +
    'Skills: React, JavaScript, Node.js\n' +
    'Experience: 3 years in frontend development\n' +
    'Education: BSc Computer Science\n' +
    'Key Strengths: Strong portfolio, clean code practices\n' +
    'AI Score: 92/100\n' +
    'Red Flags: None detected');
}
