-- Age for matching algorithm (optional at DB level; app collects it in onboarding).
alter table public.profiles
  add column if not exists age integer
  check (age is null or (age >= 13 and age <= 100));
