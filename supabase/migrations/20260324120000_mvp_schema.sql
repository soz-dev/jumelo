-- Jumelo MVP schema + RLS
-- Apply via Supabase SQL editor or: supabase db push / supabase migration up

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  city text not null default '',
  bio text not null default '',
  avatar_url text,
  avatar_color text not null default '#0F8F8A',
  level text not null default 'intermediaire'
    check (level in ('debutant', 'intermediaire', 'avance', 'pro')),
  vibe text not null default 'social'
    check (vibe in ('chill', 'competitif', 'social', 'serieux', 'creatif', 'fun', 'casual', 'mentorat')),
  reliability integer not null default 80 check (reliability between 0 and 100),
  theme_id text not null default 'teal',
  onboarding_complete boolean not null default false,
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profile junction tables
create table if not exists public.profile_universes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  universe text not null,
  primary key (profile_id, universe)
);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest text not null,
  primary key (profile_id, interest)
);

create table if not exists public.profile_platforms (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  primary key (profile_id, platform)
);

create table if not exists public.profile_availability (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  slot text not null,
  primary key (profile_id, slot)
);

create table if not exists public.profile_objectives (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  objective text not null,
  primary key (profile_id, objective)
);

-- ---------------------------------------------------------------------------
-- Likes & matches
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  score integer,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  universe text not null,
  activity text not null default '',
  city text not null default '',
  level_label text not null default '',
  vibe text not null default '',
  next_session text,
  blurb text not null default '',
  capacity integer not null default 5,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  team_id uuid references public.teams (id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Helpers for RLS
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conv_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_member(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = t_id
      and tm.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_universes enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_platforms enable row level security;
alter table public.profile_availability enable row level security;
alter table public.profile_objectives enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Profiles: authenticated users can read public profiles; update own only
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Junction tables: readable by authenticated; writable by owner
drop policy if exists "profile_universes_select" on public.profile_universes;
create policy "profile_universes_select"
  on public.profile_universes for select to authenticated using (true);
drop policy if exists "profile_universes_write_own" on public.profile_universes;
create policy "profile_universes_write_own"
  on public.profile_universes for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_interests_select" on public.profile_interests;
create policy "profile_interests_select"
  on public.profile_interests for select to authenticated using (true);
drop policy if exists "profile_interests_write_own" on public.profile_interests;
create policy "profile_interests_write_own"
  on public.profile_interests for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_platforms_select" on public.profile_platforms;
create policy "profile_platforms_select"
  on public.profile_platforms for select to authenticated using (true);
drop policy if exists "profile_platforms_write_own" on public.profile_platforms;
create policy "profile_platforms_write_own"
  on public.profile_platforms for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_availability_select" on public.profile_availability;
create policy "profile_availability_select"
  on public.profile_availability for select to authenticated using (true);
drop policy if exists "profile_availability_write_own" on public.profile_availability;
create policy "profile_availability_write_own"
  on public.profile_availability for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "profile_objectives_select" on public.profile_objectives;
create policy "profile_objectives_select"
  on public.profile_objectives for select to authenticated using (true);
drop policy if exists "profile_objectives_write_own" on public.profile_objectives;
create policy "profile_objectives_write_own"
  on public.profile_objectives for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Likes
drop policy if exists "likes_select_involved" on public.likes;
create policy "likes_select_involved"
  on public.likes for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
  on public.likes for insert to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
  on public.likes for delete to authenticated
  using (from_user_id = auth.uid());

-- Matches: participants only
drop policy if exists "matches_select_involved" on public.matches;
create policy "matches_select_involved"
  on public.matches for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "matches_insert_involved" on public.matches;
create policy "matches_insert_involved"
  on public.matches for insert to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

-- Teams: readable by authenticated; members manage membership; owner inserts
drop policy if exists "teams_select" on public.teams;
create policy "teams_select"
  on public.teams for select to authenticated using (true);

drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert"
  on public.teams for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "teams_update_owner" on public.teams;
create policy "teams_update_owner"
  on public.teams for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select"
  on public.team_members for select to authenticated using (true);

drop policy if exists "team_members_insert_self" on public.team_members;
create policy "team_members_insert_self"
  on public.team_members for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "team_members_delete_self" on public.team_members;
create policy "team_members_delete_self"
  on public.team_members for delete to authenticated
  using (user_id = auth.uid() or public.is_team_member(team_id));

-- Conversations / messages: members only
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "conversations_insert_auth" on public.conversations;
create policy "conversations_insert_auth"
  on public.conversations for insert to authenticated
  with check (true);

drop policy if exists "conversations_update_member" on public.conversations;
create policy "conversations_update_member"
  on public.conversations for update to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "conversation_members_select" on public.conversation_members;
create policy "conversation_members_select"
  on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id) or user_id = auth.uid());

drop policy if exists "conversation_members_insert" on public.conversation_members;
create policy "conversation_members_insert"
  on public.conversation_members for insert to authenticated
  with check (user_id = auth.uid() or public.is_conversation_member(conversation_id));

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );
