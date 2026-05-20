-- ============================================================================
--  Posh Pet Store & Grooming  —  Supabase database schema
-- ----------------------------------------------------------------------------
--  HOW TO USE
--  1. Open your Supabase project  ->  SQL Editor  ->  New query
--  2. Paste this whole file and click "Run".
--  3. Sign up on the website with your email, then run (once):
--        update public.profiles set is_admin = true where email = 'YOU@EXAMPLE.COM';
--  This script is safe to re-run; it will not duplicate data.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  TABLES
-- ----------------------------------------------------------------------------

-- Customer profiles (one row per auth user, created automatically on signup)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  email      text,
  phone      text,
  address    text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Pets belonging to a customer
create table if not exists public.pets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  species    text not null default 'dog',
  breed      text,
  size       text,
  notes      text,
  created_at timestamptz not null default now()
);

-- Grooming services (fully managed from the admin dashboard)
create table if not exists public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  tagline      text,
  blurb        text,
  duration_min int  not null default 60,
  icon         text not null default 'paw',
  pricing      jsonb not null default '{"type":"flat","amount":0}'::jsonb,
  popular      boolean not null default false,
  active       boolean not null default true,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now()
);

-- Store products (fully managed from the admin dashboard)
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null,
  brand      text,
  price      numeric(10,2) not null default 0,
  stock      int not null default 0,
  blurb      text,
  rating     numeric(2,1) not null default 4.7,
  featured   boolean not null default false,
  badge      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Grooming appointments
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  user_id      uuid references public.profiles(id) on delete set null,
  service_id   uuid references public.services(id) on delete set null,
  service_name text not null,
  date         date not null,
  time         text not null,
  duration_min int,
  pet_name     text not null,
  pet_type     text,
  pet_breed    text,
  pet_size     text,
  notes        text,
  owner_name   text not null,
  phone        text not null,
  email        text not null,
  price        numeric(10,2) not null default 0,
  status       text not null default 'requested',
  created_at   timestamptz not null default now()
);

-- Store orders
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  user_id       uuid references public.profiles(id) on delete set null,
  fulfillment   text not null default 'pickup',
  customer_name text not null,
  phone         text not null,
  email         text not null,
  address       text,
  subtotal      numeric(10,2) not null,
  delivery_fee  numeric(10,2) not null default 0,
  tax           numeric(10,2) not null default 0,
  total         numeric(10,2) not null,
  status        text not null default 'new',
  created_at    timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  price      numeric(10,2) not null,
  qty        int not null,
  line_total numeric(10,2) not null
);

-- Contact-form messages
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  status     text not null default 'unread',
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_date  on public.bookings(date, time);
create index if not exists idx_products_cat   on public.products(category);
create index if not exists idx_order_items_oid on public.order_items(order_id);

-- ----------------------------------------------------------------------------
--  HELPERS
-- ----------------------------------------------------------------------------

-- True when the current user is a staff member. SECURITY DEFINER so it can read
-- profiles without tripping row-level security (avoids recursive policies).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin);
$$;

-- Create a profile row automatically whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
--  ROW-LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.pets        enable row level security;
alter table public.services    enable row level security;
alter table public.products    enable row level security;
alter table public.bookings    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.messages    enable row level security;

-- profiles: a user sees / edits only their own row; admins see all
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- pets: a user fully manages their own pets; admins may read all
drop policy if exists pets_owner on public.pets;
create policy pets_owner on public.pets
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

-- services: everyone reads active services; admins manage them
drop policy if exists services_read on public.services;
create policy services_read on public.services
  for select using (active or public.is_admin());
drop policy if exists services_admin on public.services;
create policy services_admin on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- products: everyone reads active products; admins manage them
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (active or public.is_admin());
drop policy if exists products_admin on public.products;
create policy products_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- bookings: created through the create_booking() function only;
-- customers see their own, admins see + update all
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists bookings_admin on public.bookings;
create policy bookings_admin on public.bookings
  for update using (public.is_admin()) with check (public.is_admin());

-- orders: created through place_order() only; customers see their own
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists orders_admin on public.orders;
create policy orders_admin on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())));

-- messages: anyone may send one; only admins may read / update
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (true);
drop policy if exists messages_admin on public.messages;
create policy messages_admin on public.messages
  for select using (public.is_admin());
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update using (public.is_admin()) with check (public.is_admin());

-- Base privileges (row-level security above is the real gate)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated;

-- ----------------------------------------------------------------------------
--  FUNCTIONS  (called from the website with supabase.rpc(...))
-- ----------------------------------------------------------------------------

-- Open grooming slots for a given date (capacity-aware, hides booking details)
create or replace function public.get_availability(p_date date)
returns table(slot text, remaining int)
language plpgsql
security definer
set search_path = public
as $$
declare
  slots    text[] := array['09:00','10:30','12:00','13:30','15:00','16:30'];
  capacity int := 2;
  s        text;
  used     int;
begin
  foreach s in array slots loop
    select count(*) into used from public.bookings b
      where b.date = p_date and b.time = s and b.status <> 'cancelled';
    slot := s;
    if extract(dow from p_date) = 0 or p_date < current_date then
      remaining := 0;
    else
      remaining := greatest(0, capacity - used);
    end if;
    return next;
  end loop;
end;
$$;

-- Create a grooming appointment (validates the slot and computes the price)
create or replace function public.create_booking(
  p_service_id uuid, p_date date, p_time text,
  p_pet_name text, p_pet_type text, p_pet_breed text, p_pet_size text,
  p_notes text, p_owner_name text, p_phone text, p_email text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  svc      public.services;
  capacity int := 2;
  used     int;
  v_price  numeric;
  v_code   text;
  result   public.bookings;
begin
  select * into svc from public.services where id = p_service_id and active;
  if not found then raise exception 'That service is not available.'; end if;
  if extract(dow from p_date) = 0 then raise exception 'We are closed on Sundays.'; end if;
  if p_date < current_date then raise exception 'That date has already passed.'; end if;
  if p_time not in ('09:00','10:30','12:00','13:30','15:00','16:30') then
    raise exception 'Please choose a valid appointment time.'; end if;

  select count(*) into used from public.bookings
    where date = p_date and time = p_time and status <> 'cancelled';
  if used >= capacity then
    raise exception 'Sorry, that time slot is no longer available.'; end if;

  if svc.pricing->>'type' = 'flat' then
    v_price := (svc.pricing->>'amount')::numeric;
  else
    v_price := (svc.pricing->'sizes'->>p_pet_size)::numeric;
    if v_price is null then raise exception 'Please choose your pet''s size.'; end if;
  end if;

  v_code := 'PP-' || upper(substr(md5(random()::text), 1, 6));

  insert into public.bookings(
    code, user_id, service_id, service_name, date, time, duration_min,
    pet_name, pet_type, pet_breed, pet_size, notes,
    owner_name, phone, email, price, status)
  values (
    v_code, auth.uid(), svc.id, svc.name, p_date, p_time, svc.duration_min,
    p_pet_name, p_pet_type, nullif(p_pet_breed,''), p_pet_size, nullif(p_notes,''),
    p_owner_name, p_phone, p_email, coalesce(v_price,0), 'requested')
  returning * into result;

  return result;
end;
$$;

-- Place a store order (checks stock atomically and decrements inventory)
create or replace function public.place_order(
  p_items jsonb, p_fulfillment text,
  p_name text, p_phone text, p_email text, p_address text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  item         jsonb;
  prod         public.products;
  qty          int;
  v_subtotal   numeric := 0;
  v_delivery   numeric := 0;
  v_tax        numeric;
  v_total      numeric;
  tax_rate     numeric := 0.115;
  delivery_fee numeric := 7;
  free_over    numeric := 60;
  v_code       text;
  v_order      public.orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.'; end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := (item->>'qty')::int;
    select * into prod from public.products
      where id = (item->>'id')::uuid for update;
    if not found or not prod.active then
      raise exception 'A product in your cart is no longer available.'; end if;
    if qty < 1 or qty > 99 then raise exception 'Invalid quantity.'; end if;
    if prod.stock < qty then
      raise exception 'Only % left of %.', prod.stock, prod.name; end if;
    v_subtotal := v_subtotal + prod.price * qty;
  end loop;

  if p_fulfillment = 'delivery' then
    if coalesce(p_address,'') = '' then
      raise exception 'Please enter a delivery address.'; end if;
    if v_subtotal < free_over then v_delivery := delivery_fee; end if;
  end if;

  v_tax   := round((v_subtotal + v_delivery) * tax_rate, 2);
  v_total := v_subtotal + v_delivery + v_tax;
  v_code  := 'ORD-' || upper(substr(md5(random()::text), 1, 6));

  insert into public.orders(
    code, user_id, fulfillment, customer_name, phone, email, address,
    subtotal, delivery_fee, tax, total, status)
  values (
    v_code, auth.uid(),
    case when p_fulfillment = 'delivery' then 'delivery' else 'pickup' end,
    p_name, p_phone, p_email, nullif(p_address,''),
    round(v_subtotal,2), v_delivery, v_tax, round(v_total,2), 'new')
  returning * into v_order;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := (item->>'qty')::int;
    select * into prod from public.products where id = (item->>'id')::uuid;
    insert into public.order_items(order_id, product_id, name, price, qty, line_total)
      values (v_order.id, prod.id, prod.name, prod.price, qty,
              round(prod.price * qty, 2));
    update public.products set stock = stock - qty where id = prod.id;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.get_availability(date) to anon, authenticated;
grant execute on function public.create_booking(
  uuid,date,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.place_order(
  jsonb,text,text,text,text,text) to anon, authenticated;

-- ----------------------------------------------------------------------------
--  SEED DATA  (only inserted when the tables are empty)
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from public.services) then
    insert into public.services (name, tagline, blurb, duration_min, icon, pricing, popular, sort_order) values
    ('Full Groom', 'Bath, breed-specific haircut & finishing',
     'The complete spa day: warm bath, hand-dry, breed-specific or custom haircut, nail trim, ear cleaning and a finishing spritz.',
     90, 'scissors', '{"type":"size","sizes":{"Small":45,"Medium":60,"Large":85,"X-Large":110}}', true, 10),
    ('Bath & Tidy', 'Bath, blow-dry, brush-out & nails',
     'A fresh, clean coat without a full haircut - shampoo, conditioner, blow-dry, brush-out, nail trim and ear cleaning.',
     60, 'bath', '{"type":"size","sizes":{"Small":30,"Medium":40,"Large":55,"X-Large":70}}', true, 20),
    ('Puppy''s First Groom', 'A gentle introduction for pups under 6 months',
     'A calm, confidence-building first visit: light bath, gentle brush, sanitary trim, nails and plenty of patience and treats.',
     60, 'puppy', '{"type":"flat","amount":35}', false, 30),
    ('Feline Groom', 'Specialty grooming for cats',
     'Stress-aware grooming for cats - bath, blow-dry, de-matting, nail trim and a tidy sanitary trim by an experienced groomer.',
     75, 'cat', '{"type":"flat","amount":65}', false, 40),
    ('De-Shed Treatment', 'Reduce shedding up to 90%',
     'A deep de-shedding bath with specialized conditioner and tools that lift loose undercoat - perfect for double-coated breeds.',
     75, 'brush', '{"type":"size","sizes":{"Small":42,"Medium":58,"Large":74,"X-Large":90}}', false, 50),
    ('Nail Trim & Paw Care', 'Express paw service - walk-in friendly',
     'A quick, low-stress nail trim, file and paw-pad check. In and out in about twenty minutes.',
     20, 'paw', '{"type":"flat","amount":16}', false, 60),
    ('Spa Refresh Add-On', 'Teeth brushing, blueberry facial & cologne',
     'Add a little luxury to any groom: gentle teeth brushing, a soothing blueberry facial and a light, fresh cologne finish.',
     30, 'sparkle', '{"type":"flat","amount":22}', false, 70);
  end if;

  if not exists (select 1 from public.products) then
    insert into public.products (name, category, brand, price, stock, blurb, rating, featured, badge) values
    ('Holistic Salmon & Sweet Potato Dry Food','Dog Food','Harbor Holistic',64.99,18,'Grain-free, omega-rich kibble for shiny coats and easy digestion.',4.9,true,'Staff pick'),
    ('Grain-Free Chicken Recipe Puppy Food','Dog Food','Little Paws',42.99,12,'Protein-packed nutrition formulated for growing puppies.',4.7,false,null),
    ('Senior Lamb & Rice Formula','Dog Food','Harbor Holistic',54.99,9,'Joint-supporting nutrition for dogs in their golden years.',4.7,false,null),
    ('Indoor Cat Chicken Dry Food','Cat Food','Whiskerton',24.99,22,'Formulated for indoor cats with hairball control and lean protein.',4.7,true,null),
    ('Salmon Pate Wet Food, 12-pack','Cat Food','Whiskerton',19.99,30,'A dozen single-serve tins of smooth, grain-free salmon pate.',4.7,false,null),
    ('Kitten Nutritional Formula','Cat Food','Little Paws',21.99,4,'Calorie-dense kibble to fuel playful, growing kittens.',4.7,false,'Low stock'),
    ('Soft-Baked Peanut Butter Biscuits','Treats','Island Bakehouse',8.49,40,'Oven-baked, soft-textured biscuits made with real peanut butter.',4.7,false,null),
    ('Freeze-Dried Chicken Bites','Treats','Island Bakehouse',12.99,25,'Single-ingredient freeze-dried chicken - a pure, high-value reward.',4.8,true,null),
    ('Dental Chew Sticks, 28 ct','Treats','FreshBite',14.99,17,'Daily chews that help reduce tartar and freshen breath.',4.7,false,null),
    ('Tough Rope Tug Toy','Toys','Romp & Roll',9.99,33,'Braided cotton rope built for tug-of-war and gentle teeth cleaning.',4.7,false,null),
    ('Interactive Treat Puzzle','Toys','BrightMind',16.99,14,'A slide-and-seek puzzle that turns snack time into enrichment.',4.7,true,null),
    ('Catnip Mice, 3-pack','Toys','Whiskerton',6.99,28,'Three plush mice stuffed with potent, premium catnip.',4.7,false,null),
    ('Squeaky Plush Bone','Toys','Romp & Roll',7.49,0,'A soft, squeaky companion for cuddles and play.',4.7,false,'Back soon'),
    ('Cushioned Orthopedic Pet Bed, Medium','Beds & Accessories','NestWell',59.99,7,'Memory-foam base with a washable, plush cover for restful sleep.',4.8,true,'Staff pick'),
    ('Adjustable Reflective Collar','Beds & Accessories','TrailMate',13.99,26,'Night-safe reflective stitching with a secure quick-release buckle.',4.7,false,null),
    ('Hands-Free Padded Leash','Beds & Accessories','TrailMate',22.99,15,'Adjustable waist leash with bungee shock absorption for walks.',4.7,false,null),
    ('Stainless Steel Bowl Set','Beds & Accessories','NestWell',18.99,20,'Two non-slip, dishwasher-safe bowls for food and water.',4.7,false,null),
    ('Travel Water Bottle','Beds & Accessories','TrailMate',11.99,19,'Leak-proof bottle with a fold-out drinking tray for trips out.',4.7,false,null),
    ('Detangling Slicker Brush','Grooming','Posh Pet Spa',15.99,21,'Fine, angled bristles that lift loose hair and ease out mats.',4.7,false,null),
    ('Oatmeal Soothing Shampoo, 16 oz','Grooming','Posh Pet Spa',13.49,24,'Gentle, tear-free oatmeal shampoo for sensitive skin and itch relief.',4.7,true,null),
    ('Nail Clipper & File Set','Grooming','Posh Pet Spa',10.99,16,'Sharp, safety-guarded clippers with a built-in file for tidy paws.',4.7,false,null),
    ('Quick-Dry Microfiber Pet Towel','Grooming','Posh Pet Spa',12.49,13,'Ultra-absorbent towel that cuts drying time after baths.',4.7,false,null),
    ('Tropical Fish Flake Food','Small Pets & Aquatics','AquaLife',7.99,18,'Color-enhancing daily flakes for tropical community aquariums.',4.7,false,null),
    ('Small Animal Timothy Hay, 48 oz','Small Pets & Aquatics','Meadow & Co.',11.99,10,'Sweet, high-fiber hay for rabbits, guinea pigs and chinchillas.',4.7,false,null),
    ('Reptile Calcium Supplement','Small Pets & Aquatics','AquaLife',8.99,6,'Phosphorus-free calcium dust for healthy reptile bones and shells.',4.7,false,null);
  end if;
end $$;

-- ============================================================================
--  Done. Remember to mark your account as admin:
--    update public.profiles set is_admin = true where email = 'YOU@EXAMPLE.COM';
-- ============================================================================
