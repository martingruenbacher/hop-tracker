-- Add beer volume support to an existing Hop Tracker database.
-- Run this once in the Supabase SQL Editor.

alter table public.beer_logs
  add column if not exists volume_liters numeric not null default 0.5;

alter table public.beer_logs
  drop constraint if exists beer_logs_volume_liters_check;

alter table public.beer_logs
  add constraint beer_logs_volume_liters_check
  check (volume_liters > 0 and volume_liters <= 5);