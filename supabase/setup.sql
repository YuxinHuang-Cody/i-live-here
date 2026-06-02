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

create index if not exists pins_created_at_idx on public.pins (created_at desc);

-- ---- RLS ------------------------------------------------------
alter table public.pins enable row level security;

-- Anon must not be able to read other people's owner_token.
revoke select on public.pins from anon, authenticated;
grant  select (id, kind, title, note, lng, lat, author, image_path, likes, created_at)
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
