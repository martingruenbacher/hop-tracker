-- Support hidden achievements that depend on leaderboard history.
-- Run this once in the Supabase SQL Editor.
-- Also set NEXT_PUBLIC_TRIP_END_DATE=YYYY-MM-DD in the app environment.

create table if not exists public.leaderboard_rank_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rank integer not null check (rank > 0),
  total_beers integer not null check (total_beers >= 0),
  captured_at timestamptz default now() not null
);

alter table public.leaderboard_rank_snapshots enable row level security;

create policy "Users can view their own leaderboard history"
  on public.leaderboard_rank_snapshots for select
  to authenticated using (auth.uid() = user_id);

create or replace function public.capture_leaderboard_ranks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard_rank_snapshots (user_id, rank, total_beers)
  select
    profiles.id,
    rank() over (order by count(beer_logs.id) desc),
    count(beer_logs.id)::integer
  from public.profiles
  left join public.beer_logs on beer_logs.user_id = profiles.id
  group by profiles.id;
  return new;
end;
$$;

drop trigger if exists capture_leaderboard_ranks_after_beer on public.beer_logs;
create trigger capture_leaderboard_ranks_after_beer
after insert on public.beer_logs
for each row execute function public.capture_leaderboard_ranks();
