import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '../data/mock';
import { normalizeProfileVibes } from './vibes';

const STORAGE_KEY = '@jumelo/profile-directory';

type Directory = Record<string, UserProfile>;

function coerceProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as UserProfile & { vibe?: unknown };
  if (typeof parsed.id !== 'string' || !parsed.id) return null;
  if (typeof parsed.name !== 'string') return null;
  return {
    ...parsed,
    email: typeof parsed.email === 'string' ? parsed.email : '',
    city: typeof parsed.city === 'string' ? parsed.city : '',
    bio: typeof parsed.bio === 'string' ? parsed.bio : '',
    avatarColor:
      typeof parsed.avatarColor === 'string' && parsed.avatarColor
        ? parsed.avatarColor
        : '#0F8F8A',
    photo: typeof parsed.photo === 'string' && parsed.photo ? parsed.photo : undefined,
    avatarPersonaId:
      typeof parsed.avatarPersonaId === 'string' && parsed.avatarPersonaId
        ? parsed.avatarPersonaId
        : undefined,
    universes: Array.isArray(parsed.universes) ? parsed.universes : [],
    interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    level: parsed.level ?? 'intermediaire',
    vibes: normalizeProfileVibes(parsed),
    availability: Array.isArray(parsed.availability) ? parsed.availability : [],
    objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
    reliability: typeof parsed.reliability === 'number' ? parsed.reliability : 80,
    onboardingComplete: Boolean(parsed.onboardingComplete),
  };
}

async function loadDirectory(): Promise<Directory> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Directory;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Directory = {};
    for (const [id, value] of Object.entries(parsed)) {
      const profile = coerceProfile(value);
      if (profile) out[id] = profile;
    }
    return out;
  } catch {
    return {};
  }
}

async function saveDirectory(dir: Directory): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dir));
}

/**
 * Persiste un snapshot de profil local (Firebase `fb-*`, démo `u-*`, UUID…).
 * Sert à afficher les membres d’équipe hors mocks, même sans Supabase.
 */
export async function rememberProfile(
  profile: UserProfile | null | undefined,
): Promise<void> {
  if (!profile?.id) return;
  const dir = await loadDirectory();
  const prev = dir[profile.id];
  dir[profile.id] = {
    ...(prev ?? {}),
    ...profile,
    vibes: normalizeProfileVibes(profile),
  };
  await saveDirectory(dir);
}

export async function getCachedProfile(id: string): Promise<UserProfile | null> {
  if (!id) return null;
  const dir = await loadDirectory();
  return dir[id] ?? null;
}

export async function getCachedProfiles(
  ids: string[],
): Promise<Map<string, UserProfile>> {
  const dir = await loadDirectory();
  const map = new Map<string, UserProfile>();
  for (const id of ids) {
    const hit = dir[id];
    if (hit) map.set(id, hit);
  }
  return map;
}
