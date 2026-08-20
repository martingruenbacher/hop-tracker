-- Add comments to shared beer photos.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.photo_comments (
  id uuid default gen_random_uuid() primary key,
  beer_log_id uuid references public.beer_logs(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  comment text not null check (char_length(trim(comment)) between 1 and 500),
  created_at timestamptz default now() not null
);

create index if not exists photo_comments_beer_log_id_idx
  on public.photo_comments (beer_log_id, created_at);

alter table public.photo_comments enable row level security;

create policy "Photo comments are viewable by authenticated users"
  on public.photo_comments for select
  to authenticated using (true);

create policy "Users can add their own photo comments"
  on public.photo_comments for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own photo comments"
  on public.photo_comments for update
  to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own photo comments"
  on public.photo_comments for delete
  to authenticated using (auth.uid() = user_id);
