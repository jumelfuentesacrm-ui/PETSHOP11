/* Grooming services page */
(function () {
  'use strict';

  const KNOW = [
    [
      'shield',
      'Vaccinations up to date',
      'Please bring proof of current rabies and core vaccines for your pet’s first visit.'
    ],
    [
      'heart',
      'A calm, health-first approach',
      'We groom at your pet’s pace. Senior or anxious pets are always handled with extra patience.'
    ],
    [
      'sparkle',
      'Add a little extra',
      'Pair any groom with our Spa Refresh add-on — teeth brushing, a blueberry facial and cologne.'
    ]
  ];

  function detailedCard(s) {
    let priceTag;
    let pricingBlock = '';
    if (s.pricing.type === 'flat') {
      priceTag = PP.money(s.pricing.amount) + '<small>flat rate</small>';
    } else {
      const min = Math.min.apply(null, Object.values(s.pricing.sizes));
      priceTag = 'From ' + PP.money(min) + '<small>price by pet size</small>';
      pricingBlock =
        '<div class="pill-row" style="margin-top:.3rem">' +
        Object.keys(s.pricing.sizes)
          .map(
            (size) =>
              '<div class="pill">' + PP.escapeHTML(size) +
              '<small>' + PP.money(s.pricing.sizes[size]) + '</small></div>'
          )
          .join('') +
        '</div>';
    }
    return (
      '<article class="service-card">' +
      '<div style="display:flex;gap:1rem;align-items:center;margin-bottom:.4rem">' +
      '<div class="service-card__icon" style="margin-bottom:0">' +
      (PP.icons[s.icon] || PP.icons.paw) + '</div>' +
      '<div><h3>' + PP.escapeHTML(s.name) + '</h3>' +
      '<span class="muted" style="font-weight:700;font-size:.88rem">' +
      PP.escapeHTML(s.tagline) + '</span></div></div>' +
      (s.popular ? '<span class="tag tag--gold">Most popular</span>' : '') +
      '<p>' + PP.escapeHTML(s.blurb) + '</p>' +
      '<div class="muted" style="font-size:.84rem;font-weight:800">' +
      'Appointment length · about ' + s.durationMin + ' minutes</div>' +
      pricingBlock +
      '<div class="service-card__foot">' +
      '<span class="price-tag">' + priceTag + '</span>' +
      '<a class="btn btn--primary btn--sm" href="/book?service=' +
      encodeURIComponent(s.id) + '">Book this</a>' +
      '</div></article>'
    );
  }

  function init() {
    const cfg = window.PP_CONFIG || {};
    const services = cfg.services || [];
    document.getElementById('serviceList').innerHTML = services
      .map(detailedCard)
      .join('');
    document.getElementById('goodToKnow').innerHTML = KNOW.map(
      ([icon, title, text]) =>
        '<div class="service-card"><div class="service-card__icon">' +
        PP.icons[icon] + '</div><h3 style="font-size:1.15rem">' +
        title + '</h3><p>' + text + '</p></div>'
    ).join('');
  }

  if (window.PP_CONFIG) init();
  else document.addEventListener('pp:ready', init);
})();
