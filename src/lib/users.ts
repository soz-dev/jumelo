import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockChats, mockUsers, type UserProfile } from '../data/mock';
import { getOrCreateDmConversation } from './api/messages';
import { getProfileById } from './api/profiles';
import { isLocalFirebaseProfileId } from './firebaseAuth';
import { getCachedProfile, rememberProfile } from './profileDirectory';
import { isSupabaseConfigured } from './supabase';
import { canWriteSupabaseUserId } from './userIds';
import { normalizeProfileVibes } from './vibes';

const AUTH_STORAGE_KEY = '@jumelo/auth';

export function getUserById(id: string): UserProfile | undefined {
  return mockUsers.find((u) => u.id === id);
}

function coerceAuthProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as UserProfile & { vibe?: unknown };
  if (typeof parsed.id !== 'string' || !parsed.id) return null;
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
  return {
    ...parsed,
    email: typeof parsed.email === 'string' ? parsed.email : '',
    city: typeof parsed.city === 'string' ? parsed.city : '',
    bio: typeof parsed.bio === 'string' ? parsed.bio : '',
    avatarColor:
      typeof parsed.avatarColor === 'string' && parsed.avatarColor
        ? parsed.avatarColor
        : '#0186F0',
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

/** Fallback lisible si seul l’id Firebase local est connu. */
export function stubProfileFromId(id: string): UserProfile {
  const short = id.startsWith('fb-')
    ? id.slice(3, 9)
    : id.replace(/^u-/, '').slice(0, 8);
  const label = short ? `Membre ${short}` : 'Membre Jumelo';
  return {
    id,
    email: '',
    name: label,
    city: '',
    bio: '',
    avatarColor: '#0186F0',
    universes: [],
    interests: [],
    level: 'intermediaire',
    vibes: ['social'],
    availability: [],
    objectives: [],
    reliability: 80,
    onboardingComplete: false,
  };
}

async function readAuthCachedProfile(id: string): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = coerceAuthProfile(JSON.parse(raw));
    if (parsed?.id === id) {
      await rememberProfile(parsed).catch(() => undefined);
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Résout un profil : mocks → Supabase (UUID) → annuaire local → session auth → stub `fb-*`.
 */
export async function resolveUserById(id: string): Promise<UserProfile | undefined> {
  if (!id) return undefined;

  const local = getUserById(id);
  if (local) return local;

  if (isSupabaseConfigured() && canWriteSupabaseUserId(id)) {
    const remote = await getProfileById(id);
    if (remote) {
      await rememberProfile(remote).catch(() => undefined);
      return remote;
    }
  }

  const cached = await getCachedProfile(id);
  if (cached) return cached;

  const fromAuth = await readAuthCachedProfile(id);
  if (fromAuth) return fromAuth;

  // Dernier recours : ne jamais exposer un id brut `fb-xxx` dans l’UI.
  if (isLocalFirebaseProfileId(id)) {
    return stubProfileFromId(id);
  }

  return undefined;
}

/** Résout plusieurs profils (roster équipe) en conservant l’ordre des ids. */
export async function resolveUsersByIds(ids: string[]): Promise<UserProfile[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const resolved = await Promise.all(unique.map((id) => resolveUserById(id)));
  const byId = new Map<string, UserProfile>();
  unique.forEach((id, i) => {
    const profile = resolved[i];
    if (profile) byId.set(id, profile);
  });
  return ids
    .filter(Boolean)
    .map((id) => byId.get(id) ?? stubProfileFromId(id));
}

export function chatPathForUser(userId: string): string {
  const existing = mockChats.find((c) => c.peerId === userId);
  if (existing) return `/chat/${existing.id}`;

  const map: Record<string, string> = {
    'u-lea': 'c-lea',
    'u-maxime': 'c-maxime',
    'u-sara': 'c-sara',
    'u-noah': 'c-lea',
    'u-karim': 'c-valorant',
    'u-maya': 'c-lea',
  };
  return `/chat/${map[userId] ?? 'c-lea'}`;
}

/**
 * Ouvre un DM : conversation Supabase (UUID) ou AsyncStorage (`fb-*` / `u-*`).
 */
export async function openChatWithUser(
  myId: string,
  peerId: string,
): Promise<string> {
  const peer = await resolveUserById(peerId);
  const convId = await getOrCreateDmConversation(myId, peerId, peer
    ? { name: peer.name, photo: peer.photo, avatarColor: peer.avatarColor }
    : undefined);
  if (convId) return `/chat/${convId}`;
  return chatPathForUser(peerId);
}
