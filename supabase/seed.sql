-- Seed optionnel (démo) — À exécuter APRÈS avoir créé des comptes auth.
-- Les profils sont liés à auth.users : tu ne peux pas seeder des UUID arbitraires
-- sans utilisateurs Auth correspondants.
--
-- Comment démarrer :
-- 1. Dans Authentication → Users, crée 2–3 utilisateurs (email/password).
-- 2. Remplace les UUID ci-dessous par les vrais `id` de auth.users.
-- 3. Exécute ce fichier dans le SQL Editor Supabase.
--
-- Exemple (à adapter) :

/*
-- Remplace ces UUID par ceux de Authentication → Users
-- \set lea   '00000000-0000-0000-0000-000000000001'
-- \set noah  '00000000-0000-0000-0000-000000000002'

update public.profiles
set
  name = 'Léa',
  city = 'Lyon',
  bio = 'Valorant ranked le soir, muscu le matin.',
  avatar_color = '#0F8F8A',
  avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
  level = 'intermediaire',
  vibe = 'fun',
  reliability = 92,
  languages = array['Français'],
  onboarding_complete = true
where id = 'REPLACE_LEA_USER_UUID';

insert into public.profile_universes (profile_id, universe) values
  ('REPLACE_LEA_USER_UUID', 'gaming'),
  ('REPLACE_LEA_USER_UUID', 'sports')
on conflict do nothing;

insert into public.profile_interests (profile_id, interest) values
  ('REPLACE_LEA_USER_UUID', 'Valorant'),
  ('REPLACE_LEA_USER_UUID', 'Musculation')
on conflict do nothing;

insert into public.profile_availability (profile_id, slot) values
  ('REPLACE_LEA_USER_UUID', 'soir'),
  ('REPLACE_LEA_USER_UUID', 'week-end')
on conflict do nothing;

insert into public.profile_objectives (profile_id, objective) values
  ('REPLACE_LEA_USER_UUID', 'S’amuser'),
  ('REPLACE_LEA_USER_UUID', 'Trouver une team fixe')
on conflict do nothing;

insert into public.profile_platforms (profile_id, platform) values
  ('REPLACE_LEA_USER_UUID', 'pc')
on conflict do nothing;
*/

-- Sans comptes Auth pré-créés, utilise plutôt le mode démo de l’app
-- (lea@jumelo.app) qui ne nécessite pas Supabase.
