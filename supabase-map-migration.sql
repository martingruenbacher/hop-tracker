-- Optional Beer Map migration for an existing Hop Tracker database.
-- Run this entire file once in Supabase SQL Editor.

create table if not exists public.pubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null check (city in ('Český Krumlov', 'České Budějovice', 'Prague')),
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now() not null
);

alter table public.pubs enable row level security;

alter table public.beer_logs
  add column if not exists pub_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'beer_logs_pub_id_fkey'
      and conrelid = 'public.beer_logs'::regclass
  ) then
    alter table public.beer_logs
      add constraint beer_logs_pub_id_fkey
      foreign key (pub_id) references public.pubs(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pubs'
      and policyname = 'Mapped pubs are viewable by authenticated users'
  ) then
    create policy "Mapped pubs are viewable by authenticated users"
      on public.pubs for select
      to authenticated using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'pubs'
      and policyname = 'Users can add mapped pubs'
  ) then
    create policy "Users can add mapped pubs"
      on public.pubs for insert
      to authenticated with check (true);
  end if;
end $$;

insert into public.pubs (name, city, latitude, longitude)
select * from (values
  ('Eggenberg Brewery', 'Český Krumlov', 48.8106, 14.3153),
  ('Masne Kramy', 'České Budějovice', 48.9745, 14.4742),
  ('Budvar Visitor Centre', 'České Budějovice', 48.9920, 14.4682),
  ('U Fleku', 'Prague', 50.0812, 14.4183),
  ('U Medvidku', 'Prague', 50.0835, 14.4186),
  ('BeerGeek Bar', 'Prague', 50.0756, 14.4515)
) as seed(name, city, latitude, longitude)
where not exists (
  select 1 from public.pubs existing
  where existing.name = seed.name and existing.city = seed.city
);
