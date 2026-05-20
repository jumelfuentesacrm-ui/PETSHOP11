/* Shop page */
(function () {
  'use strict';

  let ALL = [];
  let CATEGORIES = [];
  const state = { category: 'All', search: '', sort: 'featured' };

  function filtered() {
    let list = ALL.slice();
    if (state.category !== 'All') {
      list = list.filter((p) => p.category === state.category);
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().indexOf(q) >= 0 ||
          p.brand.toLowerCase().indexOf(q) >= 0 ||
          p.category.toLowerCase().indexOf(q) >= 0
      );
    }
    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else
      list.sort(
        (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.stock - a.stock
      );
    return list;
  }

  function renderFilters() {
    const counts = {};
    ALL.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));
    const items = ['All'].concat(CATEGORIES);
    document.getElementById('filterList').innerHTML = items
      .map((cat) => {
        const n = cat === 'All' ? ALL.length : counts[cat] || 0;
        return (
          '<li><button data-cat="' + PP.escapeHTML(cat) + '"' +
          (cat === state.category ? ' class="active"' : '') + '>' +
          PP.escapeHTML(cat) + '<span>' + n + '</span></button></li>'
        );
      })
      .join('');
  }

  function renderGrid() {
    const list = filtered();
    const grid = document.getElementById('productGrid');
    const count = document.getElementById('resultCount');
    count.textContent =
      list.length + (list.length === 1 ? ' product' : ' products') +
      (state.category !== 'All' ? ' in ' + state.category : '');
    if (!list.length) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1">' +
        '<div style="width:64px;margin:0 auto .8rem;color:var(--ink-faint)">' +
        PP.icons.bag + '</div>' +
        '<h3>No products match your search</h3>' +
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
    // honor ?category= from the URL
    const params = new URLSearchParams(location.search);
    const wanted = params.get('category');

    const r = await PP.api('/api/products');
    if (!r.ok) {
      document.getElementById('productGrid').innerHTML =
        '<p class="muted">The shop is unavailable right now. Please try again shortly.</p>';
      document.getElementById('resultCount').textContent = '';
      return;
    }
    ALL = r.data.products;
    CATEGORIES = r.data.categories;
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
    // keep grid fresh if stock changes elsewhere
    document.addEventListener('cart:change', function () {});
  }

  if (window.PP_CONFIG) init();
  else document.addEventListener('pp:ready', init);
})();
