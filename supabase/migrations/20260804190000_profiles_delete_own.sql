-- Allow authenticated users to delete their own profile (account deletion UX).
-- Related rows cascade via FK. auth.users cleanup may still need an Edge Function.

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());
