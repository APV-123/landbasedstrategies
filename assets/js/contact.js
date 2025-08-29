(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const API_BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:8000'
      : 'https://api.landbasedstrategies.com';

  const msg = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');

  function showMessage(text, ok = true) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.color = ok ? 'var(--brand)' : '#b00020';
    msg.setAttribute('role', 'status');
  }

  function collectUtm() {
    const p = new URLSearchParams(location.search);
    const utm = {
      utm_source:   p.get('utm_source')   || undefined,
      utm_medium:   p.get('utm_medium')   || undefined,
      utm_campaign: p.get('utm_campaign') || undefined,
      utm_term:     p.get('utm_term')     || undefined,
      utm_content:  p.get('utm_content')  || undefined,
      ref: document.referrer || undefined,
      page: location.pathname
    };
    return Object.fromEntries(Object.entries(utm).filter(([,v]) => v != null));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear any previous banner
    if (msg) { msg.style.display = 'none'; msg.textContent = ''; }

    // Basic client validation
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showMessage('Please complete your name, email, and a brief message.', false);
      (!name ? form.name : (!email ? form.email : form.message)).focus();
      return;
    }
    // email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Please enter a valid email address.', false);
      form.email.focus();
      return;
    }

    // Honeypot
    if (form.homepage && form.homepage.value) {
      showMessage('Submission blocked.', false);
      return;
    }

    // Build payload with field names that match your form/back end
    const payload = {
      name,
      email,
      company: (form.company?.value || '').trim() || null,
      role: (form.role?.value || '').trim() || null,
      topic: form.topic?.value || 'General question',
      target_size: (form.target_size?.value || '').trim() || null,
      message,
      opt_in: !!form.opt_in?.checked,
      utm: collectUtm()
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }

    // Add a timeout so failures don’t hang silently
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort('timeout'), 20000);

    try {
      const res = await fetch(`${API_BASE}/api/web-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal
      });

      if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          detail = data.detail || JSON.stringify(data);
        } catch {}
        throw new Error(detail);
      }

      form.reset();
      showMessage('Thanks—message received. I’ll get back to you shortly.', true);
    } catch (err) {
      const reason = (err && err.name === 'AbortError') ? 'Request timed out.' : (err.message || 'Request failed.');
      showMessage(`${reason} Please email alex@landbasedstrategies.com.`, false);
    } finally {
      clearTimeout(timer);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  });
})();
