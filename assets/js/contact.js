(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Auto-pick API base for local vs prod
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

  // Collect common UTM params if present
  function collectUtm() {
    const p = new URLSearchParams(location.search);
    const utm = {
      utm_source:  p.get('utm_source')  || undefined,
      utm_medium:  p.get('utm_medium')  || undefined,
      utm_campaign:p.get('utm_campaign')|| undefined,
      utm_term:    p.get('utm_term')    || undefined,
      utm_content: p.get('utm_content') || undefined,
      ref: document.referrer || undefined,
      page: location.pathname
    };
    // remove undefined keys
    return Object.fromEntries(Object.entries(utm).filter(([,v]) => v != null));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic client validation
    if (!form.email.value || !form.name.value || !form.message.value) {
      showMessage('Please complete the required fields.', false);
      return;
    }

    // Honeypot check
    if (form.homepage && form.homepage.value) {
      showMessage('Submission blocked.', false);
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: (form.company?.value || '').trim() || null,
      role: (form.role?.value || '').trim() || null,
      topic: form.topic?.value || 'general',
      budget: (form.budget?.value || '').trim() || null,
      message: form.message.value.trim(),
      newsletter: !!form.newsletter?.checked,
      utm: collectUtm()
    };

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');

    try {
      const res = await fetch(`${API_BASE}/api/web-leads`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        // credentials not needed for public create
      });

      if (!res.ok) {
        // Try to surface FastAPI error detail if present
        let detail = 'Something went wrong.';
        try {
          const data = await res.json();
          detail = data.detail || JSON.stringify(data);
        } catch {}
        throw new Error(detail);
      }

      form.reset();
      showMessage('Thanks—message received. I’ll get back to you shortly.', true);
    } catch (err) {
      showMessage(err.message || 'Request failed. Please email alex@landbasedstrategies.com.', false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
    }
  });
})();