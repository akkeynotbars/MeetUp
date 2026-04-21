// =====================
// THEME TOGGLE
// =====================
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('landingThemeBtn');
  if (btn) btn.querySelector('i').className = `fas ${saved === 'light' ? 'fa-sun' : 'fa-moon'}`;
})();

document.getElementById('landingThemeBtn')?.addEventListener('click', function() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  this.querySelector('i').className = `fas ${next === 'light' ? 'fa-sun' : 'fa-moon'}`;
});

// =====================
// FLOATING PARTICLES
// =====================
const particleContainer = document.getElementById('particles');
if (particleContainer) {
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = (20 + Math.random() * 60) + '%';
    p.style.bottom = (Math.random() * 40) + '%';
    p.style.animationDuration = (4 + Math.random() * 6) + 's';
    p.style.animationDelay = (Math.random() * 6) + 's';
    p.style.opacity = 0;
    particleContainer.appendChild(p);
  }
}

// =====================
// ORBIT ICON CLICK → POPUP
// =====================
let activeIcon = null;
function showIconInfo(el) {
  const popup = document.getElementById('iconPopup');
  const title = el.dataset.title;
  const desc = el.dataset.desc;

  // If clicking the same icon, close it
  if (activeIcon === el) {
    popup.classList.remove('visible');
    el.classList.remove('active');
    activeIcon = null;
    // Resume orbit spin
    document.querySelector('.orbit').style.animationPlayState = 'running';
    return;
  }

  // Remove previous active
  if (activeIcon) activeIcon.classList.remove('active');

  // Pause orbit so user can read
  document.querySelector('.orbit').style.animationPlayState = 'paused';

  // Show popup
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupDesc').textContent = desc;
  el.classList.add('active');
  popup.classList.add('visible');
  activeIcon = el;
}

// Close popup when clicking outside
document.addEventListener('click', function(e) {
  if (activeIcon && !e.target.closest('.orbit-icon') && !e.target.closest('.icon-popup')) {
    document.getElementById('iconPopup').classList.remove('visible');
    activeIcon.classList.remove('active');
    activeIcon = null;
    document.querySelector('.orbit').style.animationPlayState = 'running';
  }
});

// =====================
// Q&A CARD CYCLE
// =====================
const qaCards = document.querySelectorAll('.qa-card');
let activeCard = 0;
function cycleCards() {
  qaCards.forEach(c => c.style.borderColor = 'rgba(255,255,255,0.06)');
  if (qaCards[activeCard]) {
    qaCards[activeCard].style.borderColor = 'rgba(247,148,77,0.4)';
  }
  activeCard = (activeCard + 1) % qaCards.length;
}
if (qaCards.length) {
  cycleCards();
  setInterval(cycleCards, 2200);
}

// =====================
// MOUSE GLOW ON FEATURE CARDS
// =====================
document.querySelectorAll('.feat-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

// =====================
// SCROLL REVEAL ANIMATION
// =====================
function initScrollReveal() {
  // Add reveal class to elements
  const selectors = [
    '.intro-visual', '.intro-content',
    '.features-header', '.feat-card',
    '.partners-header', '.logos-row', '.partner-cta-box',
    '.stat-cell'
  ];

  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i * 0.1) + 's';
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveal);

// =====================
// NAV ACTIVE LINK ON SCROLL
// =====================
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 200;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });
  navAnchors.forEach(a => {
    a.style.color = '';
    if (a.getAttribute('href') === '#' + current) {
      a.style.color = '#ffb574';
    }
  });
});

// =====================
// SMOOTH NAV HIDE/SHOW ON SCROLL
// =====================
let lastScroll = 0;
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  const current = window.scrollY;
  if (current > lastScroll && current > 100) {
    nav.style.transform = 'translateY(-100%)';
  } else {
    nav.style.transform = 'translateY(0)';
  }
  lastScroll = current;
}, { passive: true });
nav.style.transition = 'transform 0.3s ease';

// =====================
// ANIMATED STAT COUNTERS
// =====================
function animateCounters() {
  const statNums = document.querySelectorAll('.stat-num');

  statNums.forEach(el => {
    el.dataset.final = el.textContent;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const finalText = entry.target.dataset.final;
        const match = finalText.match(/^([\d.]+)(.*)$/);
        if (!match) return;
        const target = parseFloat(match[1]);
        const suffix = match[2]; // e.g. "%", "K+", "x"
        const isDecimal = match[1].includes('.');
        const duration = 1800;
        const steps = 60;
        const stepTime = duration / steps;
        let current = 0;
        entry.target.textContent = '0' + suffix;
        const timer = setInterval(() => {
          current++;
          const ease = 1 - Math.pow(1 - (current / steps), 3);
          const value = target * ease;
          entry.target.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
          if (current >= steps) {
            entry.target.textContent = finalText;
            clearInterval(timer);
          }
        }, stepTime);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', animateCounters);

// =====================
// HERO TITLE TYPING EFFECT
// =====================
function initTypingEffect() {
  const title = document.querySelector('.hero-title');
  if (!title) return;
  const em = title.querySelector('em');
  if (!em) return;
  const fullText = em.textContent;
  em.textContent = '';
  em.style.borderRight = '2px solid var(--orange)';

  let charIndex = 0;
  function typeChar() {
    if (charIndex < fullText.length) {
      em.textContent += fullText[charIndex];
      charIndex++;
      setTimeout(typeChar, 80 + Math.random() * 40);
    } else {
      // Blink cursor then remove
      setTimeout(() => { em.style.borderRight = 'none'; }, 1500);
    }
  }
  // Start after fadeUp animation completes
  setTimeout(typeChar, 900);
}
document.addEventListener('DOMContentLoaded', initTypingEffect);

// =====================
// TILT EFFECT ON FEATURE CARDS
// =====================
document.querySelectorAll('.feat-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-6px) perspective(600px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});
