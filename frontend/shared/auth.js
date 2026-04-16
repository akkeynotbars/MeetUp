// =============================================
// MEETUP — SHARED AUTH SCRIPT
// Used by: login.html, signup.html
// =============================================

/**
 * Spawn floating orange particles in a container.
 * @param {string} containerId - DOM id of .particles container
 * @param {number} count       - how many particles to spawn (default 12)
 */
function spawnParticles(containerId, count) {
  count = count || 12;
  var pc = document.getElementById(containerId);
  if (!pc) return;
  for (var i = 0; i < count; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (Math.random() * 100) + '%';
    p.style.top = (60 + Math.random() * 40) + '%';
    p.style.animationDuration = (5 + Math.random() * 7) + 's';
    p.style.animationDelay = (Math.random() * 5) + 's';
    pc.appendChild(p);
  }
}

/**
 * Show/hide password input. Pass the button element and the input id.
 */
function togglePasswordVisibility(btnEl, inputId) {
  var pass = document.getElementById(inputId);
  if (!pass) return;
  if (pass.type === 'password') {
    pass.type = 'text';
    btnEl.textContent = 'Hide';
  } else {
    pass.type = 'password';
    btnEl.textContent = 'Show';
  }
}
