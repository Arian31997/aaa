-- VMP tables (Supabase > SQL Editor, after schema.sql). Safe to run more than once.
-- mirrors the main Himalaya site: tickets (= messages), blog (= news), orders (= registrations for shop)

-- ---------- Tickets ----------
create table if not exists public.vmp_tickets (
  id uuid primary key default gen_random_uuid(),
  user_name text not null check (char_length(user_name) <= 60),
  user_email text not null check (char_length(user_email) <= 80),
  subject text not null check (char_length(subject) <= 80),
  body text not null check (char_length(body) <= 1000),
  status text not null default 'open' check (status in ('open','answered','closed')),
  answer text check (char_length(answer) <= 1000),
  created_at timestamptz default now()
);

-- ---------- Blog / news ----------
create table if not exists public.vmp_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 80),
  body text not null check (char_length(body) <= 300),
  created_at timestamptz default now()
);

-- ---------- Shop orders ----------
create table if not exists public.vmp_orders (
  id uuid primary key default gen_random_uuid(),
  user_name text not null check (char_length(user_name) <= 60),
  user_email text not null check (char_length(user_email) <= 80),
  plan text not null check (char_length(plan) <= 40),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

alter table public.vmp_tickets enable row level security;
alter table public.vmp_news enable row level security;
alter table public.vmp_orders enable row level security;

-- Tickets: anyone may insert an open ticket; admins manage the rest
drop policy if exists "vmp_tickets insert" on public.vmp_tickets;
drop policy if exists "vmp_tickets read own" on public.vmp_tickets;
drop policy if exists "vmp_tickets admin all" on public.vmp_tickets;
drop policy if exists "vmp_tickets update admin" on public.vmp_tickets;
drop policy if exists "vmp_tickets delete admin" on public.vmp_tickets;
create policy "vmp_tickets insert" on public.vmp_tickets for insert to anon, authenticated with check (status = 'open');
create policy "vmp_tickets read own" on public.vmp_tickets for select to anon, authenticated using (true);
create policy "vmp_tickets admin all" on public.vmp_tickets for select to authenticated using (public.is_admin());
create policy "vmp_tickets update admin" on public.vmp_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vmp_tickets delete admin" on public.vmp_tickets for delete to authenticated using (public.is_admin());

-- News: public read, admin write (like main site news)
drop policy if exists "vmp_news read" on public.vmp_news;
drop policy if exists "vmp_news insert admin" on public.vmp_news;
drop policy if exists "vmp_news delete admin" on public.vmp_news;
create policy "vmp_news read" on public.vmp_news for select to anon, authenticated using (true);
create policy "vmp_news insert admin" on public.vmp_news for insert to authenticated with check (public.is_admin());
create policy "vmp_news delete admin" on public.vmp_news for delete to authenticated using (public.is_admin());

-- Orders: any visitor may insert a pending order; admins manage
drop policy if exists "vmp_orders insert" on public.vmp_orders;
drop policy if exists "vmp_orders read" on public.vmp_orders;
drop policy if exists "vmp_orders update admin" on public.vmp_orders;
drop policy if exists "vmp_orders delete admin" on public.vmp_orders;
create policy "vmp_orders insert" on public.vmp_orders for insert to anon, authenticated with check (status = 'pending');
create policy "vmp_orders read" on public.vmp_orders for select to anon, authenticated using (true);
create policy "vmp_orders update admin" on public.vmp_orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vmp_orders delete admin" on public.vmp_orders for delete to authenticated using (public.is_admin());

notify pgrst, 'reload schema';

-- ---------- Admins (login for the in-site VMP panel; plaintext never stored) ----------
create table if not exists public.vmp_admins (
  email text primary key,
  pass_hash text not null check (char_length(pass_hash) = 64),
  created_at timestamptz default now()
);
alter table public.vmp_admins enable row level security;
-- password check without exposing the table: true when email+sha256 match
create or replace function public.vmp_admin_check(p_email text, p_hash text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.vmp_admins where email = p_email and pass_hash = p_hash);
$$;
grant execute on function public.vmp_admin_check(text, text) to anon, authenticated;
drop policy if exists "vmp_admins admin all" on public.vmp_admins;
create policy "vmp_admins admin all" on public.vmp_admins for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- seed manager (SHA-256 hex of the password; re-run keeps existing row):
insert into public.vmp_admins(email, pass_hash) values ('admin@himalaya.admin', '2f9d535fd575e3bb5986eec43bf4d06d32412845460b558ff4a210fb1242dc9b')
on conflict (email) do nothing;

-- ---------- Shop items (title + price + stock) ----------
create table if not exists public.vmp_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 60),
  sub text not null default '' check (char_length(sub) <= 80),
  price int not null default 0 check (price >= 0),
  in_stock boolean not null default true,
  created_at timestamptz default now()
);
alter table public.vmp_items enable row level security;
drop policy if exists "vmp_items read" on public.vmp_items;
drop policy if exists "vmp_items insert admin" on public.vmp_items;
drop policy if exists "vmp_items update admin" on public.vmp_items;
drop policy if exists "vmp_items delete admin" on public.vmp_items;
create policy "vmp_items read" on public.vmp_items for select to anon, authenticated using (true);
create policy "vmp_items insert admin" on public.vmp_items for insert to authenticated with check (public.is_admin());
create policy "vmp_items update admin" on public.vmp_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vmp_items delete admin" on public.vmp_items for delete to authenticated using (public.is_admin());

-- orders: keep price snapshot
alter table public.vmp_orders add column if not exists price int not null default 0;

notify pgrst, 'reload schema';
