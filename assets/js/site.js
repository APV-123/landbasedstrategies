/* assets/js/site.js — Land-Based Strategies (shared, refactored) */
(() => {
  /* ------------------------------
     CONFIG / HELPERS
  ------------------------------ */
  const isFile = location.protocol === 'file:';
  const siteFolder = '/landbasedstrategies/'; // local folder root for file:// dev

  const isExternal = (href) => {
    if (!href) return true;
    if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) return true;
    if (/^#/.test(href)) return true;
    try {
      const u = new URL(href, location.href);
      return u.origin !== location.origin;
    } catch { return true; }
  };

  function normalizePathForCompare(p) {
    const noQuery = p.split('?')[0].split('#')[0];
    let norm = ('/' + noQuery.replace(/^\/+/, '')).replace(/\/+$/, '/');
    norm = norm.replace(/\/index\.html$/i, '/');
    return norm || '/';
  }

  // One canonical builder used everywhere
  function buildHref(path = '') {
    const page = String(path).replace(/^\/*/, '').replace(/\/?$/, '/'); // "deal-studio/"
    const tail = page ? page + 'index.html' : 'index.html';

    if (!isFile) {
      // Production: root-relative folder URL ("/", "/deal-studio/", etc.)
      return '/' + page;
    }

    // file:// — compute relative path depth from current page to site root
    const p = location.pathname.replace(/\\/g, '/');
    const at = p.toLowerCase().lastIndexOf(siteFolder);
    if (at === -1) return tail; // best-effort fallback
    const sub = p.slice(at + siteFolder.length);            // e.g. "deal-studio/index.html"
    const depth = Math.max(0, sub.split('/').filter(Boolean).length - 1);
    return '../'.repeat(depth) + tail;
  }

  /* LINK NORMALIZATION */
document.querySelectorAll('a').forEach(a => {
  const dp = a.getAttribute('data-path');

  // Always honor data-path (including empty string)
  if (dp != null) {
    a.href = buildHref(dp);
    return;
  }

  let raw = a.getAttribute('href') || '';

  // Special-case root or empty href on file:// (avoid C:/index.html)
  if (isFile && (raw === '/' || raw === '')) {
    a.href = buildHref('');
    return;
  }

  try {
    const url = new URL(raw, location.href);

    // Root "/" on file:// → local index
    if (isFile && url.origin === location.origin && url.pathname === '/') {
      a.href = buildHref('');
      return;
    }

    // Same-origin, folder-ish (no extension) → normalize to section path
    const sameHost = url.origin === location.origin;
    const looksFolder =
      sameHost &&
      !url.search && !url.hash &&
      !/\.(html?|pdf|png|jpe?g|gif|svg|webp|ico|css|js|json|txt|xml|map)$/i.test(url.pathname) &&
      /(^\/?[\w-]+\/?$)|(^\/$)/.test(url.pathname);

    if (looksFolder) {
      const logical = url.pathname.replace(/^\/+|\/+$/g, ''); // "deal-studio" or ""
      a.href = buildHref(logical);
    }
  } catch { /* ignore */ }
});


  /* ------------------------------
     ACTIVE NAV HIGHLIGHT
  ------------------------------ */
  const current = normalizePathForCompare(location.pathname);
  document.querySelectorAll('#site-nav a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || isExternal(href)) return;
    try {
      const url = new URL(href, location.href);
      const candidate = normalizePathForCompare(url.pathname);
      if (candidate === current) a.setAttribute('aria-current', 'page');
    } catch { /* ignore */ }
  });

  /* ------------------------------
     MOBILE NAV TOGGLE + BEHAVIOR
  ------------------------------ */
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');

  function closeNav() {
    if (!nav || !btn) return;
    nav.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', (e) => {
      const t = e.target.closest('a');
      if (t && !isExternal(t.getAttribute('href'))) closeNav();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ------------------------------
     DARK MODE TOGGLE (persistence)
     (No-FOUC handled in <head>.)
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
  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
  } else {
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const group = el.dataset.staggerGroup;
            if (group) {
              const sibs = document.querySelectorAll('[data-stagger-group="'+group+'"]');
              sibs.forEach((s, i) => setTimeout(() => s.classList.add('in'), i * 24));
            } else {
              el.classList.add('in');
            }
            io.unobserve(el);
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 })
      : null;

    document.querySelectorAll('.reveal').forEach((el) => {
      if (io) io.observe(el); else el.classList.add('in');
    });
  }

  /* ------------------------------
     COUNT-UP NUMBERS
  ------------------------------ */
  function animateNumber(el, to, dur) {
    const from = parseInt((el.textContent || '0').replace(/\D/g,''), 10) || 0;
    const start = performance.now();
    (function step(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  const nio = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const to = parseInt(el.dataset.countTo || '0', 10);
          animateNumber(el, to, 700);
          nio.unobserve(el);
        });
      }, { rootMargin: '0px 0px -25% 0px', threshold: 0.2 })
    : null;

  document.querySelectorAll('[data-count-to]').forEach((n) => {
    if (nio) nio.observe(n); else animateNumber(n, parseInt(n.dataset.countTo || '0', 10), 700);
  });
})();
