-- 001_initial.sql
-- Tunet Cup App – grunnschema, RLS, storage, realtime

-- Cup (én aktiv cup per slug, f.eks. "active")
create table if not exists public.cups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null default 'Tunet Cup',
  team_count int not null default 8,
  schedule_params jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references public.cups(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references public.cups(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete cascade,
  start_time timestamptz not null,
  round int
);

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references public.cups(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  description text,
  available boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid not null references public.cups(id) on delete cascade,
  name text not null,
  logo_url text not null,
  sort_order int not null default 0
);

-- Seed aktiv cup
insert into public.cups (slug, name, team_count)
values ('active', 'Tunet Cup', 8)
on conflict (slug) do nothing;

-- Storage bucket for sponsorlogoer
insert into storage.buckets (id, name, public)
values ('sponsors', 'sponsors', true)
on conflict (id) do nothing;

-- RLS
alter table public.cups enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.shop_items enable row level security;
alter table public.sponsors enable row level security;

-- Alle kan lese
create policy "Public read cups" on public.cups for select using (true);
create policy "Public read teams" on public.teams for select using (true);
create policy "Public read matches" on public.matches for select using (true);
create policy "Public read shop_items" on public.shop_items for select using (true);
create policy "Public read sponsors" on public.sponsors for select using (true);

-- Kun innloggede admin kan skrive
create policy "Auth write cups" on public.cups for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write teams" on public.teams for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write matches" on public.matches for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write shop_items" on public.shop_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "Auth write sponsors" on public.sponsors for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage: les for alle, skriv for admin
create policy "Public read sponsor images"
  on storage.objects for select
  using (bucket_id = 'sponsors');

create policy "Auth upload sponsor images"
  on storage.objects for insert
  with check (bucket_id = 'sponsors' and auth.role() = 'authenticated');

create policy "Auth update sponsor images"
  on storage.objects for update
  using (bucket_id = 'sponsors' and auth.role() = 'authenticated');

create policy "Auth delete sponsor images"
  on storage.objects for delete
  using (bucket_id = 'sponsors' and auth.role() = 'authenticated');

-- Realtime (aktiver i Dashboard → Database → Replication hvis nødvendig)
alter publication supabase_realtime add table public.cups;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.shop_items;
alter publication supabase_realtime add table public.sponsors;
