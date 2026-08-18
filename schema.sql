-- Face Tags — Supabase schema
-- Paste this into the Supabase SQL Editor (Project → SQL Editor → New query) and run it.
-- Maps directly onto the prototype: users, closet items, dupes, looks, and friendships.

-- 1. Users (extends Supabase's built-in auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  bio text,
  avatar_color text default '#5B2333',
  created_at timestamptz default now()
);

-- 2. Products — the shared catalog. This is the answer to "how does the app
--    know what product you mean": there is exactly ONE row per real-world
--    product, and every user's closet item, dupe, and tagged look points at
--    it by id. Matching only ever happens once — at search time, when you're
--    adding something — never again after that.
create table products (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  name text not null,           -- e.g. "cream blush · petal"
  category text not null,       -- skincare, base, face, contour, blush, eyes, brow, lips, setting spray
  default_color text default '#D4A5A5',
  barcode text,                 -- UPC/EAN from barcode scan, so a scan skips search entirely next time
  link text,                    -- optional buy-it-here URL, shown to anyone viewing the product
  created_at timestamptz default now()
);
-- DB-level guard against exact duplicate rows — Postgres table constraints
-- can't take expressions like lower(), so this has to be a unique index
-- instead of `unique(...)` inside the table definition above.
create unique index idx_products_brand_name_unique on products (lower(brand), lower(name));
-- partial index (not all products have a barcode) so barcode lookups stay O(1) as the catalog grows
create unique index idx_products_barcode_unique on products (barcode) where barcode is not null;
-- trigram index so "search as you type" (ilike '%rare beauty%') stays fast as the catalog grows
create extension if not exists pg_trgm;
create index idx_products_brand_trgm on products using gin (brand gin_trgm_ops);
create index idx_products_name_trgm on products using gin (name gin_trgm_ops);

-- 3. Closet items — a user owning a product. All the personal data
--    (price paid, rating, wear count) lives here; the product identity lives
--    in `products`.
create table closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  color text,                    -- optional per-user swatch override
  price numeric,
  status text default 'active' check (status in ('active','low','empty')),
  times_worn int default 0,
  last_used text,
  rating int check (rating between 1 and 10),
  review text,
  created_at timestamptz default now(),
  unique (user_id, product_id)   -- can't add the same product to your closet twice
);
create index idx_closet_items_user on closet_items(user_id);
create index idx_closet_items_product on closet_items(product_id);

-- 4. Dupes — also point at a real product, not free text, so "friend logged
--    this dupe" and "do I already own the dupe" are exact-match lookups.
create table dupes (
  id uuid primary key default gen_random_uuid(),
  closet_item_id uuid references closet_items(id) on delete cascade not null,
  dupe_product_id uuid references products(id) not null,
  created_at timestamptz default now()
);
create index idx_dupes_closet_item on dupes(closet_item_id);

-- 5. Looks (posts)
create table looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  caption text not null,
  photo_url text not null,     -- Supabase Storage URL
  likes_count int default 0,
  created_at timestamptz default now()
);
create index idx_looks_user on looks(user_id);

-- 6. Products tagged on a look — links back to the poster's own closet item
--    (this is what makes "used in these looks" and dupe lookups work correctly,
--     instead of matching on freeform text)
create table look_products (
  id uuid primary key default gen_random_uuid(),
  look_id uuid references looks(id) on delete cascade not null,
  closet_item_id uuid references closet_items(id) on delete cascade not null
);
create index idx_look_products_look on look_products(look_id);
create index idx_look_products_closet_item on look_products(closet_item_id);

-- 7. Likes (so you can tell who liked what, and prevent double-likes)
create table likes (
  user_id uuid references profiles(id) on delete cascade,
  look_id uuid references looks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, look_id)
);

-- 8. Friendships — one row per pair, status tracks the request lifecycle
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete cascade not null,
  addressee_id uuid references profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);
create index idx_friendships_requester on friendships(requester_id);
create index idx_friendships_addressee on friendships(addressee_id);

-- ── Row Level Security ──────────────────────────────────────────────
-- Turn this on before you have real users. Baseline policies below:
-- profiles/looks/closet visible to the owner + accepted friends only;
-- everyone can read their own everything.

alter table profiles enable row level security;
alter table closet_items enable row level security;
alter table dupes enable row level security;
alter table looks enable row level security;
alter table look_products enable row level security;
alter table likes enable row level security;
alter table friendships enable row level security;

-- Helper: is user A friends with user B?
create or replace function is_friend(a uuid, b uuid) returns boolean as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
    and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$ language sql stable;

create policy "own profile always visible" on profiles
  for select using (true); -- handles/bios are fine to be publicly readable for search

create policy "closet visible to self and friends" on closet_items
  for select using (user_id = auth.uid() or is_friend(auth.uid(), user_id));
create policy "manage own closet" on closet_items
  for all using (user_id = auth.uid());

create policy "looks visible to self and friends" on looks
  for select using (user_id = auth.uid() or is_friend(auth.uid(), user_id));
create policy "manage own looks" on looks
  for all using (user_id = auth.uid());

-- (Repeat the same self-or-friend pattern for dupes, look_products, likes as you build them out.)

-- ── Migration: barcode scanning (run this once against an existing DB) ──────
-- alter table products add column if not exists barcode text;
-- create unique index if not exists idx_products_barcode_unique on products (barcode) where barcode is not null;

-- ── Migration: buy-it-here product links (run this once against an existing DB) ──
-- alter table products add column if not exists link text;