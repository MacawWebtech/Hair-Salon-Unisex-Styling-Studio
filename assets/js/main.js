/* ÉLAN Hair Studio – main.js (vanilla ES6+). Shared by every page. */
(() => {
  'use strict';
  const THEME_KEY = 'elan-salon-theme';
  const DIR_KEY = 'elan-salon-dir';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 767.98px)').matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } }
  };

  /* Theme: saved choice > system preference */
  const systemTheme = () => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const applyTheme = (t) => {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(t === 'light'));
      b.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      const i = b.querySelector('i');
      if (i) i.className = t === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
    });
  };
  applyTheme(store.get(THEME_KEY) || systemTheme());
  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (!store.get(THEME_KEY)) applyTheme(systemTheme());
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-theme-toggle]');
    if (!t) return;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    store.set(THEME_KEY, next); applyTheme(next);
  });

  /* RTL */
  const applyDir = (d) => {
    root.setAttribute('dir', d);
    document.querySelectorAll('[data-rtl-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(d === 'rtl')));
  };
  applyDir(store.get(DIR_KEY) || 'ltr');
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-rtl-toggle]')) return;
    const next = root.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
    store.set(DIR_KEY, next); applyDir(next);
  });

  /* Hide broken images so the .media tone shows until real photos are added */
  document.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);

  document.addEventListener('DOMContentLoaded', () => {
    /* Preloader */
    const pre = document.querySelector('.preloader');
    const hidePre = () => pre && pre.classList.add('done');
    window.addEventListener('load', () => setTimeout(hidePre, reduceMotion ? 0 : 400));
    setTimeout(hidePre, 3500); // failsafe

    /* Sticky header turns solid after scroll; back-to-top */
    const header = document.querySelector('.site-header');
    const toTop = document.querySelector('.to-top');
    const announce = document.querySelector('.announce');
    // pages without a photo banner under the header (e.g. 404) keep a solid header
    const overImage = !!document.querySelector('main > .hero:first-child, main > .page-banner:first-child');
    const onScroll = () => {
      const y = window.scrollY;
      // turn solid once the announcement bar has scrolled away and the header is pinned
      const limit = announce ? Math.max(announce.offsetHeight - 1, 0) : 0;
      header && header.classList.toggle('is-solid', !overImage || y > limit);
      toTop && toTop.classList.toggle('show', y > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    toTop && toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    /* Header stays solid when the mobile menu is open */
    const menu = document.getElementById('mainNav');
    if (menu && header) {
      menu.addEventListener('show.bs.collapse', () => header.classList.add('is-solid'));
      menu.addEventListener('hidden.bs.collapse', onScroll);
    }

    /* Reveal on scroll */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      reveals.forEach((el) => io.observe(el));
    } else reveals.forEach((el) => el.classList.add('in'));

    /* Subtle parallax (desktop only) */
    const px = document.querySelectorAll('[data-parallax]');
    if (px.length && !reduceMotion && !isMobile) {
      let tick = false;
      window.addEventListener('scroll', () => {
        if (tick) return; tick = true;
        requestAnimationFrame(() => {
          px.forEach((el) => { el.style.transform = `translate3d(0,${(window.scrollY * 0.12).toFixed(1)}px,0) scale(1.08)`; });
          tick = false;
        });
      }, { passive: true });
    }

    /* Animated counters */
    const counters = document.querySelectorAll('[data-count]');
    const run = (el) => {
      const end = parseFloat(el.dataset.count); const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = end + suffix; return; }
      const dur = 1600; const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const co = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } }), { threshold: 0.4 });
      counters.forEach((c) => co.observe(c));
    } else counters.forEach(run);

    /* Before / after slider */
    document.querySelectorAll('.ba').forEach((ba) => {
      const range = ba.querySelector('.ba-range');
      if (!range) return;
      const set = () => ba.style.setProperty('--pos', range.value + '%');
      range.addEventListener('input', set); set();
    });

    /* Generic form validation: forms with [data-validate] */
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    document.querySelectorAll('form[data-validate]').forEach((form) => {
      form.setAttribute('novalidate', '');
      const status = form.querySelector('[data-status]');
      const fail = (field, msg) => {
        field.classList.add('is-invalid'); field.setAttribute('aria-invalid', 'true');
        let m = field.parentElement.querySelector('.invalid-msg');
        if (!m) { m = document.createElement('div'); m.className = 'invalid-msg'; m.id = (field.id || field.name) + '-err'; field.parentElement.appendChild(m); }
        m.textContent = msg; field.setAttribute('aria-describedby', m.id);
      };
      const clear = (field) => {
        field.classList.remove('is-invalid'); field.removeAttribute('aria-invalid');
        const m = field.parentElement.querySelector('.invalid-msg'); if (m) m.remove();
      };
      const check = (f) => {
        clear(f);
        if (f.required && !f.value.trim()) { fail(f, 'This field is required.'); return false; }
        if (f.type === 'email' && f.value && !emailRe.test(f.value)) { fail(f, 'Enter a valid email address.'); return false; }
        return true;
      };
      form.addEventListener('input', (e) => { if (e.target.matches('input,select,textarea')) check(e.target); });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fields = [...form.querySelectorAll('input,select,textarea')].filter((f) => f.type !== 'hidden');
        const ok = fields.map(check).every(Boolean);
        if (!ok) { form.querySelector('.is-invalid')?.focus(); return; }
        /* INTEGRATION POINT: send the data to your provider here (Formspree, Netlify Forms,
           Mailchimp, ConvertKit). No success message is shown until a real endpoint responds. */
        const endpoint = form.dataset.endpoint;
        if (!endpoint) {
          if (status) status.textContent = 'Form is valid but not connected yet. Add your endpoint in data-endpoint (see documentation).';
          return;
        }
        fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then((r) => { if (!r.ok) throw new Error(); form.reset(); if (status) status.textContent = 'Thank you. Your message was sent.'; })
          .catch(() => { if (status) status.textContent = 'Something went wrong. Please try again or call us.'; });
      });
    });

    /* Footer year */
    document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
  });
})();
