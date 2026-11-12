/* ÉLAN booking: 4-step form, validation, live summary, honest submit handling.
   INTEGRATION POINTS (search for "INTEGRATION"):
   1. form[data-endpoint]  -> Formspree / Netlify Forms URL
   2. loadSlots()          -> replace sample slots with your Calendar API (Google Calendar, Calendly, etc.)
   3. deposit placeholder  -> Stripe / PayPal checkout, after the request is stored */
(() => {
  'use strict';
  const form = document.getElementById('booking-form');
  if (!form) return;
  const steps = [...form.querySelectorAll('.step')];
  const stepperItems = [...document.querySelectorAll('.stepper li')];
  const status = document.getElementById('book-status');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^[+()\-.\s\d]{7,20}$/;
  let current = 0;

  const f = (n) => form.elements[n];
  const val = (n) => (f(n) ? f(n).value.trim() : '');

  /* ---------- helpers ---------- */
  const fail = (field, msg) => {
    field.classList.add('is-invalid'); field.setAttribute('aria-invalid', 'true');
    const host = field.closest('.field');
    let m = host.querySelector('.invalid-msg');
    if (!m) { m = document.createElement('div'); m.className = 'invalid-msg'; m.id = (field.id || field.name) + '-err'; host.appendChild(m); }
    m.textContent = msg; field.setAttribute('aria-describedby', m.id);
  };
  const clear = (field) => {
    field.classList.remove('is-invalid'); field.removeAttribute('aria-invalid');
    const m = field.closest('.field')?.querySelector('.invalid-msg'); if (m) m.remove();
  };
  const check = (field) => {
    clear(field);
    if (field.required && !field.value.trim()) { fail(field, 'This field is required.'); return false; }
    if (field.type === 'email' && field.value && !emailRe.test(field.value)) { fail(field, 'Enter a valid email address.'); return false; }
    if (field.type === 'tel' && field.value && !phoneRe.test(field.value)) { fail(field, 'Enter a valid phone number.'); return false; }
    if (field.type === 'date' && field.value && field.min && field.value < field.min) { fail(field, 'Choose a date from today onward.'); return false; }
    return true;
  };

  /* ---------- date + time ---------- */
  const date = f('date');
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  date.min = today.toISOString().slice(0, 10);
  const slotsHost = document.getElementById('slots');
  const slotsMsg = document.getElementById('slots-msg');
  const HOURS = { 0: [11, 17], 1: null, 2: [10, 20], 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [9, 18] };
  const fmt = (h) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
  /* INTEGRATION: replace with a call to your calendar/availability API.
     These are sample slots only and do not reflect real availability. */
  const loadSlots = () => {
    slotsHost.innerHTML = '';
    if (!date.value) { slotsMsg.textContent = 'Choose a date to see times.'; return; }
    const d = new Date(date.value + 'T12:00:00');
    const hrs = HOURS[d.getDay()];
    if (!hrs) { slotsMsg.textContent = 'We are closed on Mondays. Please choose another date.'; return; }
    slotsMsg.textContent = 'Sample times shown. Your request is confirmed by email.';
    for (let h = hrs[0]; h < hrs[1] - 1; h++) {
      const l = document.createElement('label'); l.className = 'slot';
      l.innerHTML = `<input type="radio" name="time" value="${fmt(h)}"><span>${fmt(h)}</span>`;
      slotsHost.appendChild(l);
    }
  };
  date.addEventListener('change', () => { loadSlots(); check(date); summary(); });

  /* ---------- summary ---------- */
  const out = (id, v) => { document.getElementById(id).textContent = v || ''; };
  const pretty = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  function summary() {
    out('s-service', f('service').selectedOptions[0]?.value ? f('service').value : '');
    out('s-stylist', val('stylist'));
    out('s-date', pretty(val('date')));
    out('s-time', form.querySelector('input[name="time"]:checked')?.value || '');
    out('s-name', val('name'));
    out('s-contact', [val('email'), val('phone')].filter(Boolean).join(' · '));
  }
  form.addEventListener('input', summary);
  form.addEventListener('change', summary);

  /* ---------- steps ---------- */
  const validateStep = (n) => {
    let ok = true;
    steps[n].querySelectorAll('input:not([type=radio]),select,textarea').forEach((x) => { if (!check(x)) ok = false; });
    if (n === 1) {
      const timeOk = !!form.querySelector('input[name="time"]:checked');
      const tm = document.getElementById('time-err');
      tm.textContent = timeOk ? '' : 'Choose an available time.';
      if (!timeOk) ok = false;
    }
    if (!ok) (steps[n].querySelector('.is-invalid') || document.getElementById('slots').querySelector('input'))?.focus();
    return ok;
  };
  const go = (n) => {
    current = n;
    steps.forEach((s, i) => { s.hidden = i !== n; });
    stepperItems.forEach((li, i) => { li.classList.toggle('is-active', i === n); li.classList.toggle('is-done', i < n); li.toggleAttribute('aria-current', i === n); });
    steps[n].querySelector('legend').setAttribute('tabindex', '-1');
    steps[n].querySelector('legend').focus({ preventScroll: true });
    steps[n].scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    summary();
  };
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) { if (validateStep(current)) go(current + 1); }
    if (e.target.closest('[data-prev]')) go(current - 1);
  });
  form.addEventListener('input', (e) => { if (e.target.matches('input:not([type=radio]),select,textarea')) check(e.target); });

  /* ---------- submit ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(current)) return;
    if (!f('consent').checked) { fail(f('consent'), 'Please confirm before sending.'); f('consent').focus(); return; }
    const endpoint = form.dataset.endpoint; /* INTEGRATION: set data-endpoint on the <form> */
    if (!endpoint) {
      status.className = 'notice'; status.hidden = false;
      status.textContent = 'Your details look complete, but this form is not connected to a booking service yet, so nothing was sent. Add a Formspree or Netlify endpoint (see documentation).';
      return;
    }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); })
      .then(() => {
        /* INTEGRATION: optional Stripe / PayPal deposit step goes here, after the request is stored. */
        status.className = 'notice'; status.hidden = false;
        status.textContent = 'Request sent. We will email you to confirm your appointment. It is not confirmed until you hear from us.';
        form.querySelectorAll('.step').forEach((s) => { s.hidden = true; });
      })
      .catch(() => {
        btn.disabled = false; status.className = 'notice'; status.hidden = false;
        status.textContent = 'We could not send your request. Please try again or call +1 555 010 2040.';
      });
  });

  /* ---------- prefill from ?service=&date= (home page quick form) ---------- */
  const q = new URLSearchParams(location.search);
  const svc = q.get('service');
  if (svc) [...f('service').options].forEach((o) => { if (o.value === svc) f('service').value = svc; });
  if (q.get('date') && q.get('date') >= date.min) { date.value = q.get('date'); loadSlots(); }
  go(0);
})();
