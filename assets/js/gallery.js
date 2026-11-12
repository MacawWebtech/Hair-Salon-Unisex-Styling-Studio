/* ÉLAN gallery: category filter, load more, accessible lightbox. */
(() => {
  'use strict';
  const BATCH = 9;
  const grid = document.getElementById('masonry');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.g-item')];
  const buttons = [...document.querySelectorAll('.filter-btn')];
  const more = document.getElementById('load-more');
  const status = document.getElementById('g-status');
  let cat = 'all';
  let shown = BATCH;

  const matching = () => items.filter((i) => cat === 'all' || i.dataset.cat.split(' ').includes(cat));

  const render = () => {
    const list = matching();
    items.forEach((i) => { i.hidden = true; });
    list.slice(0, shown).forEach((i) => { i.hidden = false; });
    const visible = Math.min(shown, list.length);
    status.textContent = `Showing ${visible} of ${list.length} photos`;
    more.hidden = visible >= list.length;
  };

  buttons.forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.filter; shown = BATCH;
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  }));
  more.addEventListener('click', () => {
    const before = shown; shown += BATCH; render();
    const firstNew = matching()[before];
    firstNew && firstNew.focus();
  });

  /* Lightbox using native <dialog> (focus trap, Esc, backdrop handled by the browser) */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('.lb-cap');
  let idx = 0; let opener = null;
  const visibleItems = () => items.filter((i) => !i.hidden);
  const show = (n) => {
    const list = visibleItems();
    idx = (n + list.length) % list.length;
    const el = list[idx];
    lbImg.src = el.dataset.full || el.querySelector('img').src;
    lbImg.alt = el.querySelector('img').alt;
    lbCap.textContent = `${el.dataset.title || lbImg.alt} (${idx + 1} of ${list.length})`;
  };
  grid.addEventListener('click', (e) => {
    const el = e.target.closest('.g-item');
    if (!el) return;
    opener = el;
    show(visibleItems().indexOf(el));
    lb.showModal();
  });
  lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
  lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(idx + (document.dir === 'rtl' || document.documentElement.dir === 'rtl' ? 1 : -1));
    if (e.key === 'ArrowRight') show(idx + (document.documentElement.dir === 'rtl' ? -1 : 1));
  });
  lb.addEventListener('close', () => { lbImg.removeAttribute('src'); opener && opener.focus(); });

  render();
})();
