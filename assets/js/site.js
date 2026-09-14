(() => {
  const button = document.getElementById('modeToggle');
  if (!button) return;
  const sync = () => button.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
  sync();
  button.addEventListener('click', () => { const dark = document.documentElement.classList.toggle('dark'); try { localStorage.setItem('lbs-theme', dark ? 'dark' : 'light'); } catch {} sync(); });
})();
