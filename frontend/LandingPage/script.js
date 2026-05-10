// =====================
// THEME TOGGLE
// =====================
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('landingThemeBtn');
  if (btn) btn.querySelector('i').className = `fas ${saved === 'light' ? 'fa-sun' : 'fa-moon'}`;
})();

document.getElementById('landingThemeBtn')?.addEventListener('click', function () {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  this.querySelector('i').className = `fas ${next === 'light' ? 'fa-sun' : 'fa-moon'}`;
});

// =====================
// NAV HIDE/SHOW ON SCROLL
// =====================
const nav = document.getElementById('mainNav');
let lastScroll = 0;
if (nav) {
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 100) {
      nav.style.transform = 'translateY(-100%)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    lastScroll = current;
  }, { passive: true });
}

// =====================
// NAV ACTIVE LINK ON SCROLL
// =====================
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 200) {
      current = section.getAttribute('id');
    }
  });
  navAnchors.forEach(a => {
    a.style.color = '';
    if (a.getAttribute('href') === '#' + current) a.style.color = '#ffb574';
  });
}, { passive: true });

// =====================
// SCROLL REVEAL
// =====================
function initScrollReveal() {
  const selectors = [
    '.step-card', '.bento-card', '.testi-card',
    '.section-header', '.logos-row', '.partner-cta-box',
    '.cta-content', '.hero-visual', '.brand-bar'
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i * 0.07) + 's';
    });
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Don't unobserve — keep for repeated scrolls
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', initScrollReveal);

// =====================
// HERO TITLE TYPING EFFECT
// =====================
function initTypingEffect() {
  const em = document.querySelector('.hero-title em');
  if (!em) return;
  const fullText = em.textContent;
  em.textContent = '';
  em.style.borderRight = '2px solid var(--orange)';
  let i = 0;
  function type() {
    if (i < fullText.length) {
      em.textContent += fullText[i++];
      setTimeout(type, 65 + Math.random() * 40);
    } else {
      setTimeout(() => { em.style.borderRight = 'none'; }, 1400);
    }
  }
  setTimeout(type, 950);
}
document.addEventListener('DOMContentLoaded', initTypingEffect);

// =====================
// MOUSE GLOW ON BENTO CARDS
// =====================
document.querySelectorAll('.bento-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
});

// =====================
// STAT COUNTERS (c-stat-n)
// =====================
function animateCounters() {
  const els = document.querySelectorAll('.c-stat-n');
  els.forEach(el => { el.dataset.final = el.textContent; });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const finalText = entry.target.dataset.final;
        const match = finalText.match(/^([\d.]+)(.*)$/);
        if (!match) return;
        const target = parseFloat(match[1]);
        const suffix = match[2];
        const isDecimal = match[1].includes('.');
        const steps = 55;
        let current = 0;
        const timer = setInterval(() => {
          current++;
          const ease = 1 - Math.pow(1 - (current / steps), 3);
          const value = target * ease;
          entry.target.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
          if (current >= steps) {
            entry.target.textContent = finalText;
            clearInterval(timer);
          }
        }, 1600 / steps);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(el => observer.observe(el));
}
document.addEventListener('DOMContentLoaded', animateCounters);
