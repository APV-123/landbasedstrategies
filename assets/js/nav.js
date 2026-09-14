(() => {
  const nav = document.getElementById('site-nav');
  const button = document.querySelector('.nav-toggle');
  if (!nav || !button) return;
  const mobile = matchMedia('(max-width: 1100px)');
  const close = () => { nav.classList.remove('is-open'); button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('is-open', open); button.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') { close(); button.focus(); } });
  document.addEventListener('click', e => { if (!nav.contains(e.target) && !button.contains(e.target)) close(); });
  nav.addEventListener('click', e => { if(e.target.closest('a')) close(); });
  mobile.addEventListener('change', close);
  for (const a of nav.querySelectorAll('a')) { const url = new URL(a.href); if (location.pathname === url.pathname) a.setAttribute('aria-current', 'page'); else if (url.pathname === '/track-record/' && location.pathname.startsWith(url.pathname)) a.setAttribute('aria-current', 'location'); }
})();
