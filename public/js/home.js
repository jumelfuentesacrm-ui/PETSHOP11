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
    ['My poodle comes home looking like a show dog every single time. The groomers are gentle and clearly love what they do.', 'María R.', 'Hato Rey'],
    ['Posh Pet helped me switch my senior dog to a holistic diet and he has so much more energy now. They really know their stuff.', 'Carlos M.', 'Río Piedras'],
    ['Booked online in two minutes and got a reminder the day before. Easy, friendly and my cat actually tolerated her bath!', 'Jasmine T.', 'San Juan']
  ];

  function renderTrust() {
    document.getElementById('trustRow').innerHTML = TRUST.map(
      ([icon, text]) =>
        '<span><span style="display:flex;width:18px">' + PP.icons[icon] + '</span>' + text + '</span>'
    ).join('');
  }

  function renderQuotes() {
    document.getElementById('quotes').innerHTML = QUOTES.map(
      ([text, name, area]) =>
        '<div class="quote"><div class="stars">★★★★★</div><p>“' + PP.escapeHTML(text) +
        '”</p><footer><span class="avatar">' + name.charAt(0) + '</span>' +
        '<span><strong>' + PP.escapeHTML(name) + '</strong><span>' +
        PP.escapeHTML(area) + '</span></span></footer></div>'
    ).join('');
  }

  function notConnected(host) {
    host.innerHTML =
      '<p class="muted" style="grid-column:1/-1">Connect your Supabase project to load this content.</p>';
  }

  async function loadServices() {
    const host = document.getElementById('servicesPreview');
    if (!PP.sb) return notConnected(host);
    const { data, error } = await PP.sb
      .from('services').select('*').eq('active', true).order('sort_order');
    if (error || !data) return notConnected(host);
    const popular = data.filter((s) => s.popular);
    host.innerHTML = (popular.length >= 3 ? popular : data)
      .slice(0, 3).map(PP.serviceCardHTML).join('');
  }

  async function loadFeatured() {
    const host = document.getElementById('featuredProducts');
    host.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    if (!PP.sb) return notConnected(host);
    const { data, error } = await PP.sb
      .from('products').select('*').eq('active', true).eq('featured', true).limit(6);
    if (error || !data) return notConnected(host);
    host.innerHTML = data.length
      ? data.map(PP.productCardHTML).join('')
      : '<p class="muted" style="grid-column:1/-1">No featured products yet.</p>';
  }

  function init() {
    const star = document.getElementById('heroIconStar');
    if (star) star.innerHTML = PP.icons.star;
    renderTrust();
    renderQuotes();
    loadServices();
    loadFeatured();
  }

  document.addEventListener('pp:ready', init);
})();
