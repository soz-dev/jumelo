import type {
  Availability,
  Level,
  PlatformId,
  UniverseId,
  Vibe,
} from '../../constants/catalog';
import type { ThemeId } from '../../constants/theme';
import type { UserProfile } from '../../data/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { canWriteSupabaseUserId } from '../userIds';
import { serializeVibes } from '../vibes';
import { mapProfileRow, type ProfileRow } from './types';

async function fetchRelations(profileId: string) {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      universes: [] as UniverseId[],
      interests: [] as string[],
      platforms: [] as PlatformId[],
      availability: [] as Availability[],
      objectives: [] as string[],
    };
  }

  const [universes, interests, platforms, availability, objectives] = await Promise.all([
    supabase.from('profile_universes').select('universe').eq('profile_id', profileId),
    supabase.from('profile_interests').select('interest').eq('profile_id', profileId),
    supabase.from('profile_platforms').select('platform').eq('profile_id', profileId),
    supabase.from('profile_availability').select('slot').eq('profile_id', profileId),
    supabase.from('profile_objectives').select('objective').eq('profile_id', profileId),
  ]);

  return {
    universes: (universes.data ?? []).map((r) => r.universe as UniverseId),
    interests: (interests.data ?? []).map((r) => r.interest as string),
    platforms: (platforms.data ?? []).map((r) => r.platform as PlatformId),
    availability: (availability.data ?? []).map((r) => r.slot as Availability),
    objectives: (objectives.data ?? []).map((r) => r.objective as string),
  };
}

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;

  const relations = await fetchRelations(id);
  return mapProfileRow(data as ProfileRow, relations);
}

export async function listProfiles(excludeId?: string): Promise<UserProfile[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('profiles').select('*').eq('onboarding_complete', true);
  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query.limit(50);
  if (error || !data) return [];

  const profiles = await Promise.all(
    (data as ProfileRow[]).map(async (row) => {
      const relations = await fetchRelations(row.id);
      return mapProfileRow(row, relations);
    }),
  );
  return profiles;
}

export async function ensureProfileRow(params: {
  id: string;
  email: string;
  name?: string;
}): Promise<UserProfile> {
  if (!canWriteSupabaseUserId(params.id)) {
    throw new Error('ID local (fb-/u-) : pas d’écriture profil Supabase.');
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase non configuré');
  }

  const existing = await getProfileById(params.id);
  if (existing) return existing;

  const { error } = await supabase.from('profiles').upsert(
    {
      id: params.id,
      email: params.email,
      name: params.name?.trim() || params.email.split('@')[0] || 'Jumelo',
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  const created = await getProfileById(params.id);
  if (!created) {
    throw new Error('Impossible de charger le profil après création.');
  }
  return created;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) return;
  // Jamais d’upsert avec `fb-*` / `u-*` dans une colonne uuid
  if (!canWriteSupabaseUserId(profile.id)) return;

  const { error } = await supabase.from('profiles').upsert(
    {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      city: profile.city,
      bio: profile.bio,
      avatar_url: profile.photo ?? null,
      avatar_color: profile.avatarColor,
      level: profile.level,
      vibe: serializeVibes(profile.vibes),
      reliability: profile.reliability,
      theme_id: profile.themeId ?? 'teal',
      onboarding_complete: profile.onboardingComplete,
      languages: profile.languages ?? [],
      age:
        typeof profile.age === 'number' && Number.isFinite(profile.age)
          ? Math.round(profile.age)
          : null,
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(error.message);

  await replaceJunction(profile.id, 'profile_universes', 'universe', profile.universes);
  await replaceJunction(profile.id, 'profile_interests', 'interest', profile.interests);
  await replaceJunction(profile.id, 'profile_platforms', 'platform', profile.platforms ?? []);
  await replaceJunction(profile.id, 'profile_availability', 'slot', profile.availability);
  await replaceJunction(profile.id, 'profile_objectives', 'objective', profile.objectives);
}

async function replaceJunction(
  profileId: string,
  table:
    | 'profile_universes'
    | 'profile_interests'
    | 'profile_platforms'
    | 'profile_availability'
    | 'profile_objectives',
  column: string,
  values: string[],
) {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from(table).delete().eq('profile_id', profileId);
  if (values.length === 0) return;

  const rows = values.map((value) => ({ profile_id: profileId, [column]: value }));
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(error.message);
}

export async function updateThemeId(userId: string, themeId: ThemeId): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('profiles').update({ theme_id: themeId }).eq('id', userId);
}

export async function patchProfileFields(
  userId: string,
  patch: Partial<{
    name: string;
    city: string;
    bio: string;
    avatar_url: string | null;
    avatar_color: string;
    level: Level;
    /** Comma-separated vibe ids when writing the text column. */
    vibe: string | Vibe;
    reliability: number;
    theme_id: string;
    onboarding_complete: boolean;
    languages: string[];
    age: number | null;
  }>,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}
