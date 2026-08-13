-- Allow beer logs and map pubs outside the original three trip cities.
-- Run this once in Supabase SQL Editor.

do $$
begin
  alter table public.beer_logs drop constraint if exists beer_logs_city_check;
  alter table public.beer_logs drop constraint if exists beer_logs_city_check1;
  alter table public.pubs drop constraint if exists pubs_city_check;
  alter table public.pubs drop constraint if exists pubs_city_check1;
end $$;
