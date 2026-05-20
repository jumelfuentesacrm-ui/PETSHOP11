/* Home page */
(function () {
  'use strict';

  const TRUST = [
    ['leaf', 'Holistic &amp; natural nutrition'],
    ['shield', '20+ years of trusted care'],
    ['paw', 'Dogs, cats, birds &amp; small pets'],
    ['clock', 'Walk-ins welcome for nail trims']
  ];

  const QUOTES = [
    [
      'My poodle comes home looking like a show dog every single time. The groomers are gentle and clearly love what they do.',
      'María R.',
      'Hato Rey'
    ],
    [
      "Posh Pet helped me switch my senior dog to a holistic diet — he has so much more energy now. They really know their stuff.",
      'Carlos M.',
      'Río Piedras'
    ],
    [
      'Booked online in two minutes and got a reminder the day before. Easy, friendly and my cat actually tolerated her bath!',
      'Jasmine T.',
      'San Juan'
    ]
  ];

  function renderTrust() {
    document.getElementById('trustRow').innerHTML = TRUST.map(
      ([icon, text]) =>
        '<span><span style="display:flex;width:18px">' + PP.icons[icon] + '</span>' + text + '</span>'
    ).join('');
  }

  function renderServices(services) {
    const popular = services.filter((s) => s.popular);
    const pick = (popular.length >= 3 ? popular : services).slice(0, 3);
    document.getElementById('servicesPreview').innerHTML = pick
      .map(PP.serviceCardHTML)
      .join('');
  }

  function renderQuotes() {
    document.getElementById('quotes').innerHTML = QUOTES.map(
      ([text, name, area]) =>
        '<div class="quote"><div class="stars">★★★★★</div>' +
        '<p>“' + PP.escapeHTML(text) + '”</p>' +
        '<footer><span class="avatar">' + name.charAt(0) + '</span>' +
        '<span><strong>' + PP.escapeHTML(name) + '</strong>' +
        '<span>' + PP.escapeHTML(area) + '</span></span></footer></div>'
    ).join('');
  }

  async function loadFeatured() {
    const host = document.getElementById('featuredProducts');
    host.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    const r = await PP.api('/api/products');
    if (!r.ok) {
      host.innerHTML = '<p class="muted">Products are taking a break — please try again shortly.</p>';
      return;
    }
    const featured = r.data.products.filter((p) => p.featured).slice(0, 6);
    host.innerHTML = featured.map(PP.productCardHTML).join('');
  }

  function init() {
    const cfg = window.PP_CONFIG || {};
    const starEl = document.getElementById('heroIconStar');
    if (starEl) starEl.innerHTML = PP.icons.star;
    renderTrust();
    renderServices(cfg.services || []);
    renderQuotes();
    loadFeatured();
  }

  if (window.PP_CONFIG) init();
  else document.addEventListener('pp:ready', init);
})();
