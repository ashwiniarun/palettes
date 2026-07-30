# Face Tags

Real Expo Router app, wired to Supabase. Closet tab is fully working end to
end — list, categorized, add-product with live search against a shared
products catalog. Feed/Friends/You are stubbed with notes on the exact
Supabase query pattern to copy from closet.tsx.

## Setup
1. Run the SQL in `schema.sql` (in your Supabase project's SQL Editor)
   before anything else — every screen depends on these tables existing.
2. Copy `.env.example` to `.env` and fill in your Supabase project URL + anon
   key (Project Settings → API).
3. `npm install`
4. `npx expo start` — scan the QR with Expo Go on your phone, or press `w`
   for the web version.

## Why closet.tsx is the one to study
It's the reference pattern for the whole app:
- Reads via a Supabase join (`closet_items` → `products`) — no manual
  matching, just a foreign key.
- Writes via "search the shared catalog first, only insert a new `products`
  row if nothing matches" — this is the actual fix for the text-matching
  problem the HTML prototype only partially solved with a datalist.
- Everything else (feed, friends, dupes, ratings, twin score) is the same
  shape: query with a join, render a list, write through a small form.
  Copy this file's structure rather than starting from scratch.

## Next screens to build, in order
1. Auth screen (Supabase email/magic-link → insert into `profiles`)
2. You tab — same query shape as Closet, plus a `looks` query for your posts
3. Post-a-look flow — image picker → Storage upload → insert `looks` +
   `look_products`
4. Friends tab — search `profiles`, insert/accept `friendships`
5. Feed tab — `looks` joined against accepted `friendships`
