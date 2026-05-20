/* Contact page */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function renderInfo(b) {
    $('contactInfo').innerHTML =
      '<span class="eyebrow">Find us</span>' +
      '<h3 style="font-size:1.3rem;margin:.5rem 0 1rem">Posh Pet Store &amp; Grooming</h3>' +
      '<div class="contact-line"><span class="ci">' + PP.icons.pin + '</span>' +
      '<span>' + PP.escapeHTML(b.address.full) + '</span></div>' +
      '<div class="contact-line"><span class="ci">' + PP.icons.phone + '</span>' +
      '<a href="tel:' + b.phoneHref + '">' + PP.escapeHTML(b.phone) + '</a></div>' +
      '<div class="contact-line"><span class="ci">' + PP.icons.mail + '</span>' +
      '<a href="mailto:' + b.email + '">' + PP.escapeHTML(b.email) + '</a></div>' +
      '<div class="hero__cta" style="margin-top:1.1rem">' +
      '<a class="btn btn--dark btn--sm" href="' + b.mapLink + '" target="_blank" rel="noopener">Get directions</a>' +
      '<a class="btn btn--ghost btn--sm" href="' + b.social.instagram +
      '" target="_blank" rel="noopener">Instagram</a></div>';
  }

  function renderHours(b) {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    $('hoursList').innerHTML = b.hours.map((h) => {
      const closed = !h.open;
      const isToday = h.day === todayName;
      return '<li' + (isToday ? ' class="today"' : '') + '><span>' + h.day +
        (isToday ? ' · Today' : '') + '</span>' +
        (closed ? '<span class="closed">Closed</span>'
                : '<span>' + h.open + ' – ' + h.close + '</span>') + '</li>';
    }).join('');
  }

  function renderMap(b) {
    $('mapWrap').innerHTML =
      '<h3 style="font-size:1.3rem;margin-bottom:.8rem">On the map</h3>' +
      '<iframe class="map-frame" src="' + b.mapEmbed +
      '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" ' +
      'title="Map to Posh Pet Store & Grooming"></iframe>';
  }

  function showErrors(list) {
    $('contactErrors').innerHTML = list && list.length
      ? '<div class="alert alert--err"><ul style="margin-left:1rem">' +
        list.map((x) => '<li>' + PP.escapeHTML(x) + '</li>').join('') + '</ul></div>'
      : '';
  }

  async function send() {
    showErrors([]);
    const data = {
      name: $('fName').value.trim(),
      email: $('fEmail').value.trim(),
      phone: $('fPhone').value.trim(),
      subject: $('fSubject').value.trim(),
      message: $('fMessage').value.trim()
    };
    const errs = [];
    if (!data.name) errs.push('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.push('Please enter a valid email address.');
    if (data.message.length < 5) errs.push('Please enter a short message.');
    if (errs.length) return showErrors(errs);
    if (!PP.requireSb()) return;

    const btn = $('sendMsg');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Sending…';

    const { error } = await PP.sb.from('messages').insert({
      user_id: PP.user ? PP.user.id : null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message
    });

    btn.disabled = false;
    btn.textContent = 'Send message';

    if (error) return showErrors([error.message || 'Could not send your message.']);

    $('contactFormWrap').innerHTML =
      '<div class="empty-state" style="padding:2rem 1rem">' +
      '<div style="width:64px;margin:0 auto .6rem;color:var(--green)">' + PP.icons.check +
      '</div><h3>Message sent!</h3><p class="muted">Thanks, ' + PP.escapeHTML(data.name) +
      '. We’ll be in touch soon.</p></div>';
    PP.toast('Message sent — thank you!');
  }

  function init() {
    const b = PP.APP.business;
    renderInfo(b);
    renderHours(b);
    renderMap(b);
    if (PP.user) {
      $('fName').value = (PP.profile && PP.profile.full_name) || '';
      $('fEmail').value = PP.user.email || '';
      $('fPhone').value = (PP.profile && PP.profile.phone) || '';
    }
    $('sendMsg').addEventListener('click', send);
  }

  document.addEventListener('pp:ready', init);
})();
