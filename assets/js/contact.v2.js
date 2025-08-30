(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Use relative path in production; local hits FastAPI directly
  const API_BASE =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:8000'
      : '';

  const msg = document.getElementById('formMsg');
  const submitBtn = document.getElementById('submitBtn');

  function showMessage(text, ok = true) {
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = 'block';
    msg.style.color = ok ? 'var(--brand)' : '#b00020';
    msg.setAttribute('role', 'status');
  }

  // Push a GTM event (safe for PII)
  function pushDL(event, extra = {}) {
    if (!window.dataLayer) return;
    window.dataLayer.push({
      event,
      form_id: 'contactForm',
      form_name: 'Contact Page',
      form_location: window.location.pathname,
      ...extra
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showMessage('Please complete your name, email, and a brief message.', false);
      return;
    }

    // Payload sent to backend (PII ok here)
    const payload = {
      name,
      email,
      company: (form.company?.value || '').trim() || null,
      role: (form.role?.value || '').trim() || null,
      topic: form.topic?.value || 'General question',
      target_size: (form.target_size?.value || '').trim() || null,
      message,
      opt_in: !!form.opt_in?.checked
    };

    // Analytics (attempt) — do NOT include name/email/message
    pushDL('contact_form_attempt', {
      topic: payload.topic,
      target_size: payload.target_size || '',
      opt_in: payload.opt_in ? 'true' : 'false'
    });

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
    }

    try {
      const res = await fetch(`${API_BASE}/api/web-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Surface backend error in GA (status only)
        pushDL('contact_form_error', { http_status: String(res.status) });
        throw new Error(`Request failed (${res.status})`);
      }

      form.reset();
      showMessage('Thanks—message received. I’ll get back to you shortly.', true);

      // Analytics (success)
      pushDL('contact_form_submit', {
        topic: payload.topic,
        target_size: payload.target_size || '',
        opt_in: payload.opt_in ? 'true' : 'false'
      });
    } catch (err) {
      showMessage(err.message || 'Request failed. Please email alex@landbasedstrategies.com.', false);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
      }
    }
  });
})();
