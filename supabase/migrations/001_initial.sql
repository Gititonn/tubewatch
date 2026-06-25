-- Users (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users(id) primary key,
  email text,
  plan text default 'free', -- 'free' | 'pro'
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

-- YouTube channels connected by users
create table channels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  youtube_channel_id text not null,
  channel_name text,
  channel_thumbnail text,
  subscriber_count bigint,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, youtube_channel_id)
);

-- Video data
create table videos (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references channels(id) on delete cascade,
  youtube_video_id text not null,
  title text,
  published_at timestamptz,
  view_count bigint default 0,
  like_count bigint default 0,
  comment_count bigint default 0,
  duration_seconds int,
  thumbnail_url text,
  outlier_score numeric(5,2),
  updated_at timestamptz default now(),
  unique(channel_id, youtube_video_id)
);

-- Enable RLS
alter table profiles enable row level security;
alter table channels enable row level security;
alter table videos enable row level security;

-- RLS policies
create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users see own channels" on channels for all using (auth.uid() = user_id);
create policy "Users see own videos" on videos for all using (
  channel_id in (select id from channels where user_id = auth.uid())
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
