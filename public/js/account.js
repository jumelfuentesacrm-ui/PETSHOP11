/* Customer account: auth, profile, pets, bookings & orders */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let authTab = 'login';
  let tab = 'profile';
  let editingPet = undefined; // undefined = closed, null = new, object = editing
  let PETS = [], BOOKINGS = [], ORDERS = [];

  /* -------------------------------- helpers ------------------------------- */
  function fmtDay(iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US',
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtStamp(iso) {
    return new Date(iso).toLocaleDateString('en-US',
      { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(t) {
    let [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function pill(status) {
    return '<span class="status-pill status-' + PP.escapeHTML(status) + '">' +
      PP.escapeHTML(status) + '</span>';
  }
  function options(values, selected) {
    return values.map((v) => {
      const val = typeof v === 'object' ? v.value : v;
      const label = typeof v === 'object' ? v.label : v;
      return '<option value="' + PP.escapeHTML(val) + '"' +
        (val === selected ? ' selected' : '') + '>' + PP.escapeHTML(label) + '</option>';
    }).join('');
  }
  function errBox(id, list) {
    const box = $(id);
    if (!box) return;
    box.innerHTML = list && list.length
      ? '<div class="alert alert--err"><ul style="margin-left:1rem">' +
        list.map((x) => '<li>' + PP.escapeHTML(x) + '</li>').join('') + '</ul></div>' : '';
  }

  /* ------------------------------ logged out ------------------------------ */
  function renderAuth() {
    $('acctTitle').textContent = 'Welcome back';
    $('acctIntro').textContent =
      'Log in or create an account to save your pets and review your history.';
    $('accountRoot').innerHTML =
      '<div class="card" style="max-width:460px;margin:0 auto;padding:2rem">' +
      '<div class="auth-tabs">' +
      '<button data-atab="login" class="' + (authTab === 'login' ? 'active' : '') + '">Log in</button>' +
      '<button data-atab="signup" class="' + (authTab === 'signup' ? 'active' : '') + '">Sign up</button>' +
      '</div><div id="authBody"></div></div>';
    document.querySelectorAll('[data-atab]').forEach((b) =>
      b.addEventListener('click', () => { authTab = b.getAttribute('data-atab'); renderAuth(); }));
    renderAuthBody();
  }

  function renderAuthBody() {
    const body = $('authBody');
    if (authTab === 'login') {
      body.innerHTML =
        '<div class="field"><label for="liEmail">Email</label>' +
        '<input id="liEmail" type="email" autocomplete="email"></div>' +
        '<div class="field"><label for="liPass">Password</label>' +
        '<input id="liPass" type="password" autocomplete="current-password"></div>' +
        '<div id="authErr"></div>' +
        '<button class="btn btn--primary btn--block" id="liBtn">Log in</button>';
      $('liBtn').addEventListener('click', doLogin);
      $('liPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    } else {
      body.innerHTML =
        '<div class="field"><label for="suName">Full name</label>' +
        '<input id="suName" type="text" autocomplete="name"></div>' +
        '<div class="field"><label for="suEmail">Email</label>' +
        '<input id="suEmail" type="email" autocomplete="email"></div>' +
        '<div class="field"><label for="suPass">Password</label>' +
        '<input id="suPass" type="password" placeholder="At least 6 characters" ' +
        'autocomplete="new-password"></div>' +
        '<div id="authErr"></div>' +
        '<button class="btn btn--primary btn--block" id="suBtn">Create account</button>';
      $('suBtn').addEventListener('click', doSignup);
    }
  }

  async function doLogin() {
    errBox('authErr', []);
    const email = $('liEmail').value.trim();
    const password = $('liPass').value;
    if (!email || !password) return errBox('authErr', ['Enter your email and password.']);
    if (!PP.requireSb()) return;
    const btn = $('liBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Logging in…';
    const { error } = await PP.sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    btn.textContent = 'Log in';
    if (error) return errBox('authErr', [error.message || 'Could not log in.']);
    PP.toast('Welcome back!');
    // auth:change will trigger a re-render
  }

  async function doSignup() {
    errBox('authErr', []);
    const full_name = $('suName').value.trim();
    const email = $('suEmail').value.trim();
    const password = $('suPass').value;
    const errs = [];
    if (!full_name) errs.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Enter a valid email address.');
    if (password.length < 6) errs.push('Password must be at least 6 characters.');
    if (errs.length) return errBox('authErr', errs);
    if (!PP.requireSb()) return;

    const btn = $('suBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Creating account…';
    const { data, error } = await PP.sb.auth.signUp({
      email, password, options: { data: { full_name } }
    });
    btn.disabled = false;
    btn.textContent = 'Create account';
    if (error) return errBox('authErr', [error.message || 'Could not create the account.']);

    if (data.session) {
      PP.toast('Account created — welcome!');
    } else {
      $('authBody').innerHTML =
        '<div class="empty-state" style="padding:1.5rem 0">' +
        '<div style="width:60px;margin:0 auto .6rem;color:var(--green)">' + PP.icons.mail +
        '</div><h3>Almost there!</h3>' +
        '<p class="muted">We sent a confirmation link to <strong>' + PP.escapeHTML(email) +
        '</strong>. Click it, then come back and log in.</p></div>';
    }
  }

  /* ------------------------------ logged in ------------------------------- */
  async function loadAll() {
    const uid = PP.user.id;
    const [pets, bookings, orders] = await Promise.all([
      PP.sb.from('pets').select('*').eq('owner_id', uid).order('created_at'),
      PP.sb.from('bookings').select('*').order('date', { ascending: false }),
      PP.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
    ]);
    PETS = pets.data || [];
    BOOKINGS = bookings.data || [];
    ORDERS = orders.data || [];
  }

  function renderDashboard() {
    const first = (PP.profile && PP.profile.full_name) || PP.user.email;
    $('acctTitle').textContent = 'Hello, ' + first.split(/[ @]/)[0];
    $('acctIntro').textContent = 'Manage your details, pets and history.';
    const navItems = [
      ['profile', 'Profile'], ['pets', 'My pets'],
      ['bookings', 'My bookings'], ['orders', 'My orders']
    ];
    $('accountRoot').innerHTML =
      '<div class="acct-grid"><div>' +
      '<div class="acct-nav">' + navItems.map(([k, label]) =>
        '<button data-tab="' + k + '" class="' + (tab === k ? 'active' : '') + '">' +
        label + '</button>').join('') + '</div>' +
      '<button class="btn btn--ghost btn--sm btn--block" id="logoutBtn" style="margin-top:1rem">' +
      '<span style="display:flex;width:16px">' + PP.icons.logout + '</span>Sign out</button>' +
      '</div><div class="card" style="padding:1.6rem" id="acctPanel"></div></div>';

    document.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        tab = b.getAttribute('data-tab');
        editingPet = undefined;
        renderDashboard();
      }));
    $('logoutBtn').addEventListener('click', async () => {
      await PP.signOut();
      tab = 'profile';
      render();
      PP.toast('Signed out');
    });
    renderPanel();
  }

  function renderPanel() {
    if (tab === 'profile') return renderProfile();
    if (tab === 'pets') return renderPets();
    if (tab === 'bookings') return renderBookings();
    if (tab === 'orders') return renderOrders();
  }

  /* -- profile -- */
  function renderProfile() {
    const p = PP.profile || {};
    $('acctPanel').innerHTML =
      '<h2 style="font-size:1.4rem;margin-bottom:1rem">Your details</h2>' +
      '<div class="field"><label for="pfName">Full name</label>' +
      '<input id="pfName" type="text" value="' + PP.escapeHTML(p.full_name || '') + '"></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="pfPhone">Phone</label>' +
      '<input id="pfPhone" type="tel" value="' + PP.escapeHTML(p.phone || '') + '"></div>' +
      '<div class="field"><label>Email</label>' +
      '<input type="email" value="' + PP.escapeHTML(PP.user.email || '') +
      '" disabled style="opacity:.7"></div></div>' +
      '<div class="field"><label for="pfAddress">Address</label>' +
      '<input id="pfAddress" type="text" placeholder="Street, city, ZIP" value="' +
      PP.escapeHTML(p.address || '') + '"></div>' +
      '<div id="pfMsg"></div>' +
      '<button class="btn btn--primary" id="pfSave">Save changes</button>';
    $('pfSave').addEventListener('click', saveProfile);
  }

  async function saveProfile() {
    const btn = $('pfSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Saving…';
    const patch = {
      full_name: $('pfName').value.trim(),
      phone: $('pfPhone').value.trim() || null,
      address: $('pfAddress').value.trim() || null
    };
    const { error } = await PP.sb.from('profiles').update(patch).eq('id', PP.user.id);
    btn.disabled = false;
    btn.textContent = 'Save changes';
    if (error) return errBox('pfMsg', [error.message || 'Could not save.']);
    await PP.loadProfile();
    PP.toast('Profile saved');
    errBox('pfMsg', []);
  }

  /* -- pets -- */
  function renderPets() {
    const formHtml = editingPet !== undefined ? petFormHTML(editingPet) : '';
    let list;
    if (!PETS.length) {
      list = '<p class="mini-note">No pets saved yet. Add one to speed up booking.</p>';
    } else {
      list = PETS.map((p) =>
        '<div class="list-row"><div><div class="list-row__title">' + PP.escapeHTML(p.name) +
        '</div><div class="list-row__meta">' + PP.escapeHTML(p.species || 'pet') +
        (p.breed ? ' · ' + PP.escapeHTML(p.breed) : '') +
        (p.size ? ' · ' + PP.escapeHTML(p.size) : '') + '</div></div>' +
        '<div class="row-actions">' +
        '<button class="icon-btn" data-pet-edit="' + p.id + '" aria-label="Edit">' + PP.icons.edit + '</button>' +
        '<button class="icon-btn icon-btn--danger" data-pet-del="' + p.id + '" aria-label="Delete">' +
        PP.icons.trash + '</button></div></div>').join('');
    }
    $('acctPanel').innerHTML =
      '<div class="admin-bar"><h2 style="font-size:1.4rem">My pets</h2>' +
      (editingPet === undefined
        ? '<button class="btn btn--dark btn--sm" id="petAdd">+ Add a pet</button>' : '') +
      '</div>' + formHtml + list;

    if ($('petAdd')) $('petAdd').addEventListener('click', () => { editingPet = null; renderPets(); });
    wirePetForm();
    document.querySelectorAll('[data-pet-edit]').forEach((b) =>
      b.addEventListener('click', () => {
        editingPet = PETS.find((p) => p.id === b.getAttribute('data-pet-edit'));
        renderPets();
      }));
    document.querySelectorAll('[data-pet-del]').forEach((b) =>
      b.addEventListener('click', () => deletePet(b.getAttribute('data-pet-del'))));
  }

  function petFormHTML(pet) {
    pet = pet || {};
    return '<div class="admin-form"><h3 style="margin-bottom:.8rem">' +
      (pet.id ? 'Edit pet' : 'Add a pet') + '</h3>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ptName">Pet name</label>' +
      '<input id="ptName" type="text" value="' + PP.escapeHTML(pet.name || '') + '" maxlength="40"></div>' +
      '<div class="field"><label for="ptSpecies">Species</label><select id="ptSpecies">' +
      options([{ value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' },
        { value: 'other', label: 'Other' }], pet.species || 'dog') + '</select></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ptBreed">Breed</label>' +
      '<input id="ptBreed" type="text" value="' + PP.escapeHTML(pet.breed || '') + '" maxlength="50"></div>' +
      '<div class="field"><label for="ptSize">Size</label><select id="ptSize">' +
      options([{ value: '', label: '—' }, 'Small', 'Medium', 'Large', 'X-Large'],
        pet.size || '') + '</select></div></div>' +
      '<div class="field"><label for="ptNotes">Notes</label>' +
      '<textarea id="ptNotes" maxlength="400">' + PP.escapeHTML(pet.notes || '') + '</textarea></div>' +
      '<div id="ptErr"></div>' +
      '<div style="display:flex;gap:.6rem">' +
      '<button class="btn btn--primary btn--sm" id="ptSave">Save pet</button>' +
      '<button class="btn btn--ghost btn--sm" id="ptCancel">Cancel</button></div></div>';
  }

  function wirePetForm() {
    if (!$('ptSave')) return;
    $('ptCancel').addEventListener('click', () => { editingPet = undefined; renderPets(); });
    $('ptSave').addEventListener('click', savePet);
  }

  async function savePet() {
    const name = $('ptName').value.trim();
    if (!name) return errBox('ptErr', ['Please enter a pet name.']);
    const record = {
      name: name,
      species: $('ptSpecies').value,
      breed: $('ptBreed').value.trim() || null,
      size: $('ptSize').value || null,
      notes: $('ptNotes').value.trim() || null
    };
    const btn = $('ptSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Saving…';
    let res;
    if (editingPet && editingPet.id) {
      res = await PP.sb.from('pets').update(record).eq('id', editingPet.id);
    } else {
      record.owner_id = PP.user.id;
      res = await PP.sb.from('pets').insert(record);
    }
    if (res.error) {
      btn.disabled = false;
      btn.textContent = 'Save pet';
      return errBox('ptErr', [res.error.message || 'Could not save the pet.']);
    }
    editingPet = undefined;
    await loadAll();
    renderPets();
    PP.toast('Pet saved');
  }

  async function deletePet(id) {
    const pet = PETS.find((p) => p.id === id);
    if (!confirm('Remove ' + (pet ? pet.name : 'this pet') + ' from your account?')) return;
    const { error } = await PP.sb.from('pets').delete().eq('id', id);
    if (error) return PP.toast(error.message || 'Could not delete', 'err');
    await loadAll();
    renderPets();
    PP.toast('Pet removed');
  }

  /* -- bookings -- */
  function renderBookings() {
    let body;
    if (!BOOKINGS.length) {
      body = '<p class="mini-note">No appointments yet. ' +
        '<a href="/book" style="color:var(--gold-deep);font-weight:800">Book your first groom →</a></p>';
    } else {
      body = BOOKINGS.map((b) =>
        '<div class="list-row"><div>' +
        '<div class="list-row__title">' + PP.escapeHTML(b.service_name) +
        ' · ' + PP.escapeHTML(b.code) + '</div>' +
        '<div class="list-row__meta">' + fmtDay(b.date) + ' at ' + fmtTime(b.time) +
        ' · ' + PP.escapeHTML(b.pet_name) +
        (b.pet_size ? ' (' + PP.escapeHTML(b.pet_size) + ')' : '') + '</div></div>' +
        '<div style="text-align:right">' + pill(b.status) +
        '<div style="font-weight:800;margin-top:.3rem">' + PP.money(b.price) + '</div>' +
        '</div></div>').join('');
    }
    $('acctPanel').innerHTML =
      '<h2 style="font-size:1.4rem;margin-bottom:1rem">My bookings</h2>' + body;
  }

  /* -- orders -- */
  function renderOrders() {
    let body;
    if (!ORDERS.length) {
      body = '<p class="mini-note">No orders yet. ' +
        '<a href="/shop" style="color:var(--gold-deep);font-weight:800">Visit the shop →</a></p>';
    } else {
      body = ORDERS.map((o) => {
        const items = (o.order_items || [])
          .map((i) => i.qty + '× ' + PP.escapeHTML(i.name)).join(', ');
        return '<div class="list-row"><div>' +
          '<div class="list-row__title">' + PP.escapeHTML(o.code) + '</div>' +
          '<div class="list-row__meta">' + fmtStamp(o.created_at) + ' · ' +
          (o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup') +
          (items ? ' · ' + items : '') + '</div></div>' +
          '<div style="text-align:right">' + pill(o.status) +
          '<div style="font-weight:800;margin-top:.3rem">' + PP.money(o.total) + '</div>' +
          '</div></div>';
      }).join('');
    }
    $('acctPanel').innerHTML =
      '<h2 style="font-size:1.4rem;margin-bottom:1rem">My orders</h2>' + body;
  }

  /* --------------------------------- root --------------------------------- */
  async function render() {
    if (!PP.sbConfigured()) {
      $('accountRoot').innerHTML =
        '<div class="card" style="padding:2rem;text-align:center">' +
        '<h2>Backend not connected</h2><p class="muted">Add your Supabase project URL ' +
        'and anon key in <code>public/js/supabase-config.js</code>.</p></div>';
      return;
    }
    if (PP.user) {
      $('accountRoot').innerHTML = '<div class="skeleton" style="height:240px"></div>';
      await loadAll();
      renderDashboard();
    } else {
      renderAuth();
    }
  }

  document.addEventListener('pp:ready', render);
  document.addEventListener('auth:change', render);
})();
