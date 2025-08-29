/* assets/js/site.js — minimal, no link rewriting */
(() => {
  /* ------------------------------
     ACTIVE NAV HIGHLIGHT
  ------------------------------ */
  function normalizePath(p){
    const noQuery = p.split('?')[0].split('#')[0];
    let norm = ('/' + noQuery.replace(/^\/+/, '')).replace(/\/+$/, '/');
    norm = norm.replace(/\/index\.html$/i, '/');
    return norm || '/';
  }
  const current = normalizePath(location.pathname);
  document.querySelectorAll('#site-nav a[href]').forEach(a => {
    try {
      const url = new URL(a.getAttribute('href'), location.href);
      if (normalizePath(url.pathname) === current) a.setAttribute('aria-current', 'page');
    } catch {}
  });

  /* ------------------------------
     MOBILE NAV TOGGLE
  ------------------------------ */
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  function closeNav(){
    if (!nav || !btn) return;
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', e => {
      const t = e.target.closest('a');
      if (t) closeNav();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  }

  /* ------------------------------
     DARK MODE TOGGLE (persist)
  ------------------------------ */
  const THEME_KEY = 'lbs-theme';
  const html = document.documentElement;
  const modeToggle = document.getElementById('modeToggle');
  if (modeToggle) {
    modeToggle.checked = html.classList.contains('dark');
    modeToggle.addEventListener('change', () => {
      const on = modeToggle.checked;
      html.classList.toggle('dark', on);
      try { localStorage.setItem(THEME_KEY, on ? 'dark' : 'light'); } catch {}
    });
  }

  /* ------------------------------
     REVEAL ON SCROLL
  ------------------------------ */
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const group = el.dataset.staggerGroup;
        if (group) {
          const sibs = document.querySelectorAll(`[data-stagger-group="${group}"]`);
          sibs.forEach((s, i) => setTimeout(() => s.classList.add('in'), i * 24));
        } else {
          el.classList.add('in');
        }
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ------------------------------
     COUNT-UP NUMBERS
  ------------------------------ */
  function animateNumber(el, to, dur){
    const from = parseInt((el.textContent || '0').replace(/\D/g,''),10) || 0;
    const start = performance.now();
    (function step(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  if ('IntersectionObserver' in window) {
    const nio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const to = parseInt(el.dataset.countTo || '0', 10);
        animateNumber(el, to, 700);
        nio.unobserve(el);
      });
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.2 });
    document.querySelectorAll('[data-count-to]').forEach(n => nio.observe(n));
  } else {
    document.querySelectorAll('[data-count-to]').forEach(n => animateNumber(n, parseInt(n.dataset.countTo||'0',10), 700));
  }
})();
