(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const msg = document.getElementById('formMsg');
  const button = document.getElementById('submitBtn');
  let pending = false;
  let lastPayload = '';
  let submissionId;
  const show = (text, ok) => { msg.textContent = text; msg.hidden = false; msg.className = ok ? 'form-success' : 'form-error'; msg.focus(); };
  const event = (name, extra) => { if (window.dataLayer) window.dataLayer.push({event:name,form_id:'contactForm',form_name:'Contact Page',form_location:location.pathname,...extra}); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (pending) return;
    const value = name => (form.elements.namedItem(name)?.value || '').trim();
    if (value('homepage')) return;
    if (!value('name') || !value('email') || !value('message') || !form.reportValidity()) { show('Please complete your name, email, and a brief message.', false); return; }
    // Preserve established backend keys and topic values; new display labels remain in the message context.
    const topic = form.elements.namedItem('topic');
    const payload = {name:value('name'),email:value('email'),company:value('company') || null,role:null,topic:topic.value || 'General question',target_size:null,message:'Inquiry: ' + topic.selectedOptions[0].textContent + '\n\n' + value('message'),opt_in:false,homepage:value('homepage')};
    const serialized = JSON.stringify(payload);
    if (serialized !== lastPayload) { submissionId = crypto.randomUUID(); lastPayload = serialized; }
    payload.submission_id = submissionId;
    pending = true; button.disabled = true; button.setAttribute('aria-busy','true'); msg.hidden = true;
    event('contact_form_attempt',{topic:payload.topic,target_size:'',opt_in:'false'});
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('/api/web-leads', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if (!response.ok) { event('contact_form_error',{http_status:String(response.status)}); throw new Error('Request failed'); }
      form.reset(); lastPayload = ''; submissionId = undefined; show('Thank you. Your inquiry has been received.', true);
      event('contact_form_submit',{topic:payload.topic,target_size:'',opt_in:'false'});
    } catch { show('Your inquiry could not be sent. Please try again.', false); }
    finally { clearTimeout(timer); pending = false; button.disabled = false; button.removeAttribute('aria-busy'); }
  });
})();
