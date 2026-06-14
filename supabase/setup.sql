-- =============================================================
-- i-live-here · Supabase setup
-- Run this in Supabase Studio → SQL Editor → New query → Run.
-- Safe to re-run: every statement uses if-not-exists / or-replace.
-- =============================================================

-- ---- pins table -----------------------------------------------
create table if not exists public.pins (
  id          uuid        primary key default gen_random_uuid(),
  kind        text        not null check (kind in ('doing','wishlist')),
  title       text        not null,
  note        text        not null default '',
  lng         double precision not null,
  lat         double precision not null,
  author      text        not null default '栖居者',
  image_path  text,
  likes       integer     not null default 0,
  owner_token text        not null,
  created_at  timestamptz not null default now()
);

-- New columns (nullable so historical rows keep parsing).
alter table public.pins
  add column if not exists category text;
-- Drop & recreate the CHECK so re-running the script picks up new categories.
alter table public.pins drop constraint if exists pins_category_check;
alter table public.pins add constraint pins_category_check
  check (category is null or category in ('food','neighborhood','outdoors','fitness','culture','other'));
alter table public.pins
  add column if not exists looking_for_company boolean not null default false;

create index if not exists pins_created_at_idx on public.pins (created_at desc);

-- ---- RLS ------------------------------------------------------
alter table public.pins enable row level security;

-- Anon must not be able to read other people's owner_token.
revoke select on public.pins from anon, authenticated;
grant  select (id, kind, title, note, lng, lat, author, image_path, likes, created_at, category, looking_for_company)
       on public.pins to anon, authenticated;

drop policy if exists "pins are readable by everyone" on public.pins;
create policy "pins are readable by everyone"
  on public.pins for select
  using (true);

drop policy if exists "pins are insertable by everyone" on public.pins;
create policy "pins are insertable by everyone"
  on public.pins for insert
  with check (true);

-- Direct UPDATE/DELETE from clients is intentionally disabled.
-- Likes go through toggle_pin_like(), deletes go through delete_pin().

-- ---- like RPC -------------------------------------------------
create or replace function public.toggle_pin_like(p_id uuid, p_delta int)
  returns integer
  language sql
  security definer
  set search_path = public
as $$
  update public.pins
    set likes = greatest(0, likes + p_delta)
    where id = p_id
    returning likes;
$$;

grant execute on function public.toggle_pin_like(uuid, int) to anon, authenticated;

-- ---- delete RPC (owner-token gated) ---------------------------
create or replace function public.delete_pin(p_id uuid, p_token text)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from public.pins
    where id = p_id and owner_token = p_token;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.delete_pin(uuid, text) to anon, authenticated;

-- ---- realtime -------------------------------------------------
alter publication supabase_realtime add table public.pins;

-- ---- storage bucket ------------------------------------------
insert into storage.buckets (id, name, public)
  values ('pin-images', 'pin-images', true)
  on conflict (id) do nothing;

drop policy if exists "anyone can upload pin images" on storage.objects;
create policy "anyone can upload pin images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'pin-images');

drop policy if exists "anyone can read pin images" on storage.objects;
create policy "anyone can read pin images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'pin-images');

-- Storage API-side cleanup. The policy only allows deleting an object whose
-- name is no longer referenced by any pin — so a malicious client can't drop
-- someone else's live photo, but the post-delete cleanup in the app works.
drop policy if exists "anyone can delete orphan pin images" on storage.objects;
create policy "anyone can delete orphan pin images"
  on storage.objects for delete
  to anon, authenticated
  using (
    bucket_id = 'pin-images'
    and not exists (
      select 1 from public.pins where image_path = storage.objects.name
    )
  );
