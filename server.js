'use strict';

/**
 * Posh Pet Store & Grooming — website server.
 * Zero external dependencies: static file hosting + JSON API on Node's http module.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./config');
const db = require('./src/db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

/* --------------------------------- helpers -------------------------------- */

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function code(prefix) {
  return prefix + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPhone(v) {
  return (v.match(/\d/g) || []).length >= 7;
}

function todayISO() {
  // Puerto Rico is UTC-4 year-round (no daylight saving).
  const now = new Date(Date.now() - 4 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function escapeHTML(v) {
  return String(v).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/* ------------------------------ public config ----------------------------- */

function publicConfig() {
  return {
    business: config.business,
    services: config.services,
    petSizes: config.petSizes,
    booking: {
      slots: config.booking.slots,
      closedDays: config.booking.closedDays,
      windowDays: config.booking.windowDays
    },
    store: {
      deliveryFee: config.store.deliveryFee,
      freeDeliveryOver: config.store.freeDeliveryOver,
      taxRate: config.store.taxRate
    }
  };
}

/* -------------------------------- bookings -------------------------------- */

function slotsForDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const closed = config.booking.closedDays.includes(day);
  const past = dateStr < todayISO();
  const taken = {};
  for (const b of db.data.bookings) {
    if (b.date === dateStr && b.status !== 'cancelled') {
      taken[b.time] = (taken[b.time] || 0) + 1;
    }
  }
  return config.booking.slots.map((time) => {
    const used = taken[time] || 0;
    const remaining = Math.max(0, config.booking.slotCapacity - used);
    return {
      time,
      available: !closed && !past && remaining > 0,
      remaining
    };
  });
}

function priceForService(service, size) {
  if (service.pricing.type === 'flat') return service.pricing.amount;
  return service.pricing.sizes[size];
}

function validateBooking(body) {
  const errors = [];
  const service = config.services.find((s) => s.id === str(body.serviceId));
  if (!service) errors.push('Please choose a grooming service.');

  const date = str(body.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
    errors.push('Please choose a valid date.');
  } else {
    const day = new Date(date + 'T12:00:00').getDay();
    if (config.booking.closedDays.includes(day)) errors.push('We are closed on Sundays.');
    if (date < todayISO()) errors.push('That date has already passed.');
    const maxDate = new Date(Date.now() + config.booking.windowDays * 86400000)
      .toISOString()
      .slice(0, 10);
    if (date > maxDate) errors.push('Please choose a date within the next ' + config.booking.windowDays + ' days.');
  }

  const time = str(body.time);
  if (!config.booking.slots.includes(time)) errors.push('Please choose an appointment time.');

  let size = null;
  if (service && service.pricing.type === 'size') {
    size = str(body.petSize);
    if (!service.pricing.sizes[size]) errors.push('Please choose your pet’s size.');
  }

  const petName = str(body.petName);
  const petType = str(body.petType).toLowerCase();
  const ownerName = str(body.ownerName);
  const phone = str(body.phone);
  const email = str(body.email);

  if (!petName) errors.push('Please tell us your pet’s name.');
  if (!['dog', 'cat', 'other'].includes(petType)) errors.push('Please choose your pet type.');
  if (!ownerName) errors.push('Please enter your name.');
  if (!isPhone(phone)) errors.push('Please enter a valid phone number.');
  if (!isEmail(email)) errors.push('Please enter a valid email address.');

  // Capacity check against current bookings.
  if (service && date && time && errors.length === 0) {
    const slot = slotsForDate(date).find((s) => s.time === time);
    if (!slot || !slot.available) errors.push('Sorry, that time slot is no longer available.');
  }

  return { errors, service, size, petName, petType, ownerName, phone, email };
}

function createBooking(body) {
  const v = validateBooking(body);
  if (v.errors.length) return { status: 400, payload: { ok: false, errors: v.errors } };

  const price = priceForService(v.service, v.size);
  const booking = {
    id: code('PP'),
    serviceId: v.service.id,
    serviceName: v.service.name,
    date: str(body.date),
    time: str(body.time),
    durationMin: v.service.durationMin,
    petName: v.petName,
    petType: v.petType,
    petBreed: str(body.petBreed),
    petSize: v.size,
    notes: str(body.notes).slice(0, 600),
    ownerName: v.ownerName,
    phone: v.phone,
    email: v.email,
    price,
    status: 'requested',
    createdAt: new Date().toISOString()
  };
  db.data.bookings.push(booking);
  db.persist();
  return { status: 201, payload: { ok: true, booking } };
}

/* --------------------------------- orders --------------------------------- */

function validateOrder(body) {
  const errors = [];
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) errors.push('Your cart is empty.');

  const lines = [];
  let subtotal = 0;
  for (const item of items) {
    const product = db.data.products.find((p) => p.id === str(item && item.id));
    const qty = Math.floor(Number(item && item.qty));
    if (!product) {
      errors.push('A product in your cart is no longer available.');
      continue;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      errors.push('Invalid quantity for ' + product.name + '.');
      continue;
    }
    if (product.stock < qty) {
      errors.push(
        'Only ' + product.stock + ' left of ' + product.name + '.'
      );
      continue;
    }
    const lineTotal = +(product.price * qty).toFixed(2);
    subtotal += lineTotal;
    lines.push({ id: product.id, name: product.name, price: product.price, qty, lineTotal });
  }

  const fulfillment = str(body.fulfillment) === 'delivery' ? 'delivery' : 'pickup';
  const name = str(body.name);
  const phone = str(body.phone);
  const email = str(body.email);
  const address = str(body.address);

  if (!name) errors.push('Please enter your name.');
  if (!isPhone(phone)) errors.push('Please enter a valid phone number.');
  if (!isEmail(email)) errors.push('Please enter a valid email address.');
  if (fulfillment === 'delivery' && !address) {
    errors.push('Please enter a delivery address.');
  }

  subtotal = +subtotal.toFixed(2);
  let deliveryFee = 0;
  if (fulfillment === 'delivery') {
    deliveryFee = subtotal >= config.store.freeDeliveryOver ? 0 : config.store.deliveryFee;
  }
  const tax = +((subtotal + deliveryFee) * config.store.taxRate).toFixed(2);
  const total = +(subtotal + deliveryFee + tax).toFixed(2);

  return {
    errors,
    lines,
    fulfillment,
    name,
    phone,
    email,
    address,
    subtotal,
    deliveryFee,
    tax,
    total
  };
}

function createOrder(body) {
  const v = validateOrder(body);
  if (v.errors.length) return { status: 400, payload: { ok: false, errors: v.errors } };

  // Decrement stock now that the order is valid.
  for (const line of v.lines) {
    const product = db.data.products.find((p) => p.id === line.id);
    product.stock -= line.qty;
  }

  const order = {
    id: code('ORD'),
    items: v.lines,
    fulfillment: v.fulfillment,
    customer: { name: v.name, phone: v.phone, email: v.email, address: v.address },
    subtotal: v.subtotal,
    deliveryFee: v.deliveryFee,
    tax: v.tax,
    total: v.total,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  db.data.orders.push(order);
  db.persist();
  return { status: 201, payload: { ok: true, order } };
}

/* -------------------------------- messages -------------------------------- */

function createMessage(body) {
  const name = str(body.name);
  const email = str(body.email);
  const message = str(body.message);
  const errors = [];
  if (!name) errors.push('Please enter your name.');
  if (!isEmail(email)) errors.push('Please enter a valid email address.');
  if (message.length < 5) errors.push('Please enter a message.');
  if (errors.length) return { status: 400, payload: { ok: false, errors } };

  const entry = {
    id: code('MSG'),
    name,
    email,
    phone: str(body.phone),
    subject: str(body.subject).slice(0, 120),
    message: message.slice(0, 2000),
    status: 'unread',
    createdAt: new Date().toISOString()
  };
  db.data.messages.push(entry);
  db.persist();
  return { status: 201, payload: { ok: true, message: entry } };
}

/* ---------------------------------- admin --------------------------------- */

function isAdmin(req) {
  return str(req.headers['x-admin-key']) === config.adminKey;
}

function adminSummary() {
  const data = db.data;
  const today = todayISO();
  const lowStock = data.products.filter((p) => p.stock <= 5);
  return {
    ok: true,
    counts: {
      bookingsToday: data.bookings.filter((b) => b.date === today && b.status !== 'cancelled').length,
      bookingsUpcoming: data.bookings.filter((b) => b.date >= today && b.status !== 'cancelled').length,
      ordersNew: data.orders.filter((o) => o.status === 'new').length,
      lowStock: lowStock.length,
      unreadMessages: data.messages.filter((m) => m.status === 'unread').length
    },
    bookings: [...data.bookings].sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    ),
    orders: [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    products: [...data.products].sort((a, b) => a.stock - b.stock),
    messages: [...data.messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

/* ------------------------------- API router ------------------------------- */

async function handleApi(req, res, pathname, query) {
  const method = req.method;

  if (method === 'GET' && pathname === '/api/config') {
    return sendJSON(res, 200, publicConfig());
  }

  if (method === 'GET' && pathname === '/api/products') {
    let products = db.data.products;
    const category = str(query.get('category'));
    const search = str(query.get('search')).toLowerCase();
    if (category && category !== 'All') {
      products = products.filter((p) => p.category === category);
    }
    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }
    const categories = [...new Set(db.data.products.map((p) => p.category))].sort();
    return sendJSON(res, 200, { ok: true, products, categories });
  }

  if (method === 'GET' && /^\/api\/products\/[^/]+$/.test(pathname)) {
    const id = decodeURIComponent(pathname.split('/').pop());
    const product = db.data.products.find((p) => p.id === id);
    if (!product) return sendJSON(res, 404, { ok: false, errors: ['Product not found.'] });
    return sendJSON(res, 200, { ok: true, product });
  }

  if (method === 'GET' && pathname === '/api/availability') {
    const date = str(query.get('date'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return sendJSON(res, 400, { ok: false, errors: ['A valid date is required.'] });
    }
    return sendJSON(res, 200, { ok: true, date, slots: slotsForDate(date) });
  }

  if (method === 'POST' && pathname === '/api/bookings') {
    const body = await readBody(req);
    const result = createBooking(body);
    return sendJSON(res, result.status, result.payload);
  }

  if (method === 'POST' && pathname === '/api/orders') {
    const body = await readBody(req);
    const result = createOrder(body);
    return sendJSON(res, result.status, result.payload);
  }

  if (method === 'POST' && pathname === '/api/messages') {
    const body = await readBody(req);
    const result = createMessage(body);
    return sendJSON(res, result.status, result.payload);
  }

  /* ---- admin (passcode protected) ---- */
  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) {
      return sendJSON(res, 401, { ok: false, errors: ['Invalid passcode.'] });
    }

    if (method === 'GET' && pathname === '/api/admin/summary') {
      return sendJSON(res, 200, adminSummary());
    }

    let m = pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/status$/);
    if (method === 'POST' && m) {
      const body = await readBody(req);
      const booking = db.data.bookings.find((b) => b.id === m[1]);
      if (!booking) return sendJSON(res, 404, { ok: false, errors: ['Booking not found.'] });
      const status = str(body.status);
      if (!['requested', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return sendJSON(res, 400, { ok: false, errors: ['Invalid status.'] });
      }
      booking.status = status;
      db.persist();
      return sendJSON(res, 200, { ok: true, booking });
    }

    m = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
    if (method === 'POST' && m) {
      const body = await readBody(req);
      const order = db.data.orders.find((o) => o.id === m[1]);
      if (!order) return sendJSON(res, 404, { ok: false, errors: ['Order not found.'] });
      const status = str(body.status);
      if (!['new', 'preparing', 'ready', 'fulfilled', 'cancelled'].includes(status)) {
        return sendJSON(res, 400, { ok: false, errors: ['Invalid status.'] });
      }
      order.status = status;
      db.persist();
      return sendJSON(res, 200, { ok: true, order });
    }

    m = pathname.match(/^\/api\/admin\/products\/([^/]+)\/stock$/);
    if (method === 'POST' && m) {
      const body = await readBody(req);
      const product = db.data.products.find((p) => p.id === m[1]);
      if (!product) return sendJSON(res, 404, { ok: false, errors: ['Product not found.'] });
      const stock = Math.floor(Number(body.stock));
      if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
        return sendJSON(res, 400, { ok: false, errors: ['Invalid stock value.'] });
      }
      product.stock = stock;
      db.persist();
      return sendJSON(res, 200, { ok: true, product });
    }

    return sendJSON(res, 404, { ok: false, errors: ['Unknown admin endpoint.'] });
  }

  return sendJSON(res, 404, { ok: false, errors: ['Unknown endpoint.'] });
}

/* ------------------------------ static files ------------------------------ */

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  // Clean-URL support: /shop -> /shop.html
  if (!path.extname(rel)) rel += '.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      const notFound = path.join(PUBLIC_DIR, '404.html');
      fs.readFile(notFound, (e2, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e2 ? 'Not found' : page);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const cacheable = ['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff2'].includes(ext);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheable ? 'public, max-age=3600' : 'no-cache'
    });
    res.end(content);
  });
}

/* --------------------------------- server --------------------------------- */

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  const pathname = parsed.pathname;
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, parsed.searchParams);
    } else {
      serveStatic(req, res, pathname);
    }
  } catch (err) {
    sendJSON(res, 400, { ok: false, errors: [err.message || 'Request failed.'] });
  }
});

server.listen(PORT, () => {
  console.log('\n  🐾  Posh Pet Store & Grooming');
  console.log('  Local site:  http://localhost:' + PORT);
  console.log('  Staff login: http://localhost:' + PORT + '/admin  (passcode: ' + config.adminKey + ')\n');
});
