-- Harden RLS: no open self-join on teams; tighten conversation member invites.

-- ---------------------------------------------------------------------------
-- team_members: only owner (or approved join request) may add members
-- ---------------------------------------------------------------------------
drop policy if exists "team_members_insert_member_or_owner" on public.team_members;
drop policy if exists "team_members_insert_self" on public.team_members;

create policy "team_members_insert_owner_or_approved"
  on public.team_members for insert to authenticated
  with check (
    public.is_team_owner(team_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1
        from public.team_join_requests r
        where r.team_id = team_members.team_id
          and r.user_id = auth.uid()
          and r.status = 'approved'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- conversation_members: self-join OK; peer invite only for new DMs (< 2 members);
-- team owners may add members to team group chats
-- ---------------------------------------------------------------------------
drop policy if exists "conversation_members_insert" on public.conversation_members;

create policy "conversation_members_insert"
  on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or (
      public.is_conversation_member(conversation_id)
      and (
        select count(*)::int
        from public.conversation_members cm
        where cm.conversation_id = conversation_members.conversation_id
      ) < 2
    )
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.team_id is not null
        and public.is_team_owner(c.team_id)
    )
  );

-- ---------------------------------------------------------------------------
-- messages: refuse empty bodies
-- ---------------------------------------------------------------------------
alter table public.messages
  drop constraint if exists messages_body_not_blank;

alter table public.messages
  add constraint messages_body_not_blank
  check (char_length(trim(body)) > 0);
