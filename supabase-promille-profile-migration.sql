-- Add personal promille settings to an existing Hop Tracker database.
-- Run this once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists weight_kg numeric not null default 80;

alter table public.profiles
  add column if not exists sex text not null default 'male';

alter table public.profiles
  drop constraint if exists profiles_sex_check;

alter table public.profiles
  add constraint profiles_sex_check check (sex in ('male', 'female'));
