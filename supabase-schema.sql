-- Run this in your Supabase SQL editor

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  player_name text not null unique,
  avatar_url text,
  weight_kg numeric not null default 80,
  sex text not null default 'male' check (sex in ('male', 'female')),
  created_at timestamptz default now() not null
);

-- Beer logs
create table public.beer_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  beer_name text not null,
  brewery text,
  style text,
  rating integer not null check (rating between 1 and 5),
  city text,
  bar_name text,
  notes text,
  photo_url text,
  pub_id uuid,
  created_at timestamptz default now() not null
);

-- Optional map checkpoints
create table public.pubs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  city text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz default now() not null
);

alter table public.beer_logs
  add constraint beer_logs_pub_id_fkey foreign key (pub_id) references public.pubs(id) on delete set null;

-- Achievements
create table public.achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamptz default now() not null,
  unique (user_id, achievement_key)
);

-- Daily challenge history and points
create table public.challenge_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  challenge_key text not null,
  challenge_date date not null,
  points integer not null check (points > 0),
  completed_at timestamptz default now() not null,
  unique (user_id, challenge_key, challenge_date)
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.beer_logs enable row level security;
alter table public.pubs enable row level security;
alter table public.achievements enable row level security;
alter table public.challenge_completions enable row level security;

-- Profiles: anyone authenticated can read, only owner can update
create policy "Public profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated using (auth.uid() = id);

-- Beer logs: all authenticated can read, only owner can insert/update/delete
create policy "Beer logs are viewable by authenticated users"
  on public.beer_logs for select
  to authenticated using (true);

create policy "Users can insert their own beer logs"
  on public.beer_logs for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own beer logs"
  on public.beer_logs for update
  to authenticated using (auth.uid() = user_id);

create policy "Users can delete their own beer logs"
  on public.beer_logs for delete
  to authenticated using (auth.uid() = user_id);

create policy "Mapped pubs are viewable by authenticated users"
  on public.pubs for select
  to authenticated using (true);

create policy "Users can add mapped pubs"
  on public.pubs for insert
  to authenticated with check (true);

-- Achievements: all authenticated can read, only owner can insert
create policy "Achievements are viewable by authenticated users"
  on public.achievements for select
  to authenticated using (true);

create policy "Users can insert their own achievements"
  on public.achievements for insert
  to authenticated with check (auth.uid() = user_id);

create policy "Users can delete their own achievements"
  on public.achievements for delete
  to authenticated using (auth.uid() = user_id);

create policy "Challenge completions are viewable by authenticated users"
  on public.challenge_completions for select
  to authenticated using (true);

create policy "Users can insert their own challenge completions"
  on public.challenge_completions for insert
  to authenticated with check (auth.uid() = user_id);

-- Starter checkpoints; approximate coordinates keep the optional feature useful immediately.
insert into public.pubs (name, city, latitude, longitude) values
  ('Eggenberg Brewery', 'Český Krumlov', 48.8106, 14.3153),
  ('Masne Kramy', 'České Budějovice', 48.9745, 14.4742),
  ('Budvar Visitor Centre', 'České Budějovice', 48.9920, 14.4682),
  ('U Fleku', 'Prague', 50.0812, 14.4183),
  ('U Medvidku', 'Prague', 50.0835, 14.4186),
  ('BeerGeek Bar', 'Prague', 50.0756, 14.4515);

-- Enable live dashboard updates for beer logs
alter publication supabase_realtime add table public.beer_logs;

-- Storage bucket for avatars and beer photos
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('beer-photos', 'beer-photos', true);

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Beer photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'beer-photos');

create policy "Users can upload beer photos"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'beer-photos');

-- Trigger to auto-create profile placeholder on signup (optional, we handle it in app)
-- create function public.handle_new_user() ...
