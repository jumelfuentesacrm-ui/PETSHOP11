/* Staff dashboard */
(function () {
  'use strict';

  const KEY_STORE = 'pp_admin_key';
  const $ = (id) => document.getElementById(id);
  let TAB = 'bookings';

  const SEL_STYLE =
    'padding:.32rem .5rem;border-radius:8px;border:1.5px solid var(--line);' +
    'font-family:inherit;font-weight:700;font-size:.82rem;background:#fff';

  function key() {
    return sessionStorage.getItem(KEY_STORE) || '';
  }

  async function adminFetch(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'x-admin-key': key() }, opts.headers || {});
    return PP.api(path, opts);
  }

  /* -------------------------------- helpers ------------------------------- */
  function fmtWhen(date, time) {
    const d = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    let [h, m] = time.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return d + ' · ' + h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }

  function fmtStamp(iso) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function statusSelect(kind, id, current, options) {
    return (
      '<select data-status="' + kind + '" data-id="' + id + '" style="' + SEL_STYLE + '">' +
      options
        .map((o) => '<option' + (o === current ? ' selected' : '') + '>' + o + '</option>')
        .join('') +
      '</select>'
    );
  }

  /* --------------------------------- login -------------------------------- */
  function renderLogin(msg) {
    $('adminRoot').innerHTML =
      '<div class="confirm-card" style="max-width:420px">' +
      '<div class="check" style="background:rgba(200,163,91,.16);color:var(--gold-deep)">' +
      PP.icons.shield + '</div>' +
      '<h2>Staff sign in</h2>' +
      '<p class="muted">Enter the staff passcode to view the dashboard.</p>' +
      (msg
        ? '<div class="alert alert--err" style="margin-top:1rem">' + PP.escapeHTML(msg) + '</div>'
        : '') +
      '<div class="field mt-2" style="text-align:left">' +
      '<label for="pass">Passcode</label>' +
      '<input id="pass" type="password" placeholder="••••••••" /></div>' +
      '<button class="btn btn--primary btn--block" id="loginBtn">Sign in</button>' +
      '<p class="muted" style="font-size:.78rem;margin-top:.8rem">Demo passcode: poshpet2024</p>' +
      '</div>';
    const go = () => {
      const v = $('pass').value.trim();
      if (!v) return;
      sessionStorage.setItem(KEY_STORE, v);
      load();
    };
    $('loginBtn').addEventListener('click', go);
    $('pass').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go();
    });
  }

  /* ------------------------------ dashboard ------------------------------- */
  function statTiles(c) {
    const tiles = [
      ["Today's grooms", c.bookingsToday],
      ['Upcoming grooms', c.bookingsUpcoming],
      ['New orders', c.ordersNew],
      ['Low-stock items', c.lowStock],
      ['Unread messages', c.unreadMessages]
    ];
    return (
      '<div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:1.6rem">' +
      tiles
        .map(
          (t) =>
            '<div class="fact"><strong>' + t[1] + '</strong><span>' + t[0] + '</span></div>'
        )
        .join('') +
      '</div>'
    );
  }

  function tabsNav() {
    const tabs = [
      ['bookings', 'Appointments'],
      ['orders', 'Orders'],
      ['inventory', 'Inventory'],
      ['messages', 'Messages']
    ];
    return (
      '<div class="pill-row" style="margin-bottom:1.2rem">' +
      tabs
        .map(
          (t) =>
            '<button class="pill' + (TAB === t[0] ? ' selected' : '') +
            '" data-tab="' + t[0] + '">' + t[1] + '</button>'
        )
        .join('') +
      '</div>'
    );
  }

  function bookingsTable(rows) {
    if (!rows.length) return '<p class="muted">No appointments yet.</p>';
    return (
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Code</th><th>When</th><th>Service</th><th>Pet</th><th>Owner</th>' +
      '<th>Contact</th><th>Est.</th><th>Status</th></tr></thead><tbody>' +
      rows
        .map(
          (b) =>
            '<tr><td><strong>' + b.id + '</strong></td>' +
            '<td>' + fmtWhen(b.date, b.time) + '</td>' +
            '<td>' + PP.escapeHTML(b.serviceName) +
            (b.petSize ? ' <span class="tag tag--muted">' + b.petSize + '</span>' : '') + '</td>' +
            '<td>' + PP.escapeHTML(b.petName) +
            ' <span class="muted">(' + PP.escapeHTML(b.petType) + ')</span></td>' +
            '<td>' + PP.escapeHTML(b.ownerName) + '</td>' +
            '<td>' + PP.escapeHTML(b.phone) + '<br><span class="muted">' +
            PP.escapeHTML(b.email) + '</span></td>' +
            '<td>' + PP.money(b.price) + '</td>' +
            '<td>' + statusSelect('bookings', b.id, b.status, [
              'requested',
              'confirmed',
              'completed',
              'cancelled'
            ]) + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    );
  }

  function ordersTable(rows) {
    if (!rows.length) return '<p class="muted">No orders yet.</p>';
    return (
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Code</th><th>Placed</th><th>Customer</th><th>Items</th>' +
      '<th>Fulfillment</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
      rows
        .map((o) => {
          const items = o.items
            .map((i) => i.qty + '× ' + PP.escapeHTML(i.name))
            .join('<br>');
          return (
            '<tr><td><strong>' + o.id + '</strong></td>' +
            '<td>' + fmtStamp(o.createdAt) + '</td>' +
            '<td>' + PP.escapeHTML(o.customer.name) + '<br><span class="muted">' +
            PP.escapeHTML(o.customer.phone) + '</span></td>' +
            '<td style="font-size:.82rem">' + items + '</td>' +
            '<td>' + (o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup') + '</td>' +
            '<td>' + PP.money(o.total) + '</td>' +
            '<td>' + statusSelect('orders', o.id, o.status, [
              'new',
              'preparing',
              'ready',
              'fulfilled',
              'cancelled'
            ]) + '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function inventoryTable(rows) {
    return (
      '<p class="muted" style="margin-bottom:.8rem">Edit a stock value to update it instantly. Rows are sorted lowest stock first.</p>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Product</th><th>Category</th><th>Price</th><th>In stock</th></tr></thead><tbody>' +
      rows
        .map(
          (p) =>
            '<tr><td><strong>' + PP.escapeHTML(p.name) + '</strong><br>' +
            '<span class="muted">' + PP.escapeHTML(p.brand) + '</span></td>' +
            '<td>' + PP.escapeHTML(p.category) + '</td>' +
            '<td>' + PP.money(p.price) + '</td>' +
            '<td><input type="number" min="0" max="9999" value="' + p.stock +
            '" data-stock="' + p.id + '" style="width:80px;' + SEL_STYLE + '">' +
            (p.stock <= 5
              ? ' <span class="tag tag--berry">low</span>'
              : '') + '</td></tr>'
        )
        .join('') +
      '</tbody></table></div>'
    );
  }

  function messagesList(rows) {
    if (!rows.length) return '<p class="muted">No messages yet.</p>';
    return rows
      .map(
        (m) =>
          '<div class="card" style="padding:1.1rem 1.3rem;margin-bottom:.8rem">' +
          '<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">' +
          '<strong>' + PP.escapeHTML(m.name) +
          (m.subject ? ' — ' + PP.escapeHTML(m.subject) : '') + '</strong>' +
          '<span class="muted" style="font-size:.82rem">' + fmtStamp(m.createdAt) + '</span></div>' +
          '<p style="margin:.4rem 0">' + PP.escapeHTML(m.message) + '</p>' +
          '<span class="muted" style="font-size:.84rem">' + PP.escapeHTML(m.email) +
          (m.phone ? ' · ' + PP.escapeHTML(m.phone) : '') + '</span></div>'
      )
      .join('');
  }

  function renderDashboard(d) {
    const panels = {
      bookings: bookingsTable(d.bookings),
      orders: ordersTable(d.orders),
      inventory: inventoryTable(d.products),
      messages: messagesList(d.messages)
    };
    $('adminRoot').innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.2rem">' +
      '<h2 style="font-size:1.5rem">Overview</h2>' +
      '<div style="display:flex;gap:.6rem">' +
      '<button class="btn btn--ghost btn--sm" id="refreshBtn">Refresh</button>' +
      '<button class="btn btn--dark btn--sm" id="logoutBtn">Sign out</button></div></div>' +
      statTiles(d.counts) +
      tabsNav() +
      '<div class="card" style="padding:1.4rem 1.6rem">' + panels[TAB] + '</div>';

    $('refreshBtn').addEventListener('click', load);
    $('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem(KEY_STORE);
      renderLogin();
    });
    document.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        TAB = b.getAttribute('data-tab');
        renderDashboard(d);
      })
    );
    document.querySelectorAll('[data-status]').forEach((sel) =>
      sel.addEventListener('change', () => changeStatus(sel))
    );
    document.querySelectorAll('[data-stock]').forEach((inp) =>
      inp.addEventListener('change', () => changeStock(inp))
    );
  }

  /* -------------------------------- actions ------------------------------- */
  async function changeStatus(sel) {
    const kind = sel.getAttribute('data-status');
    const id = sel.getAttribute('data-id');
    const r = await adminFetch(
      '/api/admin/' + kind + '/' + encodeURIComponent(id) + '/status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sel.value })
      }
    );
    if (r.ok) PP.toast('Updated ' + id + ' → ' + sel.value);
    else PP.toast((r.data.errors || ['Update failed'])[0], 'err');
  }

  async function changeStock(inp) {
    const id = inp.getAttribute('data-stock');
    const r = await adminFetch(
      '/api/admin/products/' + encodeURIComponent(id) + '/stock',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Number(inp.value) })
      }
    );
    if (r.ok) PP.toast('Stock updated');
    else {
      PP.toast((r.data.errors || ['Update failed'])[0], 'err');
      load();
    }
  }

  /* --------------------------------- load --------------------------------- */
  async function load() {
    if (!key()) {
      renderLogin();
      return;
    }
    $('adminRoot').innerHTML = '<div class="skeleton" style="height:200px"></div>';
    const r = await adminFetch('/api/admin/summary');
    if (r.status === 401) {
      sessionStorage.removeItem(KEY_STORE);
      renderLogin('That passcode was not recognized.');
      return;
    }
    if (!r.ok) {
      $('adminRoot').innerHTML =
        '<div class="alert alert--err">Could not load the dashboard. ' +
        '<button class="link-btn" onclick="location.reload()">Retry</button></div>';
      return;
    }
    renderDashboard(r.data);
  }

  load();
})();
