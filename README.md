# Posh Pet Store & Grooming — Website

Booking-oriented website and online store for **Posh Pet Store & Grooming**,
359 Ave. Hostos, San Juan, Puerto Rico.

- **Front end** — static HTML/CSS/JS in `public/`, hosted on **Vercel**.
- **Back end** — **Supabase** (Postgres, Auth, Row-Level Security). The browser
  talks to Supabase directly; there is no application server to run.

## Features

- **Grooming booking** — multi-step flow, live slot availability, confirmation codes.
- **Online store** — product catalogue, cart, store pickup or local delivery,
  IVU tax, live stock that decrements on every order.
- **Customer accounts** — email/password sign-up, saved profile, saved pets,
  and personal booking & order history. Guests can still book and shop.
- **Staff dashboard** (`/admin`) — full create / edit / delete for products and
  services, manage appointments, orders, inventory and messages.

## First-time setup

### 1. Create the database

In your Supabase project open **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates all
tables, row-level-security policies, functions and seed data (services + products).

### 2. Connect the website to Supabase

Open `public/js/supabase-config.js` and fill in the two values from
**Supabase → Project Settings → API**:

```js
window.SUPABASE_URL      = 'https://YOUR-PROJECT.supabase.co';
window.SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

The anon key is meant to live in client code — every table is protected by
row-level security, so the key cannot be used to read or change anything the
policies don't allow.

### 3. Make yourself an admin

Sign up on the live site at `/account`, then run this once in the Supabase SQL
editor (use the email you signed up with):

```sql
update public.profiles set is_admin = true where email = 'YOU@EXAMPLE.COM';
```

Now `/admin` will let you manage everything. Repeat for any other staff member.

### 4. (Recommended) Auth e-mail settings

In **Supabase → Authentication → Providers → Email**, decide whether to keep
"Confirm email" on. With it on, new customers must click an emailed link before
their first login. With it off, signup logs them straight in.

## Deploying to Vercel

The repo is a static site. In the Vercel project:

- **Framework preset:** Other
- **Build command:** (none)
- **Output directory:** `public`

`vercel.json` enables clean URLs (`/shop` instead of `/shop.html`).
Push to the connected branch and Vercel redeploys automatically.

## Local preview

```bash
npm start        # serves public/ at http://localhost:3000
```

`server.js` is only a local static file server — it is not used in production.

## Project structure

```
public/                  Front end (this is what Vercel serves)
  *.html                 home, services, shop, book, cart, contact, account, admin
  css/styles.css         Stylesheet
  js/
    supabase-config.js   <-- your Supabase URL + anon key go here
    site.js              Supabase client, header/footer, cart, shared helpers
    home / services / shop / book / cart / contact / account / admin .js
  img/, favicon.svg
supabase/schema.sql      Database schema, security policies, functions, seed data
server.js                Local-preview static server only
vercel.json              Clean-URL configuration
```

## How the data is protected

Row-level security policies (in `schema.sql`) enforce every rule in the database:

- Anyone may read **active** products and services; only admins may change them.
- Customers may read and edit **only their own** profile, pets, bookings and orders.
- Bookings and orders are created through `SECURITY DEFINER` functions
  (`create_booking`, `place_order`) that validate slot capacity and stock
  atomically — so two people cannot overbook a slot or oversell stock.
- Contact messages can be submitted by anyone but read only by admins.

## Customising

- **Products & grooming services** — add, edit and delete them from the `/admin`
  dashboard. No code or SQL needed.
- **Business info, hours, booking slots, tax & delivery fees** — `APP` config at
  the top of `public/js/site.js` (and the matching constants in the
  `get_availability` / `place_order` functions in `schema.sql`).
- **Look & feel** — CSS variables at the top of `public/css/styles.css`.

Business details were collected from the shop's public listings; testimonials
are illustrative samples ready to be replaced with real content.
