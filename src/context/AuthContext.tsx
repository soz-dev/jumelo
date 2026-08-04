import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import {
  Availability,
  Level,
  UniverseId,
  Vibe,
} from '../constants/catalog';
import {
  DEMO_EMAIL,
  leaProfile,
  mockUsers,
  UserProfile,
} from '../data/mock';
import {
  ensureProfileRow,
  getProfileById,
  saveProfile,
  updateThemeId,
} from '../lib/api/profiles';
import {
  displayNameFromFirebase,
  localProfileIdFromFirebase,
  registerEmailFirebase,
  signInEmailFirebase,
  signInWithProviderFirebase,
  signOutFirebase,
  subscribeFirebaseAuth,
} from '../lib/firebaseAuth';
import { isFirebaseConfigured } from '../lib/firebase';
import { rememberProfile } from '../lib/profileDirectory';
import { canWriteSupabaseUserId } from '../lib/userIds';
import type { OAuthProvider } from '../lib/oauth';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { clampVibes, normalizeProfileVibes } from '../lib/vibes';

const STORAGE_KEY = '@jumelo/auth';
const MIN_PASSWORD_LEN = 8;

/** Migre l’ancien champ `vibe` string vers `vibes[]`. */
function coerceUserProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as UserProfile & { vibe?: unknown };
  const { vibe: _legacy, ...rest } = parsed as UserProfile & { vibe?: unknown };
  return {
    ...rest,
    vibes: normalizeProfileVibes(parsed),
  };
}

/** Bypass démo (lea@ / mocks) — jamais en build production. */
const allowDemoAuth = typeof __DEV__ !== 'undefined' && __DEV__;

function displayNameFromSupabaseUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | undefined {
  const meta = user.user_metadata ?? {};
  const candidates = [meta.full_name, meta.name, meta.given_name];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

function canSyncSupabaseProfile(id: string): boolean {
  return isSupabaseConfigured() && canWriteSupabaseUserId(id);
}

function profileFromFirebaseLocal(user: FirebaseUser): UserProfile {
  const email = user.email ?? '';
  return {
    id: localProfileIdFromFirebase(user.uid),
    email,
    name: displayNameFromFirebase(user) || email.split('@')[0] || 'Jumelo',
    city: '',
    bio: '',
    avatarColor: '#0F8F8A',
    photo: user.photoURL ?? undefined,
    universes: [],
    interests: [],
    level: 'intermediaire',
    vibes: ['social'],
    availability: [],
    objectives: [],
    reliability: 80,
    onboardingComplete: false,
    themeId: 'teal',
  };
}

export type OnboardingDraft = {
  universes: UniverseId[];
  interests: string[];
  vibes: Vibe[];
  availability: Availability[];
  level: Level;
  objectives: string[];
  name: string;
  city: string;
  bio: string;
};

const emptyDraft = (): OnboardingDraft => ({
  universes: [],
  interests: [],
  vibes: [],
  availability: [],
  level: 'intermediaire',
  objectives: [],
  name: '',
  city: '',
  bio: '',
});

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  /** True when EXPO_PUBLIC_SUPABASE_* env vars are set */
  usingSupabase: boolean;
  /** True when EXPO_PUBLIC_FIREBASE_* env vars are set */
  usingFirebase: boolean;
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  loginWithProvider: (
    provider: OAuthProvider,
  ) => Promise<{ ok: true } | { ok: false; error: string; cancelled?: boolean }>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistLocal(user: UserProfile | null) {
  if (!user) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  // Annuaire local : afficher ce compte Firebase dans les rosters d’équipe.
  await rememberProfile(user).catch(() => undefined);
}

async function loginDemoOrMock(
  email: string,
): Promise<{ ok: true; user: UserProfile } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    return { ok: false, error: 'Entre une adresse email valide.' };
  }

  if (normalized === DEMO_EMAIL) {
    return { ok: true, user: { ...leaProfile } };
  }

  const existing = mockUsers.find((u) => u.email === normalized);
  if (existing) {
    return { ok: true, user: existing };
  }

  return {
    ok: false,
    error: `Compte inconnu. Essaie ${DEMO_EMAIL} (n’importe quel mot de passe).`,
  };
}

async function resolveProfileAfterFirebase(params: {
  firebaseUser: FirebaseUser;
  supabaseUserId?: string;
  supabaseEmail?: string;
}): Promise<UserProfile> {
  const { firebaseUser, supabaseUserId, supabaseEmail } = params;
  const name = displayNameFromFirebase(firebaseUser);
  const email = supabaseEmail || firebaseUser.email || '';

  if (supabaseUserId && isSupabaseConfigured()) {
    try {
      return await ensureProfileRow({
        id: supabaseUserId,
        email,
        name,
      });
    } catch {
      // fallback local ci-dessous
    }
  }

  // Option B : session Firebase + profil AsyncStorage (Teams/Messages Supabase limités).
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = coerceUserProfile(JSON.parse(cached));
      if (
        parsed &&
        (parsed.id === localProfileIdFromFirebase(firebaseUser.uid) ||
          (supabaseUserId && parsed.id === supabaseUserId))
      ) {
        return {
          ...parsed,
          email: email || parsed.email,
          name: name || parsed.name,
          photo: firebaseUser.photoURL ?? parsed.photo,
        };
      }
    } catch {
      // ignore corrupt cache
    }
  }

  return profileFromFirebaseLocal(firebaseUser);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraftState] = useState<OnboardingDraft>(emptyDraft);
  const usingSupabase = isSupabaseConfigured();
  const usingFirebase = isFirebaseConfigured();

  useEffect(() => {
    let active = true;
    let unsubscribeFirebase: (() => void) | undefined;
    let unsubscribeSupabase: (() => void) | undefined;

    (async () => {
      try {
        // 1) Firebase = identité primaire
        if (usingFirebase) {
          await new Promise<void>((resolve) => {
            let settled = false;
            unsubscribeFirebase = subscribeFirebaseAuth(async (fbUser) => {
              if (!active) {
                if (!settled) {
                  settled = true;
                  resolve();
                }
                return;
              }
              if (!fbUser) {
                // Ne pas effacer si une session Supabase email legacy est encore active.
                // Ne wipe que après le 1er settle — évite flash welcome → blank si un null
                // transitoire arrive après une session déjà résolue (rare, web).
                if (!usingSupabase && settled) {
                  setUser(null);
                  await persistLocal(null);
                }
                if (!settled) {
                  settled = true;
                  resolve();
                }
                return;
              }

              try {
                // Tente de réutiliser une session Supabase déjà bridgée.
                let supabaseUserId: string | undefined;
                let supabaseEmail: string | undefined;
                if (usingSupabase) {
                  const supabase = getSupabase();
                  const { data } = await supabase!.auth.getSession();
                  if (data.session?.user) {
                    supabaseUserId = data.session.user.id;
                    supabaseEmail = data.session.user.email ?? undefined;
                  }
                }

                const profile = await resolveProfileAfterFirebase({
                  firebaseUser: fbUser,
                  supabaseUserId,
                  supabaseEmail,
                });
                if (active) {
                  setUser(profile);
                  await persistLocal(profile);
                }
              } catch {
                // keep previous
              }
              if (!settled) {
                settled = true;
                resolve();
              }
            });
          });
          return;
        }

        // 2) Legacy : session Supabase seule (email) si Firebase absent
        if (usingSupabase) {
          const supabase = getSupabase();
          if (!supabase) return;

          const { data } = await supabase.auth.getSession();
          const session = data.session;
          if (session?.user && active) {
            const profile = await ensureProfileRow({
              id: session.user.id,
              email: session.user.email ?? '',
              name: displayNameFromSupabaseUser(session.user),
            });
            setUser(profile);
            await persistLocal(profile);
          }

          const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
            if (!active) return;
            if (event === 'SIGNED_OUT' || !nextSession?.user) {
              setUser(null);
              await persistLocal(null);
              return;
            }
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
              try {
                const profile = await ensureProfileRow({
                  id: nextSession.user.id,
                  email: nextSession.user.email ?? '',
                  name: displayNameFromSupabaseUser(nextSession.user),
                });
                if (active) {
                  setUser(profile);
                  await persistLocal(profile);
                }
              } catch {
                // keep local state if profile fetch fails momentarily
              }
            }
          });
          unsubscribeSupabase = () => sub.subscription.unsubscribe();
          return;
        }

        if (!allowDemoAuth) {
          return;
        }

        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && active) {
          try {
            const profile = coerceUserProfile(JSON.parse(raw));
            if (profile) {
              setUser(profile);
              await rememberProfile(profile).catch(() => undefined);
            }
          } catch {
            // ignore corrupt cache
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      unsubscribeFirebase?.();
      unsubscribeSupabase?.();
    };
  }, [usingFirebase, usingSupabase]);

  const setDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();

      // Démo / mocks : uniquement en __DEV__ (jamais en prod).
      if (allowDemoAuth && (normalized === DEMO_EMAIL || (!usingFirebase && !usingSupabase))) {
        const result = await loginDemoOrMock(normalized);
        if (!result.ok) return result;
        setUser(result.user);
        await persistLocal(result.user);
        setDraftState(emptyDraft());
        return { ok: true as const };
      }

      if (usingFirebase) {
        const result = await signInEmailFirebase(normalized, password);
        if (!result.ok) return result;
        const profile = await resolveProfileAfterFirebase({
          firebaseUser: result.firebaseUser,
          supabaseUserId: result.supabaseUserId,
          supabaseEmail: result.supabaseEmail,
        });
        setUser(profile);
        await persistLocal(profile);
        setDraftState(emptyDraft());
        return { ok: true as const };
      }

      if (!usingSupabase) {
        return {
          ok: false as const,
          error: 'Auth non configurée. Ajoute EXPO_PUBLIC_FIREBASE_* (voir FIREBASE_AUTH.md).',
        };
      }

      const supabase = getSupabase();
      if (!supabase) {
        return { ok: false as const, error: 'Supabase indisponible.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (error || !data.user) {
        return {
          ok: false as const,
          error: error?.message ?? 'Connexion impossible.',
        };
      }

      try {
        const profile = await ensureProfileRow({
          id: data.user.id,
          email: data.user.email ?? normalized,
          name: displayNameFromSupabaseUser(data.user),
        });
        setUser(profile);
        await persistLocal(profile);
        setDraftState(emptyDraft());
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : 'Profil introuvable.',
        };
      }
    },
    [usingFirebase, usingSupabase],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      if (!name.trim()) {
        return { ok: false as const, error: 'Le prénom est requis.' };
      }
      if (!normalized.includes('@')) {
        return { ok: false as const, error: 'Entre une adresse email valide.' };
      }
      if (password.length < MIN_PASSWORD_LEN) {
        return {
          ok: false as const,
          error: `Mot de passe trop court (${MIN_PASSWORD_LEN} caractères min).`,
        };
      }

      if (allowDemoAuth && !usingFirebase && (!usingSupabase || normalized === DEMO_EMAIL)) {
        const next: UserProfile = {
          id: `u-${Date.now()}`,
          email: normalized,
          name: name.trim(),
          city: '',
          bio: '',
          avatarColor: '#0F8F8A',
          universes: [],
          interests: [],
          level: 'intermediaire',
          vibes: ['social'],
          availability: [],
          objectives: [],
          reliability: 80,
          onboardingComplete: false,
          themeId: 'teal',
        };
        setUser(next);
        await persistLocal(next);
        setDraftState({ ...emptyDraft(), name: next.name });
        return { ok: true as const };
      }

      if (usingFirebase) {
        const result = await registerEmailFirebase(name, normalized, password);
        if (!result.ok) return result;
        const profile = await resolveProfileAfterFirebase({
          firebaseUser: result.firebaseUser,
          supabaseUserId: result.supabaseUserId,
          supabaseEmail: result.supabaseEmail,
        });
        setUser(profile);
        await persistLocal(profile);
        setDraftState({ ...emptyDraft(), name: name.trim() });
        return { ok: true as const };
      }

      if (!usingSupabase) {
        return {
          ok: false as const,
          error: 'Auth non configurée. Ajoute EXPO_PUBLIC_FIREBASE_* (voir FIREBASE_AUTH.md).',
        };
      }

      const supabase = getSupabase();
      if (!supabase) {
        return { ok: false as const, error: 'Supabase indisponible.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { data: { name: name.trim() } },
      });

      if (error || !data.user) {
        return {
          ok: false as const,
          error: error?.message ?? 'Inscription impossible.',
        };
      }

      try {
        const profile = await ensureProfileRow({
          id: data.user.id,
          email: normalized,
          name: name.trim(),
        });
        setUser(profile);
        await persistLocal(profile);
        setDraftState({ ...emptyDraft(), name: name.trim() });
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : 'Profil non créé.',
        };
      }
    },
    [usingFirebase, usingSupabase],
  );

  const loginWithProvider = useCallback(async (provider: OAuthProvider) => {
    if (!isFirebaseConfigured()) {
      return {
        ok: false as const,
        error: 'Configure Firebase pour te connecter avec Apple ou Google (FIREBASE_AUTH.md).',
      };
    }

    const result = await signInWithProviderFirebase(provider);
    if (!result.ok) return result;

    try {
      const profile = await resolveProfileAfterFirebase({
        firebaseUser: result.firebaseUser,
        supabaseUserId: result.supabaseUserId,
        supabaseEmail: result.supabaseEmail,
      });
      setUser(profile);
      await persistLocal(profile);
      setDraftState(emptyDraft());
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : 'Profil introuvable après OAuth.',
      };
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    const next: UserProfile = {
      ...user,
      name: draft.name.trim() || user.name,
      city: draft.city.trim() || 'Lyon',
      bio: draft.bio.trim() || user.bio,
      universes: draft.universes,
      interests: draft.interests,
      vibes: clampVibes(draft.vibes.length ? draft.vibes : ['social']),
      availability: draft.availability,
      level: draft.level,
      objectives: draft.objectives,
      onboardingComplete: true,
    };
    setUser(next);
    await persistLocal(next);
    if (canSyncSupabaseProfile(next.id)) {
      try {
        await saveProfile(next);
      } catch {
        // local state already updated; sync can retry later
      }
    }
  }, [draft, user]);

  const logout = useCallback(async () => {
    setUser(null);
    setDraftState(emptyDraft());
    await persistLocal(null);
    if (usingFirebase) {
      await signOutFirebase();
    }
    if (usingSupabase) {
      const supabase = getSupabase();
      await supabase?.auth.signOut();
    }
  }, [usingFirebase, usingSupabase]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      const next: UserProfile = {
        ...user,
        ...patch,
        vibes: clampVibes(patch.vibes ?? user.vibes),
      };
      // Permet d’effacer photo / persona (JSON.stringify omettrait sinon le champ).
      if ('photo' in patch && !patch.photo) {
        delete next.photo;
      }
      if ('avatarPersonaId' in patch && !patch.avatarPersonaId) {
        delete next.avatarPersonaId;
      }
      setUser(next);
      await persistLocal(next);
      if (canSyncSupabaseProfile(next.id)) {
        try {
          const keys = Object.keys(patch);
          if (keys.length === 1 && keys[0] === 'themeId' && next.themeId) {
            await updateThemeId(next.id, next.themeId);
          } else {
            await saveProfile(next);
          }
        } catch {
          // keep local cache
        }
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      usingSupabase,
      usingFirebase,
      draft,
      setDraft,
      login,
      register,
      loginWithProvider,
      completeOnboarding,
      logout,
      updateProfile,
    }),
    [
      user,
      loading,
      usingSupabase,
      usingFirebase,
      draft,
      setDraft,
      login,
      register,
      loginWithProvider,
      completeOnboarding,
      logout,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Recharge le profil depuis Supabase (no-op en mode démo / profil Firebase local). */
export async function refreshRemoteProfile(userId: string): Promise<UserProfile | null> {
  if (!canSyncSupabaseProfile(userId)) return null;
  return getProfileById(userId);
}
