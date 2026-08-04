-- Allow multi-vibe profiles: profiles.vibe stores comma-separated ids
-- (e.g. "serieux,casual,competitif"). Legacy single values remain valid.

alter table public.profiles drop constraint if exists profiles_vibe_check;
