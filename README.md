# Posh Pet Store & Grooming — Website

A booking-oriented website with an online store for **Posh Pet Store & Grooming**,
a full-service pet store and grooming salon at 359 Ave. Hostos, San Juan, Puerto Rico.

Built as a single Node.js app with **zero npm dependencies** — it runs with nothing
but Node installed.

## Features

**Grooming (booking-oriented)**
- 7 grooming services with size-based or flat pricing
- 4-step booking flow: service → pet details → date & time → contact
- Live appointment availability with per-slot capacity
- Booking confirmation codes

**Store (inventory)**
- Product catalogue across 7 categories with search, sort and category filters
- Cart with store pickup or local delivery, IVU tax and delivery-fee logic
- Live stock tracking — orders decrement inventory, sold-out items are blocked

**Staff dashboard** (`/admin`)
- Appointments, orders, inventory and contact messages in one place
- Update booking/order statuses and edit stock levels
- Passcode protected

## Running

```bash
npm start
# or:  node server.js
```

Then open <http://localhost:3000>. Set a different port with `PORT=8080 node server.js`.

The staff dashboard is at `/admin`. The demo passcode is **`poshpet2024`** —
override it with the `ADMIN_KEY` environment variable.

## Project structure

```
server.js        HTTP server — static hosting + JSON API
config.js        Business info, grooming services, booking rules, store settings
src/db.js        JSON-file data store (seeds itself on first run)
data/db.json     Runtime data (auto-created, git-ignored)
public/          Front end
  *.html         Pages: home, services, shop, book, cart, contact, admin
  css/styles.css Stylesheet
  js/            site.js (shared) + one script per page
  img/           SVG illustration & assets
```

## API overview

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET  | `/api/config` | Business info, services, booking & store settings |
| GET  | `/api/products` | Product list (`?category=`, `?search=`) |
| GET  | `/api/availability?date=` | Open grooming slots for a date |
| POST | `/api/bookings` | Create a grooming appointment |
| POST | `/api/orders` | Place a store order (decrements stock) |
| POST | `/api/messages` | Submit a contact message |
| GET  | `/api/admin/summary` | Dashboard data *(passcode required)* |
| POST | `/api/admin/{bookings,orders}/:id/status` | Update a status *(passcode)* |
| POST | `/api/admin/products/:id/stock` | Set stock level *(passcode)* |

Admin requests must include the header `x-admin-key: <passcode>`.

## Customising

- **Business details, hours, services, pricing** — edit `config.js`.
- **Products / starting stock** — edit `seedProducts()` in `src/db.js`, then
  delete `data/db.json` so it re-seeds.
- **Look & feel** — colours and fonts are CSS variables at the top of
  `public/css/styles.css`.

Business details were collected from the shop's public listings; testimonials
and product data are illustrative samples ready to be replaced with real content.
