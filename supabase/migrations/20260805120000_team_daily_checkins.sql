-- Check-ins quotidiens mutuels : les deux membres doivent cocher pour valider la journée.
create table if not exists public.team_daily_checkins (
  id          uuid      primary key default gen_random_uuid(),
  team_id     uuid      not null references public.teams(id) on delete cascade,
  user_id     uuid      not null,
  date        date      not null default current_date,
  created_at  timestamptz not null default now(),
  unique (team_id, user_id, date)
);

alter table public.team_daily_checkins enable row level security;

create policy "checkin_insert_own" on public.team_daily_checkins
  for insert with check (auth.uid() = user_id);

create policy "checkin_select_member" on public.team_daily_checkins
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.team_members
      where team_members.team_id = team_daily_checkins.team_id
      and   team_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.teams
      where teams.id        = team_daily_checkins.team_id
      and   teams.owner_id  = auth.uid()
    )
  );

grant select, insert on public.team_daily_checkins to authenticated;
