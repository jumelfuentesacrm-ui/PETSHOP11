/* Booking flow (Supabase-backed) */
(function () {
  'use strict';

  const LABELS = ['Service', 'Pet', 'Date & time', 'Details'];
  let services = [];
  let petSizes = [];
  let closedDays = [0];
  let windowDays = 60;
  let PETS = [];

  const state = {
    step: 1,
    serviceId: null,
    petName: '', petType: 'dog', petBreed: '', petSize: null, notes: '',
    date: '', time: null,
    ownerName: '', phone: '', email: ''
  };

  const $ = (id) => document.getElementById(id);

  function service() {
    return services.find((s) => s.id === state.serviceId) || null;
  }
  function needsSize() {
    const s = service();
    return !!(s && s.pricing && s.pricing.type === 'size');
  }
  function price() {
    const s = service();
    if (!s || !s.pricing) return null;
    if (s.pricing.type === 'flat') return Number(s.pricing.amount);
    return state.petSize ? Number((s.pricing.sizes || {})[state.petSize]) : null;
  }
  function fmtTime(t) {
    if (!t) return '';
    let [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US',
      { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function isClosed(iso) {
    return closedDays.indexOf(new Date(iso + 'T12:00:00').getDay()) >= 0;
  }

  /* ------------------------------- rendering ------------------------------ */
  function renderProgress() {
    $('progress').innerHTML = LABELS.map((label, i) => {
      const n = i + 1;
      const cls = n === state.step ? 'active' : n < state.step ? 'done' : '';
      const bullet = n < state.step
        ? '<span style="display:flex;width:14px">' + PP.icons.check + '</span>' : n;
      return (i ? '<div class="progress__line"></div>' : '') +
        '<div class="progress__step ' + cls + '"><span class="bullet">' + bullet +
        '</span><span>' + label + '</span></div>';
    }).join('');
  }

  function renderServiceChoices() {
    $('serviceChoices').innerHTML = services.map((s) => {
      const p = PP.servicePrice(s);
      const tag = s.pricing && s.pricing.type === 'flat'
        ? PP.money(s.pricing.amount) : 'from ' + PP.money(p.min);
      const sel = s.id === state.serviceId ? ' selected' : '';
      return '<label class="choice' + sel + '" data-service="' + s.id + '">' +
        '<input type="radio" name="bk-service" value="' + s.id + '"' +
        (sel ? ' checked' : '') + '><span><strong>' + PP.escapeHTML(s.name) + ' · ' + tag +
        '</strong><small>' + PP.escapeHTML(s.tagline || '') + ' — about ' +
        (s.duration_min || 60) + ' min</small></span></label>';
    }).join('');
  }

  function renderSavedPets() {
    const host = $('savedPetWrap');
    if (!PP.user || !PETS.length) { host.innerHTML = ''; return; }
    host.innerHTML =
      '<div class="field"><label for="savedPet">Use a saved pet <span class="hint">optional</span></label>' +
      '<select id="savedPet"><option value="">— Enter a new pet —</option>' +
      PETS.map((p) => '<option value="' + p.id + '">' + PP.escapeHTML(p.name) +
        (p.breed ? ' (' + PP.escapeHTML(p.breed) + ')' : '') + '</option>').join('') +
      '</select></div>';
    $('savedPet').addEventListener('change', (e) => {
      const pet = PETS.find((p) => p.id === e.target.value);
      if (!pet) return;
      state.petName = pet.name || '';
      state.petType = ['dog', 'cat', 'other'].indexOf(pet.species) >= 0 ? pet.species : 'other';
      state.petBreed = pet.breed || '';
      state.petSize = pet.size || null;
      $('petName').value = state.petName;
      $('petType').value = state.petType;
      $('petBreed').value = state.petBreed;
      renderSizeField();
      renderSummary();
    });
  }

  function renderSizeField() {
    const host = $('sizeField');
    if (!needsSize()) { host.innerHTML = ''; state.petSize = null; return; }
    const s = service();
    host.innerHTML =
      '<div class="field"><label>Pet’s size <span class="hint">affects pricing</span></label>' +
      '<div class="pill-row" id="sizePills">' +
      petSizes.map((sz) =>
        '<button type="button" class="pill' + (state.petSize === sz.key ? ' selected' : '') +
        '" data-size="' + sz.key + '">' + PP.escapeHTML(sz.label) + '<small>' +
        PP.escapeHTML(sz.detail) + ' · ' + PP.money((s.pricing.sizes || {})[sz.key]) +
        '</small></button>').join('') + '</div></div>';
    $('sizePills').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-size]');
      if (!btn) return;
      state.petSize = btn.getAttribute('data-size');
      renderSizeField();
      renderSummary();
    });
  }

  function row(label, value, strong) {
    return '<div class="summary-row"><span>' + label + '</span><span' +
      (strong ? ' style="color:var(--ink)"' : '') + '>' + value + '</span></div>';
  }

  function renderSummary() {
    const s = service();
    const p = price();
    const dash = '<span style="color:var(--ink-faint)">—</span>';
    let priceText;
    if (!s) priceText = 'Select a service';
    else if (p == null) priceText = 'Choose a size';
    else priceText = PP.money(p);

    let rows = row('Service', s ? PP.escapeHTML(s.name) : dash) +
      row('Pet', state.petName
        ? PP.escapeHTML(state.petName) +
          ' <small style="color:var(--ink-faint)">(' + state.petType + ')</small>' : dash);
    if (needsSize()) rows += row('Size', state.petSize || dash);
    rows += row('Date', state.date ? fmtDate(state.date) : dash) +
      row('Time', state.time ? fmtTime(state.time) : dash) +
      row('Duration', s ? 'about ' + (s.duration_min || 60) + ' min' : dash);

    $('summary').innerHTML = '<h3>Booking summary</h3>' +
      '<p class="muted" style="font-size:.84rem;margin-bottom:.6rem">' +
      'Reserve now, pay at the salon after the groom.</p>' + rows +
      '<div class="summary-total"><span>Estimate</span><span>' + priceText + '</span></div>';
  }

  function renderReview() {
    const s = service();
    const p = price();
    const breed = state.petBreed ? ', ' + PP.escapeHTML(state.petBreed) : '';
    $('reviewBox').innerHTML = '<strong>Please review your appointment</strong><br>' +
      PP.escapeHTML(s ? s.name : '') + (state.petSize ? ' (' + state.petSize + ')' : '') +
      ' for <strong>' + PP.escapeHTML(state.petName) + '</strong> (' +
      PP.escapeHTML(state.petType) + breed + ')<br>' +
      fmtDate(state.date) + ' at ' + fmtTime(state.time) + '<br>' +
      'Estimated total: <strong>' + (p != null ? PP.money(p) : '—') +
      '</strong> — paid at the salon.';
  }

  /* --------------------------------- slots -------------------------------- */
  async function loadSlots() {
    const grid = $('slotGrid');
    const hint = $('slotHint');
    grid.innerHTML = '';
    state.time = null;
    renderSummary();

    if (!state.date) { hint.textContent = 'Choose a date to see available times.'; return; }
    if (isClosed(state.date)) {
      hint.textContent = 'We are closed on Sundays — please pick another date.';
      return;
    }
    if (!PP.sb) { hint.textContent = 'Connect Supabase to load availability.'; return; }

    hint.innerHTML = '<span class="spin"></span> Checking availability…';
    const { data, error } = await PP.sb.rpc('get_availability', { p_date: state.date });
    if (error || !data) { hint.textContent = 'Could not load times. Please try again.'; return; }

    const slots = data.map((r) => ({ time: r.slot, remaining: r.remaining }));
    const open = slots.filter((s) => s.remaining > 0).length;
    hint.textContent = open ? 'Select an available time:' : 'Sorry, no times remain on this date.';
    grid.innerHTML = slots.map((s) =>
      '<button type="button" class="pill" data-time="' + s.time + '"' +
      (s.remaining > 0 ? '' : ' disabled') + '>' + fmtTime(s.time) + '<small>' +
      (s.remaining > 0 ? s.remaining + ' open' : 'Full') + '</small></button>').join('');
    grid.querySelectorAll('[data-time]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        state.time = btn.getAttribute('data-time');
        grid.querySelectorAll('.pill').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        renderSummary();
      });
    });
  }

  /* ------------------------------ step control ---------------------------- */
  function showStep(n, noScroll) {
    state.step = Math.min(4, Math.max(1, n));
    document.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.toggle('active',
        Number(panel.getAttribute('data-step')) === state.step);
    });
    renderProgress();
    $('backBtn').style.visibility = state.step === 1 ? 'hidden' : 'visible';
    $('nextBtn').textContent = state.step === 4 ? 'Confirm booking' : 'Continue';
    if (state.step === 4) renderReview();
    showErrors([]);
    if (!noScroll) {
      window.scrollTo({ top: $('progress').offsetTop - 90, behavior: 'smooth' });
    }
  }

  function validateStep(n) {
    const e = [];
    if (n === 1 && !state.serviceId) e.push('Please choose a grooming service.');
    if (n === 2) {
      if (!state.petName.trim()) e.push('Please enter your pet’s name.');
      if (needsSize() && !state.petSize) e.push('Please choose your pet’s size.');
    }
    if (n === 3) {
      if (!state.date) e.push('Please choose an appointment date.');
      else if (isClosed(state.date)) e.push('We are closed on Sundays.');
      if (!state.time) e.push('Please choose an appointment time.');
    }
    if (n === 4) {
      if (!state.ownerName.trim()) e.push('Please enter your name.');
      if ((state.phone.match(/\d/g) || []).length < 7) e.push('Please enter a valid phone number.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.push('Please enter a valid email address.');
    }
    return e;
  }

  function showErrors(list) {
    const box = $('formErrors');
    if (!list || !list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="alert alert--err"><strong>Please check the following:</strong>' +
      '<ul>' + list.map((x) => '<li>' + PP.escapeHTML(x) + '</li>').join('') + '</ul></div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function confirmBooking() {
    let allErrors = [];
    for (let n = 1; n <= 4; n++) allErrors = allErrors.concat(validateStep(n));
    if (allErrors.length) return showErrors(allErrors);
    if (!PP.requireSb()) return;

    const btn = $('nextBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Booking…';

    const { data, error } = await PP.sb.rpc('create_booking', {
      p_service_id: state.serviceId,
      p_date: state.date,
      p_time: state.time,
      p_pet_name: state.petName,
      p_pet_type: state.petType,
      p_pet_breed: state.petBreed,
      p_pet_size: state.petSize,
      p_notes: state.notes,
      p_owner_name: state.ownerName,
      p_phone: state.phone,
      p_email: state.email
    });

    btn.disabled = false;
    btn.textContent = 'Confirm booking';

    if (error) {
      showErrors([error.message || 'Something went wrong. Please try again.']);
      if (state.date) loadSlots();
      return;
    }
    showConfirmation(Array.isArray(data) ? data[0] : data);
  }

  function showConfirmation(b) {
    $('bookingWrap').hidden = true;
    const wrap = $('confirmWrap');
    wrap.hidden = false;
    wrap.innerHTML = '<div class="confirm-card"><div class="check">' + PP.icons.check +
      '</div><h2>Appointment requested!</h2>' +
      '<p class="muted">Thanks, ' + PP.escapeHTML(b.owner_name) +
      '. We’ve reserved this time for ' + PP.escapeHTML(b.pet_name) +
      ' and will confirm shortly by phone or email.</p>' +
      '<div class="confirm-code">' + PP.escapeHTML(b.code) + '</div>' +
      '<div style="text-align:left;max-width:340px;margin:0 auto">' +
      row('Service', PP.escapeHTML(b.service_name)) +
      row('When', fmtDate(b.date) + ' · ' + fmtTime(b.time)) +
      row('Pet', PP.escapeHTML(b.pet_name) + (b.pet_size ? ' (' + b.pet_size + ')' : '')) +
      row('Estimate', PP.money(b.price)) + '</div>' +
      '<div class="hero__cta" style="justify-content:center;margin-top:1.4rem">' +
      (PP.user ? '<a class="btn btn--dark" href="/account">View my bookings</a>'
               : '<a class="btn btn--dark" href="/shop">Shop while you wait</a>') +
      '<a class="btn btn--ghost" href="/">Back to home</a></div></div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    PP.toast('Booking ' + b.code + ' requested');
  }

  /* --------------------------------- init --------------------------------- */
  async function init() {
    petSizes = PP.APP.petSizes;
    closedDays = PP.APP.booking.closedDays;
    windowDays = PP.APP.booking.windowDays;

    const dateInput = $('dateInput');
    const iso = (d) => d.toISOString().slice(0, 10);
    dateInput.min = iso(new Date());
    dateInput.max = iso(new Date(Date.now() + windowDays * 86400000));

    // prefill contact details for signed-in customers
    if (PP.user) {
      state.ownerName = (PP.profile && PP.profile.full_name) || '';
      state.email = PP.user.email || '';
      state.phone = (PP.profile && PP.profile.phone) || '';
      $('ownerName').value = state.ownerName;
      $('phone').value = state.phone;
      $('email').value = state.email;
    }

    // load services
    if (PP.sb) {
      const sv = await PP.sb.from('services').select('*').eq('active', true).order('sort_order');
      if (sv.data) services = sv.data;
      if (PP.user) {
        const pt = await PP.sb.from('pets').select('*').eq('owner_id', PP.user.id).order('name');
        if (pt.data) PETS = pt.data;
      }
    }
    if (!services.length) {
      $('serviceChoices').innerHTML =
        '<p class="muted">Services are unavailable. Connect Supabase and seed the database.</p>';
    }

    const wanted = new URLSearchParams(location.search).get('service');
    if (wanted && services.some((s) => s.id === wanted)) state.serviceId = wanted;

    renderServiceChoices();
    renderSavedPets();
    renderSizeField();
    renderSummary();
    showStep(1, true);

    $('serviceChoices').addEventListener('change', (e) => {
      if (e.target.name !== 'bk-service') return;
      state.serviceId = e.target.value;
      document.querySelectorAll('#serviceChoices .choice').forEach((c) =>
        c.classList.toggle('selected', c.getAttribute('data-service') === state.serviceId));
      renderSizeField();
      renderSummary();
    });
    $('petName').addEventListener('input', (e) => { state.petName = e.target.value; renderSummary(); });
    $('petType').addEventListener('change', (e) => { state.petType = e.target.value; renderSummary(); });
    $('petBreed').addEventListener('input', (e) => (state.petBreed = e.target.value));
    $('notes').addEventListener('input', (e) => (state.notes = e.target.value));
    $('dateInput').addEventListener('change', (e) => { state.date = e.target.value; loadSlots(); });
    $('ownerName').addEventListener('input', (e) => (state.ownerName = e.target.value));
    $('phone').addEventListener('input', (e) => (state.phone = e.target.value));
    $('email').addEventListener('input', (e) => (state.email = e.target.value));

    $('backBtn').addEventListener('click', () => showStep(state.step - 1));
    $('nextBtn').addEventListener('click', () => {
      if (state.step === 4) return confirmBooking();
      const errs = validateStep(state.step);
      if (errs.length) return showErrors(errs);
      showStep(state.step + 1);
    });
  }

  document.addEventListener('pp:ready', init);
})();
