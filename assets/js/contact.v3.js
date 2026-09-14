(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  // Keep the deployed API rewrite and the existing local FastAPI target.
  const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8000' : '';
  const msg = document.getElementById('formMsg');
  const button = document.getElementById('submitBtn');
  let pending = false;
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
    const payload = {name:value('name'),email:value('email'),company:value('company') || null,role:null,topic:topic.value || 'General question',target_size:null,message:'Inquiry: ' + topic.selectedOptions[0].textContent + '\n\n' + value('message'),opt_in:false};
    pending = true; button.disabled = true; button.setAttribute('aria-busy','true'); msg.hidden = true;
    event('contact_form_attempt',{topic:payload.topic,target_size:'',opt_in:'false'});
    try {
      const response = await fetch(API_BASE + '/api/web-leads', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if (!response.ok) { event('contact_form_error',{http_status:String(response.status)}); throw new Error('Request failed'); }
      form.reset(); show('Thank you. Your inquiry has been received.', true);
      event('contact_form_submit',{topic:payload.topic,target_size:'',opt_in:'false'});
    } catch { show('Your inquiry could not be sent. Please try again.', false); }
    finally { pending = false; button.disabled = false; button.removeAttribute('aria-busy'); }
  });
})();
