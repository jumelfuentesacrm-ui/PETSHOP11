/* Cart & checkout */
(function () {
  'use strict';

  let PRODUCTS = {};
  let store = { deliveryFee: 7, freeDeliveryOver: 60, taxRate: 0.115 };
  const form = { fulfillment: 'pickup', name: '', phone: '', email: '', address: '' };

  const $ = (id) => document.getElementById(id);

  function lines() {
    return PP.cart
      .get()
      .map((row) => {
        const product = PRODUCTS[row.id];
        if (!product) return null;
        return { product: product, qty: row.qty };
      })
      .filter(Boolean);
  }

  function totals(rows) {
    const subtotal = rows.reduce((s, r) => s + r.product.price * r.qty, 0);
    let delivery = 0;
    if (form.fulfillment === 'delivery') {
      delivery = subtotal >= store.freeDeliveryOver ? 0 : store.deliveryFee;
    }
    const tax = (subtotal + delivery) * store.taxRate;
    return {
      subtotal: subtotal,
      delivery: delivery,
      tax: tax,
      total: subtotal + delivery + tax
    };
  }

  function mediaTile(category, cls) {
    const m = PP.catMedia[category] || PP.catMedia.Toys;
    return (
      '<div class="' + cls + '" style="background:' + m.bg + ';color:' + m.c + '">' +
      PP.icons[m.icon] + '</div>'
    );
  }

  function itemRow(r) {
    const p = r.product;
    const overStock = r.qty > p.stock;
    return (
      '<div class="cart-item">' +
      mediaTile(p.category, 'cart-item__media') +
      '<div><div class="cart-item__name">' + PP.escapeHTML(p.name) + '</div>' +
      '<div class="cart-item__meta">' + PP.escapeHTML(p.brand) + ' · ' +
      PP.money(p.price) + ' each</div>' +
      (overStock
        ? '<div class="cart-item__meta" style="color:var(--berry)">Only ' +
          p.stock + ' in stock</div>'
        : '') +
      '<button class="link-btn" data-remove="' + p.id + '">Remove</button></div>' +
      '<div style="text-align:right">' +
      '<div class="stepper">' +
      '<button data-dec="' + p.id + '" aria-label="Decrease">−</button>' +
      '<span>' + r.qty + '</span>' +
      '<button data-inc="' + p.id + '" aria-label="Increase">+</button></div>' +
      '<div style="font-weight:800;margin-top:.45rem">' +
      PP.money(p.price * r.qty) + '</div></div></div>'
    );
  }

  function emptyState() {
    return (
      '<div class="empty-state card">' +
      '<div style="width:84px;margin:0 auto;color:var(--ink-faint)">' +
      PP.icons.cart + '</div>' +
      '<h2 style="margin-top:.6rem">Your cart is empty</h2>' +
      '<p class="muted">Discover holistic food, treats and toys your pet will love.</p>' +
      '<div class="mt-2"><a class="btn btn--primary" href="/shop">Browse the shop</a></div>' +
      '</div>'
    );
  }

  function render() {
    const root = $('cartRoot');
    const rows = lines();

    if (!rows.length) {
      root.innerHTML = emptyState();
      return;
    }

    const t = totals(rows);
    const deliverySel = form.fulfillment === 'delivery';

    root.innerHTML =
      '<div class="cart-layout">' +
      /* items */
      '<div class="card" style="padding:1.4rem 1.6rem">' +
      '<h3 style="font-size:1.2rem;margin-bottom:.4rem">' +
      rows.length + (rows.length === 1 ? ' item' : ' items') + '</h3>' +
      rows.map(itemRow).join('') +
      '<div style="margin-top:1rem"><a class="link-btn" href="/shop" ' +
      'style="color:var(--gold-deep)">← Continue shopping</a></div></div>' +
      /* summary + checkout */
      '<aside><div class="summary-card">' +
      '<h3>Order summary</h3>' +
      '<div style="margin:.6rem 0 .8rem">' +
      '<label class="choice' + (!deliverySel ? ' selected' : '') + '">' +
      '<input type="radio" name="ful" value="pickup"' + (!deliverySel ? ' checked' : '') + '>' +
      '<span><strong>Store pickup — free</strong>' +
      '<small>Ready at 359 Ave. Hostos, San Juan</small></span></label>' +
      '<label class="choice' + (deliverySel ? ' selected' : '') + '" style="margin-top:.5rem">' +
      '<input type="radio" name="ful" value="delivery"' + (deliverySel ? ' checked' : '') + '>' +
      '<span><strong>Local delivery</strong>' +
      '<small>Free over ' + PP.money(store.freeDeliveryOver) + ', otherwise ' +
      PP.money(store.deliveryFee) + '</small></span></label></div>' +
      (deliverySel
        ? '<div class="field"><label for="cAddress">Delivery address</label>' +
          '<input id="cAddress" type="text" placeholder="Street, city, ZIP" value="' +
          PP.escapeHTML(form.address) + '" maxlength="160"></div>'
        : '') +
      row('Subtotal', PP.money(t.subtotal)) +
      row('Delivery', t.delivery ? PP.money(t.delivery) : 'Free') +
      row('IVU tax (' + (store.taxRate * 100).toFixed(1) + '%)', PP.money(t.tax)) +
      '<div class="summary-total"><span>Total</span><span>' + PP.money(t.total) + '</span></div>' +
      '<div style="margin-top:1rem">' +
      '<div class="field"><label for="cName">Your name</label>' +
      '<input id="cName" type="text" value="' + PP.escapeHTML(form.name) + '" maxlength="60"></div>' +
      '<div class="field"><label for="cPhone">Phone</label>' +
      '<input id="cPhone" type="tel" value="' + PP.escapeHTML(form.phone) + '" maxlength="24"></div>' +
      '<div class="field"><label for="cEmail">Email</label>' +
      '<input id="cEmail" type="email" value="' + PP.escapeHTML(form.email) + '" maxlength="80"></div>' +
      '</div>' +
      '<div id="cartErrors"></div>' +
      '<button class="btn btn--primary btn--block" id="placeOrder">Place order</button>' +
      '<p class="muted" style="font-size:.8rem;margin-top:.7rem;text-align:center">' +
      'No online payment — settle up at pickup or delivery.</p>' +
      '</div></aside></div>';

    wire();
  }

  function row(label, value) {
    return (
      '<div class="summary-row"><span>' + label + '</span><span>' + value + '</span></div>'
    );
  }

  function wire() {
    const root = $('cartRoot');

    root.querySelectorAll('[data-inc]').forEach((b) =>
      b.addEventListener('click', () => changeQty(b.getAttribute('data-inc'), 1))
    );
    root.querySelectorAll('[data-dec]').forEach((b) =>
      b.addEventListener('click', () => changeQty(b.getAttribute('data-dec'), -1))
    );
    root.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        PP.cart.remove(b.getAttribute('data-remove'));
        render();
      })
    );

    root.querySelectorAll('input[name="ful"]').forEach((r) =>
      r.addEventListener('change', (e) => {
        form.fulfillment = e.target.value;
        render();
      })
    );

    const bind = (id, key) => {
      const el = $(id);
      if (el) el.addEventListener('input', (e) => (form[key] = e.target.value));
    };
    bind('cName', 'name');
    bind('cPhone', 'phone');
    bind('cEmail', 'email');
    bind('cAddress', 'address');

    $('placeOrder').addEventListener('click', placeOrder);
  }

  function changeQty(id, delta) {
    const current = PP.cart.qtyOf(id);
    const product = PRODUCTS[id];
    let next = current + delta;
    if (product && next > product.stock) {
      next = product.stock;
      PP.toast('Only ' + product.stock + ' in stock', 'err');
    }
    PP.cart.setQty(id, next);
    render();
  }

  function showErrors(list) {
    const box = $('cartErrors');
    if (!box) return;
    box.innerHTML = list && list.length
      ? '<div class="alert alert--err"><ul style="margin-left:1rem">' +
        list.map((x) => '<li>' + PP.escapeHTML(x) + '</li>').join('') +
        '</ul></div>'
      : '';
  }

  async function placeOrder() {
    showErrors([]);
    const btn = $('placeOrder');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span> Placing order…';

    const payload = {
      items: PP.cart.get(),
      fulfillment: form.fulfillment,
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address
    };
    const r = await PP.api('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.textContent = 'Place order';

    if (!r.ok) {
      showErrors(r.data.errors || ['Could not place the order. Please try again.']);
      return;
    }
    confirmed(r.data.order);
  }

  function confirmed(order) {
    PP.cart.clear();
    const root = $('cartRoot');
    root.innerHTML =
      '<div class="confirm-card">' +
      '<div class="check">' + PP.icons.check + '</div>' +
      '<h2>Order received!</h2>' +
      '<p class="muted">Thanks, ' + PP.escapeHTML(order.customer.name) +
      '. We’ll contact you when your order is ' +
      (order.fulfillment === 'delivery' ? 'on its way.' : 'ready for pickup.') + '</p>' +
      '<div class="confirm-code">' + order.id + '</div>' +
      '<div style="text-align:left;max-width:340px;margin:0 auto">' +
      row('Items', order.items.reduce((s, i) => s + i.qty, 0) + ' product(s)') +
      row('Fulfillment', order.fulfillment === 'delivery' ? 'Local delivery' : 'Store pickup') +
      row('Total', PP.money(order.total)) +
      '</div>' +
      '<div class="hero__cta" style="justify-content:center;margin-top:1.4rem">' +
      '<a class="btn btn--dark" href="/shop">Keep shopping</a>' +
      '<a class="btn btn--ghost" href="/">Back to home</a></div></div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    PP.toast('Order ' + order.id + ' placed');
  }

  async function init() {
    const cfg = window.PP_CONFIG || {};
    if (cfg.store) store = cfg.store;

    const r = await PP.api('/api/products');
    if (r.ok) {
      r.data.products.forEach((p) => (PRODUCTS[p.id] = p));
    }
    render();
  }

  if (window.PP_CONFIG) init();
  else document.addEventListener('pp:ready', init);
})();
