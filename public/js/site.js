/* =========================================================================
   Posh Pet — shared site script
   Supabase client, app config, chrome (header/footer), auth, cart, helpers.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- app config ----------------------------- */
  const APP = {
    business: {
      name: 'Posh Pet',
      legalName: 'Posh Pet Store & Grooming',
      address: { full: '359 Ave. Hostos, San Juan, PR 00918' },
      phone: '787-923-0482',
      phoneHref: '+17879230482',
      email: 'poshpet@ymail.com',
      social: {
        instagram: 'https://www.instagram.com/posh_pet_store_and_grooming_/',
        facebook: 'https://www.facebook.com/poshpetpuertorico/'
      },
      mapLink: 'https://www.google.com/maps/place/Posh+Pet+Store+%26+grooming/@18.4210691,-66.063579,17z/',
      mapEmbed: 'https://maps.google.com/maps?q=18.4210691,-66.063579&z=16&hl=en&output=embed',
      hours: [
        { day: 'Monday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Tuesday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Wednesday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Thursday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Friday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Saturday', open: '8:00 AM', close: '6:00 PM' },
        { day: 'Sunday', open: null, close: null }
      ]
    },
    booking: {
      slots: ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'],
      closedDays: [0],
      windowDays: 60
    },
    store: { deliveryFee: 7, freeDeliveryOver: 60, taxRate: 0.115 },
    petSizes: [
      { key: 'Small', label: 'Small', detail: 'Up to 20 lb' },
      { key: 'Medium', label: 'Medium', detail: '21 - 50 lb' },
      { key: 'Large', label: 'Large', detail: '51 - 90 lb' },
      { key: 'X-Large', label: 'X-Large', detail: 'Over 90 lb' }
    ],
    serviceIcons: ['scissors', 'bath', 'puppy', 'cat', 'brush', 'paw', 'sparkle']
  };

  /* ------------------------------- icons --------------------------------- */
  const I = {
    paw: '<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><ellipse cx="32" cy="42" rx="15" ry="13"/><ellipse cx="14" cy="28" rx="7" ry="9"/><ellipse cx="50" cy="28" rx="7" ry="9"/><ellipse cx="24" cy="16" rx="6.5" ry="8"/><ellipse cx="40" cy="16" rx="6.5" ry="8"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9.5" cy="20.5" r="1.5"/><circle cx="17.5" cy="20.5" r="1.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 21 19M8.1 15.9 21 5M12 12l-3.9 3"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z"/><path d="M6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2"/><path d="M5 21l1-2M19 21l-1-2"/></svg>',
    puppy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5 7 3v6M14 5l3-2v6"/><path d="M5 12a7 7 0 0 1 14 0v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M9.5 12h.01M14.5 12h.01M12 15v1"/></svg>',
    cat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v6M9 5 5 3 5 9M19 3v6M15 5l4-2v6"/><path d="M4 13a8 8 0 0 1 16 0v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M9 13h.01M15 13h.01M12 16l-1.5 1M12 16l1.5 1"/></svg>',
    brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="8" rx="3"/><path d="M9 11v4M12 11v5M15 11v4M7.5 11v3M16.5 11v3"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    bowl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8Z"/><path d="M8 11c0-3 1.5-5 4-5s4 2 4 5"/></svg>',
    bone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>',
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M4 9c4 2 12 2 16 0M4 15c4-2 12-2 16 0M9 3.5c-2 5-2 12 0 17M15 3.5c2 5 2 12 0 17"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4"/><path d="M3 17h18M5 10V8a2 2 0 0 1 2-2h2M19 10V8a2 2 0 0 0-2-2h-2"/></svg>',
    fish: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12c3-5 9-6 13-4 2 1 4 2.5 5 4-1 1.5-3 3-5 4-4 2-10 1-13-4Z"/><path d="M16 8l4-3v14l-4-3M8 11h.01"/></svg>',
    spray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="8" height="12" rx="2"/><path d="M9 9V5h4v4M13 5h3M13 3h3M18 6h2M19 9h2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-11"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.6 5.6L21 9.3l-4.5 4.3L17.6 21 12 17.8 6.4 21l1.1-7.4L3 9.3l6.4-.7Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16Z"/><path d="M4 20C8 14 12 11 18 8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="M14 6l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V5h-3c-2.8 0-5 2.2-5 5v2H6v4h3v7h4v-7h3l1-4h-4v-2c0-.6.4-1 1-1Z"/></svg>'
  };

  const CAT_MEDIA = {
    'Dog Food': { c: '#c8a35b', bg: 'linear-gradient(150deg,#f4e7d7,#ecdcb8)', icon: 'bag' },
    'Cat Food': { c: '#2f6f6a', bg: 'linear-gradient(150deg,#dcebe9,#cfe3e0)', icon: 'bowl' },
    Treats: { c: '#b2566b', bg: 'linear-gradient(150deg,#f3dde2,#ecd0d8)', icon: 'bone' },
    Toys: { c: '#a9863f', bg: 'linear-gradient(150deg,#f6ecd3,#f0e0bd)', icon: 'ball' },
    'Beds & Accessories': { c: '#54607a', bg: 'linear-gradient(150deg,#e4e6ee,#d7dae6)', icon: 'bed' },
    Grooming: { c: '#2f7d5b', bg: 'linear-gradient(150deg,#dcebe1,#cde4d4)', icon: 'spray' },
    'Small Pets & Aquatics': { c: '#3f6f9c', bg: 'linear-gradient(150deg,#dce7f0,#cfe0ee)', icon: 'fish' }
  };
  function catMedia(category) {
    return CAT_MEDIA[category] || { c: '#a9863f', bg: 'linear-gradient(150deg,#f6ecd3,#f0e0bd)', icon: 'bag' };
  }

  /* ------------------------------ helpers -------------------------------- */
  const money = (n) => '$' + Number(n || 0).toFixed(2);

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escapeHTML(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function stars(rating) {
    const full = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '<span class="stars" title="' + (rating || 0) + ' out of 5">' +
      '★★★★★'.slice(0, full) +
      '<span style="opacity:.28">' + '★★★★★'.slice(0, 5 - full) + '</span></span>';
  }

  /* ----------------------------- supabase -------------------------------- */
  let sb = null;
  function sbConfigured() {
    return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
      window.SUPABASE_URL.indexOf('YOUR-') === -1 &&
      window.SUPABASE_ANON_KEY.indexOf('YOUR-') === -1);
  }
  if (sbConfigured() && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
  function requireSb() {
    if (!sb) {
      toast('Backend not connected — add your Supabase keys.', 'err');
      return false;
    }
    return true;
  }

  /* ------------------------------- toast --------------------------------- */
  function toast(msg, type) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = el('div', 'toast-stack');
      document.body.appendChild(stack);
    }
    const t = el('div', 'toast toast--' + (type === 'err' ? 'err' : 'ok'));
    t.innerHTML = '<span style="display:flex;width:18px">' +
      (type === 'err' ? I.heart : I.check) + '</span><span>' + escapeHTML(msg) + '</span>';
    stack.appendChild(t);
    setTimeout(() => {
      t.style.cssText += 'opacity:0;transform:translateX(30px);transition:all .25s ease';
      setTimeout(() => t.remove(), 280);
    }, 3400);
  }

  /* -------------------------------- cart --------------------------------- */
  const CART_KEY = 'poshpet_cart_v1';
  const cart = {
    get() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch (e) { return []; }
    },
    save(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      document.dispatchEvent(new CustomEvent('cart:change'));
    },
    count() { return this.get().reduce((s, i) => s + i.qty, 0); },
    qtyOf(id) { const r = this.get().find((i) => i.id === id); return r ? r.qty : 0; },
    add(id, qty) {
      qty = qty || 1;
      const items = this.get();
      const r = items.find((i) => i.id === id);
      if (r) r.qty += qty; else items.push({ id: id, qty: qty });
      this.save(items);
    },
    setQty(id, qty) {
      let items = this.get();
      if (qty <= 0) items = items.filter((i) => i.id !== id);
      else { const r = items.find((i) => i.id === id); if (r) r.qty = qty; }
      this.save(items);
    },
    remove(id) { this.save(this.get().filter((i) => i.id !== id)); },
    clear() { this.save([]); }
  };
  function refreshCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const n = cart.count();
    badge.textContent = n;
    badge.classList.toggle('show', n > 0);
  }

  /* ------------------------------- cards --------------------------------- */
  function productMedia(category) {
    const m = catMedia(category);
    return '<div class="product__media" style="background:' + m.bg + ';color:' + m.c +
      '">' + I[m.icon] + '</div>';
  }
  function productCardHTML(p) {
    const out = p.stock <= 0;
    let badge = '';
    if (p.badge) {
      const danger = /stock|soon/i.test(p.badge);
      badge = '<span class="product__badge tag ' + (danger ? 'tag--berry' : 'tag--gold') +
        '">' + escapeHTML(p.badge) + '</span>';
    } else if (p.featured) {
      badge = '<span class="product__badge tag tag--teal">Featured</span>';
    }
    const lowNote = !out && p.stock <= 5
      ? '<span class="product__brand" style="color:var(--berry)">Only ' + p.stock + ' left</span>'
      : '';
    const action = out
      ? '<span class="product__soldout">Sold out</span>'
      : '<button class="btn btn--dark btn--sm" data-add="' + escapeHTML(p.id) +
        '"><span style="display:flex;width:16px">' + I.cart + '</span>Add</button>';
    return '<article class="product" data-id="' + escapeHTML(p.id) + '"' +
      (out ? ' style="opacity:.72"' : '') + '>' + productMedia(p.category) + badge +
      '<div class="product__body"><span class="product__cat">' + escapeHTML(p.category) +
      '</span><h3 class="product__name">' + escapeHTML(p.name) + '</h3>' +
      '<span class="product__brand">' + escapeHTML(p.brand || '') + '</span> ' + stars(p.rating) +
      '<p class="product__blurb">' + escapeHTML(p.blurb || '') + '</p>' + lowNote +
      '<div class="product__foot"><span class="product__price">' + money(p.price) + '</span>' +
      action + '</div></div></article>';
  }
  function servicePrice(s) {
    const pr = s.pricing || {};
    if (pr.type === 'flat') return { label: money(pr.amount), min: Number(pr.amount) };
    const vals = Object.values(pr.sizes || {}).map(Number);
    const min = vals.length ? Math.min.apply(null, vals) : 0;
    return { label: 'From ' + money(min), min: min };
  }
  function serviceCardHTML(s) {
    return '<article class="service-card"><div class="service-card__icon">' +
      (I[s.icon] || I.paw) + '</div>' +
      (s.popular ? '<span class="tag tag--gold" style="align-self:flex-start;margin-bottom:.6rem">Most popular</span>' : '') +
      '<h3>' + escapeHTML(s.name) + '</h3>' +
      '<span class="muted" style="font-weight:700;font-size:.88rem">' + escapeHTML(s.tagline || '') + '</span>' +
      '<p>' + escapeHTML(s.blurb || '') + '</p>' +
      '<div class="service-card__foot"><span class="price-tag">' + servicePrice(s).label +
      '<small>' + (s.duration_min || 60) + ' min appointment</small></span>' +
      '<a class="btn btn--ghost btn--sm" href="/book?service=' + encodeURIComponent(s.id) +
      '">Book</a></div></article>';
  }

  /* ------------------------------- chrome -------------------------------- */
  function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const path = location.pathname.replace(/\.html$/, '') || '/';
    const links = [['/', 'Home'], ['/services', 'Grooming'], ['/shop', 'Shop'],
      ['/book', 'Book'], ['/contact', 'Contact']];
    const navItems = links.map(([href, label]) => {
      const active = href === path || (href !== '/' && path.indexOf(href) === 0);
      return '<li><a href="' + href + '"' + (active ? ' aria-current="page"' : '') +
        '>' + label + '</a></li>';
    }).join('');

    let acct;
    if (PP.user) {
      const first = (PP.profile && PP.profile.full_name ? PP.profile.full_name : PP.user.email)
        .split(/[ @]/)[0];
      acct = '<a class="acct-link" href="/account" title="Your account">' +
        '<span style="display:flex;width:18px">' + I.user + '</span>' +
        '<span class="acct-name">' + escapeHTML(first) + '</span></a>';
    } else {
      acct = '<a class="acct-link" href="/account" title="Log in">' +
        '<span style="display:flex;width:18px">' + I.user + '</span>' +
        '<span class="acct-name">Log in</span></a>';
    }

    host.className = 'site-header';
    host.innerHTML = '<div class="container nav">' +
      '<a class="brand" href="/" aria-label="Posh Pet home">' +
      '<span class="brand__mark" style="color:var(--gold-deep)">' + I.paw + '</span>' +
      '<span><span class="brand__name">Posh Pet</span>' +
      '<span class="brand__sub">Store &amp; Grooming</span></span></a>' +
      '<ul class="nav__links" id="navLinks">' + navItems +
      '<li class="nav__mobileacct"><a href="/account">Account</a></li></ul>' +
      '<div class="nav__actions">' + acct +
      '<a class="cart-link" href="/cart" aria-label="View cart">' + I.cart +
      '<span class="cart-badge" id="cartBadge">0</span></a>' +
      '<a class="btn btn--primary btn--sm" href="/book">Book grooming</a>' +
      '<button class="nav__toggle" id="navToggle" aria-label="Menu">' +
      '<span></span><span></span><span></span></button></div></div>';

    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('open');
    });
    refreshCartBadge();
  }

  function buildFooter() {
    const host = document.getElementById('site-footer');
    if (!host) return;
    const b = APP.business;
    host.className = 'site-footer';
    host.innerHTML = '<div class="container"><div class="footer-grid">' +
      '<div class="footer-brand"><div class="brand">' +
      '<span class="brand__mark" style="color:var(--gold)">' + I.paw + '</span>' +
      '<span class="brand__name">Posh Pet</span></div>' +
      '<p>A full-service pet store and grooming salon caring for the dogs and cats ' +
      'of San Juan for over 20 years.</p><div class="social-row">' +
      '<a href="' + b.social.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + I.instagram + '</a>' +
      '<a href="' + b.social.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + I.facebook + '</a>' +
      '</div></div>' +
      '<div><h4>Explore</h4><a href="/services">Grooming services</a>' +
      '<a href="/shop">Shop products</a><a href="/book">Book an appointment</a>' +
      '<a href="/account">My account</a><a href="/contact">Visit us</a></div>' +
      '<div><h4>Grooming</h4><a href="/book">Full Groom</a><a href="/book">Bath &amp; Tidy</a>' +
      '<a href="/book">Feline Groom</a><a href="/book">Nail &amp; Paw Care</a></div>' +
      '<div><h4>Visit</h4>' +
      '<a href="' + b.mapLink + '" target="_blank" rel="noopener">' + b.address.full + '</a>' +
      '<a href="tel:' + b.phoneHref + '">' + b.phone + '</a>' +
      '<a href="mailto:' + b.email + '">' + b.email + '</a>' +
      '<a href="#" style="color:var(--gold);margin-top:.4rem">Mon–Sat · 8 AM – 6 PM</a></div>' +
      '</div><div class="footer-bottom">' +
      '<span>© ' + new Date().getFullYear() + ' Posh Pet Store &amp; Grooming. All rights reserved.</span>' +
      '<span><a href="/admin" style="display:inline">Staff dashboard</a></span>' +
      '</div></div>';
  }

  /* -------------------------------- auth --------------------------------- */
  async function loadProfile() {
    if (!sb || !PP.user) { PP.profile = null; PP.isAdmin = false; return; }
    const { data } = await sb.from('profiles').select('*').eq('id', PP.user.id).maybeSingle();
    PP.profile = data || null;
    PP.isAdmin = !!(data && data.is_admin);
  }
  async function signOut() {
    if (sb) await sb.auth.signOut();
    PP.user = null; PP.profile = null; PP.isAdmin = false;
  }

  /* ------------------------------ namespace ------------------------------ */
  const PP = {
    APP: APP,
    icons: I,
    money: money,
    el: el,
    escapeHTML: escapeHTML,
    stars: stars,
    toast: toast,
    cart: cart,
    sb: sb,
    requireSb: requireSb,
    sbConfigured: sbConfigured,
    catMedia: catMedia,
    productMedia: productMedia,
    productCardHTML: productCardHTML,
    serviceCardHTML: serviceCardHTML,
    servicePrice: servicePrice,
    refreshCartBadge: refreshCartBadge,
    loadProfile: loadProfile,
    signOut: signOut,
    user: null,
    profile: null,
    isAdmin: false
  };
  window.PP = PP;

  /* delegated "add to cart" */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const card = btn.closest('.product');
    cart.add(btn.getAttribute('data-add'), 1);
    toast('Added ' + (card ? card.querySelector('.product__name').textContent : 'item') +
      ' to your cart');
  });

  /* ------------------------------ bootstrap ------------------------------ */
  async function boot() {
    buildHeader();
    buildFooter();
    document.addEventListener('cart:change', refreshCartBadge);

    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        PP.user = data.session ? data.session.user : null;
        if (PP.user) await loadProfile();
      } catch (e) { /* offline / misconfigured */ }
      buildHeader();

      sb.auth.onAuthStateChange((event, session) => {
        const next = session ? session.user : null;
        const changed = (next && next.id) !== (PP.user && PP.user.id);
        PP.user = next;
        if (!next) { PP.profile = null; PP.isAdmin = false; }
        if (next && changed) {
          loadProfile().then(() => {
            buildHeader();
            document.dispatchEvent(new CustomEvent('auth:change'));
          });
        } else {
          buildHeader();
          if (changed) document.dispatchEvent(new CustomEvent('auth:change'));
        }
      });
    }

    document.dispatchEvent(new CustomEvent('pp:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
