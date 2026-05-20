/* Shop page */
(function () {
  'use strict';

  let ALL = [];
  let CATEGORIES = [];
  const state = { category: 'All', search: '', sort: 'featured' };

  function filtered() {
    let list = ALL.slice();
    if (state.category !== 'All') list = list.filter((p) => p.category === state.category);
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().indexOf(q) >= 0 ||
          (p.brand || '').toLowerCase().indexOf(q) >= 0 ||
          p.category.toLowerCase().indexOf(q) >= 0
      );
    }
    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.stock - a.stock);
    return list;
  }

  function renderFilters() {
    const counts = {};
    ALL.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
    document.getElementById('filterList').innerHTML = ['All'].concat(CATEGORIES)
      .map((cat) => {
        const n = cat === 'All' ? ALL.length : counts[cat] || 0;
        return '<li><button data-cat="' + PP.escapeHTML(cat) + '"' +
          (cat === state.category ? ' class="active"' : '') + '>' + PP.escapeHTML(cat) +
          '<span>' + n + '</span></button></li>';
      }).join('');
  }

  function renderGrid() {
    const list = filtered();
    const grid = document.getElementById('productGrid');
    document.getElementById('resultCount').textContent =
      list.length + (list.length === 1 ? ' product' : ' products') +
      (state.category !== 'All' ? ' in ' + state.category : '');
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' +
        '<div style="width:64px;margin:0 auto .8rem;color:var(--ink-faint)">' + PP.icons.bag +
        '</div><h3>No products match your search</h3>' +
        '<p class="muted">Try another category or clear your search.</p></div>';
      return;
    }
    grid.innerHTML = list.map(PP.productCardHTML).join('');
  }

  function refresh() {
    renderFilters();
    renderGrid();
  }

  async function init() {
    const grid = document.getElementById('productGrid');
    if (!PP.sb) {
      grid.innerHTML = '<p class="muted">Connect your Supabase project to load products.</p>';
      document.getElementById('resultCount').textContent = '';
      return;
    }
    const { data, error } = await PP.sb
      .from('products').select('*').eq('active', true).order('name');
    if (error || !data) {
      grid.innerHTML = '<p class="muted">The shop is unavailable right now.</p>';
      document.getElementById('resultCount').textContent = '';
      return;
    }
    ALL = data;
    CATEGORIES = Array.from(new Set(data.map((p) => p.category))).sort();

    const wanted = new URLSearchParams(location.search).get('category');
    if (wanted && CATEGORIES.indexOf(wanted) >= 0) state.category = wanted;

    refresh();

    document.getElementById('filterList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.category = btn.getAttribute('data-cat');
      refresh();
    });
    document.getElementById('searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      renderGrid();
    });
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderGrid();
    });
  }

  document.addEventListener('pp:ready', init);
})();
