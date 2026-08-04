-- Join requests + owner authority (kick / dissolve)
-- Depends on 20260324120000_mvp_schema.sql

-- ---------------------------------------------------------------------------
-- team_join_requests
-- ---------------------------------------------------------------------------
create table if not exists public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists team_join_requests_team_status_idx
  on public.team_join_requests (team_id, status);

alter table public.team_join_requests enable row level security;

-- Helper: is team owner
create or replace function public.is_team_owner(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = t_id
      and t.owner_id = auth.uid()
  );
$$;

-- Readable: requester, team owner, or team members
drop policy if exists "team_join_requests_select" on public.team_join_requests;
create policy "team_join_requests_select"
  on public.team_join_requests for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_team_owner(team_id)
    or public.is_team_member(team_id)
  );

-- Anyone authenticated can create a pending request for themselves
drop policy if exists "team_join_requests_insert_self" on public.team_join_requests;
create policy "team_join_requests_insert_self"
  on public.team_join_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

-- Owner updates status (approve / reject); requester can re-request (pending)
drop policy if exists "team_join_requests_update" on public.team_join_requests;
create policy "team_join_requests_update"
  on public.team_join_requests for update to authenticated
  using (
    public.is_team_owner(team_id)
    or user_id = auth.uid()
  )
  with check (
    public.is_team_owner(team_id)
    or (user_id = auth.uid() and status = 'pending')
  );

-- ---------------------------------------------------------------------------
-- Teams: owner can delete (dissolve)
-- ---------------------------------------------------------------------------
drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
  on public.teams for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- team_members: owner can add (approve) and kick; self leave still ok
-- ---------------------------------------------------------------------------
drop policy if exists "team_members_insert_self" on public.team_members;
create policy "team_members_insert_member_or_owner"
  on public.team_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_team_owner(team_id)
  );

drop policy if exists "team_members_delete_self" on public.team_members;
create policy "team_members_delete_self_or_owner"
  on public.team_members for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_team_owner(team_id)
  );
