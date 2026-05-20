/* Grooming services page */
(function () {
  'use strict';

  const KNOW = [
    ['shield', 'Vaccinations up to date', 'Please bring proof of current rabies and core vaccines for your pet’s first visit.'],
    ['heart', 'A calm, health-first approach', 'We groom at your pet’s pace. Senior or anxious pets are always handled with extra patience.'],
    ['sparkle', 'Add a little extra', 'Pair any groom with our Spa Refresh add-on — teeth brushing, a blueberry facial and cologne.']
  ];

  function detailedCard(s) {
    const pr = s.pricing || {};
    let priceTag, pricingBlock = '';
    if (pr.type === 'flat') {
      priceTag = PP.money(pr.amount) + '<small>flat rate</small>';
    } else {
      const sizes = pr.sizes || {};
      const min = Math.min.apply(null, Object.values(sizes).map(Number));
      priceTag = 'From ' + PP.money(min) + '<small>price by pet size</small>';
      pricingBlock = '<div class="pill-row" style="margin-top:.3rem">' +
        Object.keys(sizes).map((sz) =>
          '<div class="pill">' + PP.escapeHTML(sz) + '<small>' + PP.money(sizes[sz]) +
          '</small></div>').join('') + '</div>';
    }
    return '<article class="service-card">' +
      '<div style="display:flex;gap:1rem;align-items:center;margin-bottom:.4rem">' +
      '<div class="service-card__icon" style="margin-bottom:0">' +
      (PP.icons[s.icon] || PP.icons.paw) + '</div>' +
      '<div><h3>' + PP.escapeHTML(s.name) + '</h3>' +
      '<span class="muted" style="font-weight:700;font-size:.88rem">' +
      PP.escapeHTML(s.tagline || '') + '</span></div></div>' +
      (s.popular ? '<span class="tag tag--gold">Most popular</span>' : '') +
      '<p>' + PP.escapeHTML(s.blurb || '') + '</p>' +
      '<div class="muted" style="font-size:.84rem;font-weight:800">Appointment length · about ' +
      (s.duration_min || 60) + ' minutes</div>' + pricingBlock +
      '<div class="service-card__foot"><span class="price-tag">' + priceTag + '</span>' +
      '<a class="btn btn--primary btn--sm" href="/book?service=' + encodeURIComponent(s.id) +
      '">Book this</a></div></article>';
  }

  async function init() {
    const host = document.getElementById('serviceList');
    document.getElementById('goodToKnow').innerHTML = KNOW.map(
      ([icon, title, text]) =>
        '<div class="service-card"><div class="service-card__icon">' + PP.icons[icon] +
        '</div><h3 style="font-size:1.15rem">' + title + '</h3><p>' + text + '</p></div>'
    ).join('');

    if (!PP.sb) {
      host.innerHTML = '<p class="muted">Connect your Supabase project to load services.</p>';
      return;
    }
    const { data, error } = await PP.sb
      .from('services').select('*').eq('active', true).order('sort_order');
    if (error || !data || !data.length) {
      host.innerHTML = '<p class="muted">Services are unavailable right now.</p>';
      return;
    }
    host.innerHTML = data.map(detailedCard).join('');
  }

  document.addEventListener('pp:ready', init);
})();
