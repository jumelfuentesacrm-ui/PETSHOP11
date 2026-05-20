/* Staff dashboard (Supabase-backed) */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let tab = 'bookings';
  let editingProduct;   // undefined closed | null new | object edit
  let editingService;
  const DB = { bookings: [], orders: [], products: [], services: [], messages: [] };

  const SEL =
    'padding:.34rem .5rem;border-radius:8px;border:1.5px solid var(--line);' +
    'font-family:inherit;font-weight:700;font-size:.82rem;background:#fff';

  /* -------------------------------- helpers ------------------------------- */
  function todayISO() {
    return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  }
  function fmtWhen(date, time) {
    const d = new Date(date + 'T12:00:00').toLocaleDateString('en-US',
      { weekday: 'short', month: 'short', day: 'numeric' });
    let [h, m] = time.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return d + ' · ' + h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function fmtStamp(iso) {
    return new Date(iso).toLocaleString('en-US',
      { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function esc(v) { return PP.escapeHTML(v); }
  function statusSelect(kind, id, current, opts) {
    return '<select data-status="' + kind + '" data-id="' + id + '" style="' + SEL + '">' +
      opts.map((o) => '<option' + (o === current ? ' selected' : '') + '>' + o + '</option>').join('') +
      '</select>';
  }
  function options(values, selected) {
    return values.map((v) =>
      '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' +
      esc(v) + '</option>').join('');
  }

  /* --------------------------------- login -------------------------------- */
  function renderLogin(msg) {
    $('adminRoot').innerHTML =
      '<div class="confirm-card" style="max-width:430px">' +
      '<div class="check" style="background:rgba(200,163,91,.16);color:var(--gold-deep)">' +
      PP.icons.shield + '</div><h2>Staff sign in</h2>' +
      '<p class="muted">Log in with a staff account to manage the store.</p>' +
      (msg ? '<div class="alert alert--err" style="margin-top:1rem">' + esc(msg) + '</div>' : '') +
      '<div class="field mt-2" style="text-align:left"><label for="aEmail">Email</label>' +
      '<input id="aEmail" type="email" autocomplete="email"></div>' +
      '<div class="field" style="text-align:left"><label for="aPass">Password</label>' +
      '<input id="aPass" type="password" autocomplete="current-password"></div>' +
      '<div id="aErr"></div>' +
      '<button class="btn btn--primary btn--block" id="aBtn">Log in</button>' +
      '<p class="muted" style="font-size:.8rem;margin-top:.8rem">Staff accounts are granted ' +
      'in Supabase. See the README.</p></div>';
    const go = doLogin;
    $('aBtn').addEventListener('click', go);
    $('aPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }

  async function doLogin() {
    const email = $('aEmail').value.trim();
    const password = $('aPass').value;
    if (!email || !password) {
      $('aErr').innerHTML = '<div class="alert alert--err">Enter your email and password.</div>';
      return;
    }
    if (!PP.requireSb()) return;
    const btn = $('aBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Logging in…';
    const { error } = await PP.sb.auth.signInWithPassword({ email, password });
    if (error) {
      btn.disabled = false;
      btn.textContent = 'Log in';
      $('aErr').innerHTML = '<div class="alert alert--err">' +
        esc(error.message || 'Could not log in.') + '</div>';
    }
    // success -> auth:change re-renders
  }

  function renderDenied() {
    $('adminRoot').innerHTML =
      '<div class="confirm-card" style="max-width:430px">' +
      '<div class="check" style="background:rgba(178,86,107,.14);color:var(--berry)">' +
      PP.icons.shield + '</div><h2>Not a staff account</h2>' +
      '<p class="muted">You are signed in as <strong>' + esc(PP.user.email) +
      '</strong>, but this account is not an administrator.</p>' +
      '<p class="muted" style="font-size:.85rem;margin-top:.6rem">Run in Supabase:<br>' +
      '<code>update public.profiles set is_admin = true where email = \'' +
      esc(PP.user.email) + '\';</code></p>' +
      '<button class="btn btn--ghost mt-2" id="aOut">Sign out</button></div>';
    $('aOut').addEventListener('click', async () => { await PP.signOut(); render(); });
  }

  /* ------------------------------- dashboard ------------------------------ */
  async function loadAll() {
    const [bk, od, pr, sv, ms] = await Promise.all([
      PP.sb.from('bookings').select('*').order('date'),
      PP.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      PP.sb.from('products').select('*').order('stock'),
      PP.sb.from('services').select('*').order('sort_order'),
      PP.sb.from('messages').select('*').order('created_at', { ascending: false })
    ]);
    DB.bookings = bk.data || [];
    DB.orders = od.data || [];
    DB.products = pr.data || [];
    DB.services = sv.data || [];
    DB.messages = ms.data || [];
  }

  function statTiles() {
    const today = todayISO();
    const tiles = [
      ["Today's grooms", DB.bookings.filter((b) => b.date === today && b.status !== 'cancelled').length],
      ['Upcoming grooms', DB.bookings.filter((b) => b.date >= today && b.status !== 'cancelled').length],
      ['New orders', DB.orders.filter((o) => o.status === 'new').length],
      ['Low stock', DB.products.filter((p) => p.stock <= 5).length],
      ['Unread messages', DB.messages.filter((m) => m.status === 'unread').length]
    ];
    return '<div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:1.4rem">' +
      tiles.map((t) => '<div class="fact"><strong>' + t[1] + '</strong><span>' + t[0] +
        '</span></div>').join('') + '</div>';
  }

  function renderDashboard() {
    const tabs = [['bookings', 'Appointments'], ['orders', 'Orders'],
      ['inventory', 'Inventory'], ['services', 'Services'], ['messages', 'Messages']];
    $('adminRoot').innerHTML =
      '<div class="admin-bar"><h2 style="font-size:1.5rem">Dashboard</h2>' +
      '<div style="display:flex;gap:.6rem">' +
      '<button class="btn btn--ghost btn--sm" id="refreshBtn">Refresh</button>' +
      '<button class="btn btn--dark btn--sm" id="logoutBtn">Sign out</button></div></div>' +
      statTiles() +
      '<div class="pill-row" style="margin-bottom:1.2rem">' +
      tabs.map(([k, label]) => '<button class="pill' + (tab === k ? ' selected' : '') +
        '" data-tab="' + k + '">' + label + '</button>').join('') + '</div>' +
      '<div class="card" style="padding:1.4rem 1.6rem" id="adminPanel"></div>';

    $('refreshBtn').addEventListener('click', refresh);
    $('logoutBtn').addEventListener('click', async () => { await PP.signOut(); render(); });
    document.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        tab = b.getAttribute('data-tab');
        editingProduct = undefined;
        editingService = undefined;
        renderDashboard();
      }));
    renderPanel();
  }

  function renderPanel() {
    if (tab === 'bookings') return renderBookings();
    if (tab === 'orders') return renderOrders();
    if (tab === 'inventory') return renderInventory();
    if (tab === 'services') return renderServices();
    if (tab === 'messages') return renderMessages();
  }

  /* ------------------------------- bookings ------------------------------- */
  function renderBookings() {
    const rows = DB.bookings;
    let body;
    if (!rows.length) body = '<p class="mini-note">No appointments yet.</p>';
    else body = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Code</th><th>When</th><th>Service</th><th>Pet</th><th>Owner</th>' +
      '<th>Contact</th><th>Est.</th><th>Status</th></tr></thead><tbody>' +
      rows.map((b) =>
        '<tr><td><strong>' + esc(b.code) + '</strong></td>' +
        '<td>' + fmtWhen(b.date, b.time) + '</td>' +
        '<td>' + esc(b.service_name) +
        (b.pet_size ? ' <span class="tag tag--muted">' + esc(b.pet_size) + '</span>' : '') + '</td>' +
        '<td>' + esc(b.pet_name) + ' <span class="muted">(' + esc(b.pet_type || '') + ')</span></td>' +
        '<td>' + esc(b.owner_name) + '</td>' +
        '<td>' + esc(b.phone) + '<br><span class="muted">' + esc(b.email) + '</span></td>' +
        '<td>' + PP.money(b.price) + '</td>' +
        '<td>' + statusSelect('bookings', b.id, b.status,
          ['requested', 'confirmed', 'completed', 'cancelled']) + '</td></tr>').join('') +
      '</tbody></table></div>';
    $('adminPanel').innerHTML = '<h3 style="margin-bottom:.8rem">Appointments</h3>' + body;
    wireStatus();
  }

  /* -------------------------------- orders -------------------------------- */
  function renderOrders() {
    const rows = DB.orders;
    let body;
    if (!rows.length) body = '<p class="mini-note">No orders yet.</p>';
    else body = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Code</th><th>Placed</th><th>Customer</th><th>Items</th>' +
      '<th>Fulfilment</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
      rows.map((o) => {
        const items = (o.order_items || [])
          .map((i) => i.qty + '× ' + esc(i.name)).join('<br>');
        return '<tr><td><strong>' + esc(o.code) + '</strong></td>' +
          '<td>' + fmtStamp(o.created_at) + '</td>' +
          '<td>' + esc(o.customer_name) + '<br><span class="muted">' + esc(o.phone) + '</span></td>' +
          '<td style="font-size:.82rem">' + items + '</td>' +
          '<td>' + (o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup') + '</td>' +
          '<td>' + PP.money(o.total) + '</td>' +
          '<td>' + statusSelect('orders', o.id, o.status,
            ['new', 'preparing', 'ready', 'fulfilled', 'cancelled']) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $('adminPanel').innerHTML = '<h3 style="margin-bottom:.8rem">Orders</h3>' + body;
    wireStatus();
  }

  function wireStatus() {
    document.querySelectorAll('[data-status]').forEach((sel) =>
      sel.addEventListener('change', async () => {
        const kind = sel.getAttribute('data-status');
        const id = sel.getAttribute('data-id');
        const { error } = await PP.sb.from(kind).update({ status: sel.value }).eq('id', id);
        if (error) { PP.toast(error.message || 'Update failed', 'err'); return; }
        const row = DB[kind].find((r) => r.id === id);
        if (row) row.status = sel.value;
        PP.toast('Status updated');
      }));
  }

  /* ------------------------------ inventory ------------------------------- */
  function renderInventory() {
    const rows = DB.products;
    const form = editingProduct !== undefined ? productFormHTML(editingProduct) : '';
    let table;
    if (!rows.length) {
      table = '<p class="mini-note">No products yet — add your first one.</p>';
    } else {
      table = '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Product</th><th>Category</th><th>Price</th><th>Stock</th>' +
        '<th>Status</th><th></th></tr></thead><tbody>' +
        rows.map((p) =>
          '<tr><td><strong>' + esc(p.name) + '</strong><br><span class="muted">' +
          esc(p.brand || '') + '</span></td>' +
          '<td>' + esc(p.category) + '</td>' +
          '<td>' + PP.money(p.price) + '</td>' +
          '<td><input type="number" min="0" max="9999" value="' + p.stock +
          '" data-stock="' + p.id + '" style="width:74px;' + SEL + '">' +
          (p.stock <= 5 ? ' <span class="tag tag--berry">low</span>' : '') + '</td>' +
          '<td>' + (p.active ? '<span class="tag tag--teal">Active</span>'
            : '<span class="tag tag--muted">Hidden</span>') + '</td>' +
          '<td><div class="row-actions">' +
          '<button class="icon-btn" data-prod-edit="' + p.id + '">' + PP.icons.edit + '</button>' +
          '<button class="icon-btn icon-btn--danger" data-prod-del="' + p.id + '">' +
          PP.icons.trash + '</button></div></td></tr>').join('') +
        '</tbody></table></div>';
    }
    $('adminPanel').innerHTML =
      '<div class="admin-bar"><h3>Inventory · ' + rows.length + ' products</h3>' +
      (editingProduct === undefined
        ? '<button class="btn btn--dark btn--sm" id="prodAdd">+ Add product</button>' : '') +
      '</div>' + form + table;

    if ($('prodAdd')) $('prodAdd').addEventListener('click', () => {
      editingProduct = null; renderInventory();
    });
    wireProductForm();
    document.querySelectorAll('[data-stock]').forEach((inp) =>
      inp.addEventListener('change', () => saveStock(inp)));
    document.querySelectorAll('[data-prod-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        editingProduct = DB.products.find((p) => p.id === b.getAttribute('data-prod-edit'));
        renderInventory();
      }));
    document.querySelectorAll('[data-prod-del]').forEach((b) =>
      b.addEventListener('click', () => deleteProduct(b.getAttribute('data-prod-del'))));
  }

  function productFormHTML(p) {
    p = p || {};
    const cats = Array.from(new Set(DB.products.map((x) => x.category)));
    return '<div class="admin-form"><h3 style="margin-bottom:.8rem">' +
      (p.id ? 'Edit product' : 'New product') + '</h3>' +
      '<div class="form-row">' +
      '<div class="field"><label>Name</label><input id="pdName" value="' +
      esc(p.name || '') + '" maxlength="80"></div>' +
      '<div class="field"><label>Category</label><input id="pdCat" list="catList" value="' +
      esc(p.category || '') + '" maxlength="40">' +
      '<datalist id="catList">' + cats.map((c) => '<option value="' + esc(c) + '">').join('') +
      '</datalist></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Brand</label><input id="pdBrand" value="' +
      esc(p.brand || '') + '" maxlength="50"></div>' +
      '<div class="field"><label>Badge <span class="hint">optional</span></label>' +
      '<input id="pdBadge" value="' + esc(p.badge || '') + '" maxlength="24"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Price (USD)</label><input id="pdPrice" type="number" ' +
      'min="0" step="0.01" value="' + (p.price != null ? p.price : '') + '"></div>' +
      '<div class="field"><label>Stock</label><input id="pdStock" type="number" ' +
      'min="0" step="1" value="' + (p.stock != null ? p.stock : 0) + '"></div></div>' +
      '<div class="field"><label>Description</label><textarea id="pdBlurb" maxlength="300">' +
      esc(p.blurb || '') + '</textarea></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Rating (0–5)</label><input id="pdRating" type="number" ' +
      'min="0" max="5" step="0.1" value="' + (p.rating != null ? p.rating : 4.7) + '"></div>' +
      '<div></div></div>' +
      '<label class="toggle-line"><input type="checkbox" id="pdFeatured"' +
      (p.featured ? ' checked' : '') + '> Show in featured products</label>' +
      '<label class="toggle-line"><input type="checkbox" id="pdActive"' +
      (p.id ? (p.active ? ' checked' : '') : ' checked') + '> Visible in the shop</label>' +
      '<div id="pdErr"></div>' +
      '<div style="display:flex;gap:.6rem">' +
      '<button class="btn btn--primary btn--sm" id="pdSave">Save product</button>' +
      '<button class="btn btn--ghost btn--sm" id="pdCancel">Cancel</button></div></div>';
  }

  function wireProductForm() {
    if (!$('pdSave')) return;
    $('pdCancel').addEventListener('click', () => { editingProduct = undefined; renderInventory(); });
    $('pdSave').addEventListener('click', saveProduct);
  }

  async function saveProduct() {
    const errs = [];
    const name = $('pdName').value.trim();
    const category = $('pdCat').value.trim();
    const price = parseFloat($('pdPrice').value);
    const stock = parseInt($('pdStock').value, 10);
    const rating = parseFloat($('pdRating').value);
    if (!name) errs.push('Name is required.');
    if (!category) errs.push('Category is required.');
    if (isNaN(price) || price < 0) errs.push('Enter a valid price.');
    if (isNaN(stock) || stock < 0) errs.push('Enter a valid stock amount.');
    if (errs.length) {
      $('pdErr').innerHTML = '<div class="alert alert--err"><ul style="margin-left:1rem">' +
        errs.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
      return;
    }
    const record = {
      name: name, category: category,
      brand: $('pdBrand').value.trim() || null,
      price: price, stock: stock,
      blurb: $('pdBlurb').value.trim() || null,
      rating: isNaN(rating) ? 4.7 : Math.max(0, Math.min(5, rating)),
      featured: $('pdFeatured').checked,
      badge: $('pdBadge').value.trim() || null,
      active: $('pdActive').checked
    };
    const btn = $('pdSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Saving…';
    let res;
    if (editingProduct && editingProduct.id) {
      res = await PP.sb.from('products').update(record).eq('id', editingProduct.id);
    } else {
      res = await PP.sb.from('products').insert(record);
    }
    if (res.error) {
      btn.disabled = false;
      btn.textContent = 'Save product';
      $('pdErr').innerHTML = '<div class="alert alert--err">' +
        esc(res.error.message || 'Could not save.') + '</div>';
      return;
    }
    editingProduct = undefined;
    await loadAll();
    renderDashboard();
    PP.toast('Product saved');
  }

  async function saveStock(inp) {
    const id = inp.getAttribute('data-stock');
    const stock = parseInt(inp.value, 10);
    if (isNaN(stock) || stock < 0) { PP.toast('Invalid stock value', 'err'); return; }
    const { error } = await PP.sb.from('products').update({ stock: stock }).eq('id', id);
    if (error) { PP.toast(error.message || 'Update failed', 'err'); return; }
    const row = DB.products.find((p) => p.id === id);
    if (row) row.stock = stock;
    PP.toast('Stock updated');
  }

  async function deleteProduct(id) {
    const p = DB.products.find((x) => x.id === id);
    if (!confirm('Delete "' + (p ? p.name : 'this product') + '"? This cannot be undone.')) return;
    const { error } = await PP.sb.from('products').delete().eq('id', id);
    if (error) { PP.toast(error.message || 'Could not delete', 'err'); return; }
    await loadAll();
    renderDashboard();
    PP.toast('Product deleted');
  }

  /* ------------------------------- services ------------------------------- */
  function renderServices() {
    const rows = DB.services;
    const form = editingService !== undefined ? serviceFormHTML(editingService) : '';
    let table;
    if (!rows.length) {
      table = '<p class="mini-note">No services yet — add your first one.</p>';
    } else {
      table = '<div class="table-wrap"><table class="data"><thead><tr>' +
        '<th>Service</th><th>Duration</th><th>Pricing</th><th>Status</th>' +
        '<th></th></tr></thead><tbody>' +
        rows.map((s) => {
          const pr = s.pricing || {};
          const priceTxt = pr.type === 'flat'
            ? PP.money(pr.amount)
            : 'by size · from ' + PP.money(Math.min.apply(null,
                Object.values(pr.sizes || { x: 0 }).map(Number)));
          return '<tr><td><strong>' + esc(s.name) + '</strong><br><span class="muted">' +
            esc(s.tagline || '') + '</span></td>' +
            '<td>' + (s.duration_min || 0) + ' min</td>' +
            '<td>' + priceTxt + '</td>' +
            '<td>' + (s.active ? '<span class="tag tag--teal">Active</span>'
              : '<span class="tag tag--muted">Hidden</span>') +
            (s.popular ? ' <span class="tag tag--gold">Popular</span>' : '') + '</td>' +
            '<td><div class="row-actions">' +
            '<button class="icon-btn" data-svc-edit="' + s.id + '">' + PP.icons.edit + '</button>' +
            '<button class="icon-btn icon-btn--danger" data-svc-del="' + s.id + '">' +
            PP.icons.trash + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    $('adminPanel').innerHTML =
      '<div class="admin-bar"><h3>Grooming services · ' + rows.length + '</h3>' +
      (editingService === undefined
        ? '<button class="btn btn--dark btn--sm" id="svcAdd">+ Add service</button>' : '') +
      '</div>' + form + table;

    if ($('svcAdd')) $('svcAdd').addEventListener('click', () => {
      editingService = null; renderServices();
    });
    wireServiceForm();
    document.querySelectorAll('[data-svc-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        editingService = DB.services.find((s) => s.id === b.getAttribute('data-svc-edit'));
        renderServices();
      }));
    document.querySelectorAll('[data-svc-del]').forEach((b) =>
      b.addEventListener('click', () => deleteService(b.getAttribute('data-svc-del'))));
  }

  function serviceFormHTML(s) {
    s = s || {};
    const pr = s.pricing || { type: 'flat', amount: 0 };
    const sizes = pr.sizes || {};
    const sizeInput = (key) =>
      '<div class="field"><label>' + key + '</label><input type="number" min="0" step="0.01" ' +
      'data-size="' + key + '" value="' + (sizes[key] != null ? sizes[key] : '') + '"></div>';
    return '<div class="admin-form"><h3 style="margin-bottom:.8rem">' +
      (s.id ? 'Edit service' : 'New service') + '</h3>' +
      '<div class="form-row">' +
      '<div class="field"><label>Name</label><input id="svName" value="' +
      esc(s.name || '') + '" maxlength="60"></div>' +
      '<div class="field"><label>Icon</label><select id="svIcon">' +
      options(PP.APP.serviceIcons, s.icon || 'paw') + '</select></div></div>' +
      '<div class="field"><label>Tagline</label><input id="svTagline" value="' +
      esc(s.tagline || '') + '" maxlength="80"></div>' +
      '<div class="field"><label>Description</label><textarea id="svBlurb" maxlength="400">' +
      esc(s.blurb || '') + '</textarea></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Duration (minutes)</label><input id="svDuration" ' +
      'type="number" min="5" step="5" value="' + (s.duration_min || 60) + '"></div>' +
      '<div class="field"><label>Sort order</label><input id="svSort" type="number" ' +
      'value="' + (s.sort_order != null ? s.sort_order : 100) + '"></div></div>' +
      '<div class="field"><label>Pricing type</label><select id="svType">' +
      '<option value="flat"' + (pr.type === 'flat' ? ' selected' : '') + '>Flat rate</option>' +
      '<option value="size"' + (pr.type === 'size' ? ' selected' : '') + '>Priced by pet size</option>' +
      '</select></div>' +
      '<div id="svFlat" class="field"><label>Flat price (USD)</label>' +
      '<input id="svAmount" type="number" min="0" step="0.01" value="' +
      (pr.type === 'flat' && pr.amount != null ? pr.amount : '') + '"></div>' +
      '<div id="svSizes"><div class="form-row">' + sizeInput('Small') + sizeInput('Medium') +
      '</div><div class="form-row">' + sizeInput('Large') + sizeInput('X-Large') + '</div></div>' +
      '<label class="toggle-line"><input type="checkbox" id="svPopular"' +
      (s.popular ? ' checked' : '') + '> Mark as "most popular"</label>' +
      '<label class="toggle-line"><input type="checkbox" id="svActive"' +
      (s.id ? (s.active ? ' checked' : '') : ' checked') + '> Visible on the website</label>' +
      '<div id="svErr"></div>' +
      '<div style="display:flex;gap:.6rem">' +
      '<button class="btn btn--primary btn--sm" id="svSave">Save service</button>' +
      '<button class="btn btn--ghost btn--sm" id="svCancel">Cancel</button></div></div>';
  }

  function wireServiceForm() {
    if (!$('svSave')) return;
    const toggle = () => {
      const size = $('svType').value === 'size';
      $('svFlat').style.display = size ? 'none' : '';
      $('svSizes').style.display = size ? '' : 'none';
    };
    toggle();
    $('svType').addEventListener('change', toggle);
    $('svCancel').addEventListener('click', () => { editingService = undefined; renderServices(); });
    $('svSave').addEventListener('click', saveService);
  }

  async function saveService() {
    const errs = [];
    const name = $('svName').value.trim();
    if (!name) errs.push('Name is required.');
    let pricing;
    if ($('svType').value === 'flat') {
      const amt = parseFloat($('svAmount').value);
      if (isNaN(amt) || amt < 0) errs.push('Enter a valid flat price.');
      pricing = { type: 'flat', amount: amt };
    } else {
      const sizes = {};
      let ok = true;
      document.querySelectorAll('#svSizes [data-size]').forEach((inp) => {
        const v = parseFloat(inp.value);
        if (isNaN(v) || v < 0) ok = false;
        sizes[inp.getAttribute('data-size')] = v;
      });
      if (!ok) errs.push('Enter a price for every pet size.');
      pricing = { type: 'size', sizes: sizes };
    }
    if (errs.length) {
      $('svErr').innerHTML = '<div class="alert alert--err"><ul style="margin-left:1rem">' +
        errs.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul></div>';
      return;
    }
    const record = {
      name: name,
      tagline: $('svTagline').value.trim() || null,
      blurb: $('svBlurb').value.trim() || null,
      duration_min: parseInt($('svDuration').value, 10) || 60,
      icon: $('svIcon').value,
      pricing: pricing,
      popular: $('svPopular').checked,
      active: $('svActive').checked,
      sort_order: parseInt($('svSort').value, 10) || 100
    };
    const btn = $('svSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Saving…';
    let res;
    if (editingService && editingService.id) {
      res = await PP.sb.from('services').update(record).eq('id', editingService.id);
    } else {
      res = await PP.sb.from('services').insert(record);
    }
    if (res.error) {
      btn.disabled = false;
      btn.textContent = 'Save service';
      $('svErr').innerHTML = '<div class="alert alert--err">' +
        esc(res.error.message || 'Could not save.') + '</div>';
      return;
    }
    editingService = undefined;
    await loadAll();
    renderDashboard();
    PP.toast('Service saved');
  }

  async function deleteService(id) {
    const s = DB.services.find((x) => x.id === id);
    if (!confirm('Delete "' + (s ? s.name : 'this service') + '"? This cannot be undone.')) return;
    const { error } = await PP.sb.from('services').delete().eq('id', id);
    if (error) { PP.toast(error.message || 'Could not delete', 'err'); return; }
    await loadAll();
    renderDashboard();
    PP.toast('Service deleted');
  }

  /* ------------------------------- messages ------------------------------- */
  function renderMessages() {
    const rows = DB.messages;
    let body;
    if (!rows.length) body = '<p class="mini-note">No messages yet.</p>';
    else body = rows.map((m) =>
      '<div class="card" style="padding:1.1rem 1.3rem;margin-bottom:.8rem">' +
      '<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">' +
      '<strong>' + esc(m.name) + (m.subject ? ' — ' + esc(m.subject) : '') +
      (m.status === 'unread' ? ' <span class="tag tag--gold">New</span>' : '') + '</strong>' +
      '<span class="muted" style="font-size:.82rem">' + fmtStamp(m.created_at) + '</span></div>' +
      '<p style="margin:.4rem 0">' + esc(m.message) + '</p>' +
      '<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">' +
      '<span class="muted" style="font-size:.84rem">' + esc(m.email) +
      (m.phone ? ' · ' + esc(m.phone) : '') + '</span>' +
      (m.status === 'unread'
        ? '<button class="btn btn--ghost btn--sm" data-msg-read="' + m.id + '">Mark as read</button>'
        : '') + '</div></div>').join('');
    $('adminPanel').innerHTML = '<h3 style="margin-bottom:.8rem">Messages</h3>' + body;
    document.querySelectorAll('[data-msg-read]').forEach((b) =>
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-msg-read');
        const { error } = await PP.sb.from('messages').update({ status: 'read' }).eq('id', id);
        if (error) { PP.toast(error.message || 'Update failed', 'err'); return; }
        const row = DB.messages.find((m) => m.id === id);
        if (row) row.status = 'read';
        renderDashboard();
        PP.toast('Marked as read');
      }));
  }

  /* --------------------------------- root --------------------------------- */
  async function refresh() {
    await loadAll();
    renderDashboard();
  }

  async function render() {
    if (!PP.sbConfigured()) {
      $('adminRoot').innerHTML =
        '<div class="confirm-card" style="max-width:430px"><h2>Backend not connected</h2>' +
        '<p class="muted">Add your Supabase URL and anon key in ' +
        '<code>public/js/supabase-config.js</code>.</p></div>';
      return;
    }
    if (!PP.user) { renderLogin(); return; }
    if (!PP.isAdmin) { renderDenied(); return; }
    $('adminRoot').innerHTML = '<div class="skeleton" style="height:220px"></div>';
    await loadAll();
    renderDashboard();
  }

  document.addEventListener('pp:ready', render);
  document.addEventListener('auth:change', render);
})();
