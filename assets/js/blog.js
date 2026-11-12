/* ÉLAN blog: search, category filter and pagination (client-side). */
(() => {
  'use strict';
  const grid = document.getElementById('post-grid');
  if (!grid) return;
  const PER_PAGE = 6;
  const posts = [...grid.querySelectorAll('.post')];
  const search = document.getElementById('blog-search');
  const buttons = [...document.querySelectorAll('.filter-btn')];
  const pager = document.getElementById('pager');
  const empty = document.getElementById('no-results');
  const status = document.getElementById('blog-status');
  let cat = 'all'; let page = 1;

  const filtered = () => {
    const q = search.value.trim().toLowerCase();
    return posts.filter((p) => (cat === 'all' || p.dataset.cat === cat) && (!q || (p.dataset.title + ' ' + p.textContent).toLowerCase().includes(q)));
  };
  const render = () => {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    page = Math.min(page, pages);
    posts.forEach((p) => { p.hidden = true; });
    list.slice((page - 1) * PER_PAGE, page * PER_PAGE).forEach((p) => { p.hidden = false; });
    empty.hidden = list.length > 0;
    status.textContent = list.length ? `${list.length} article${list.length === 1 ? '' : 's'} found` : 'No articles found';
    pager.innerHTML = '';
    if (pages < 2) return;
    const add = (label, n, opts = {}) => {
      const li = document.createElement('li'); const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; if (opts.aria) b.setAttribute('aria-label', opts.aria);
      if (opts.disabled) b.disabled = true; if (n === page && !opts.nav) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => { page = n; render(); grid.scrollIntoView({ block: 'start' }); });
      li.appendChild(b); pager.appendChild(li);
    };
    add('Prev', page - 1, { nav: true, disabled: page === 1, aria: 'Previous page' });
    for (let i = 1; i <= pages; i++) add(String(i), i, { aria: `Page ${i}` });
    add('Next', page + 1, { nav: true, disabled: page === pages, aria: 'Next page' });
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    cat = b.dataset.filter; page = 1;
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  }));
  search.addEventListener('input', () => { page = 1; render(); });
  document.getElementById('blog-search-form').addEventListener('submit', (e) => e.preventDefault());
  render();
})();
