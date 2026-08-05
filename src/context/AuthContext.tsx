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
  updateFirebaseDisplayName,
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
    avatarColor: '#0186F0',
    photo: user.photoURL ?? undefined,
    universes: [],
    interests: [],
    level: 'intermediaire',
    vibes: ['social'],
    availability: [],
    objectives: [],
    reliability: 80,
    onboardingComplete: false,
    themeId: 'blue',
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
  /** Âge en années (13–100), critère de matching. */
  age: string;
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
  age: '',
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
  const localFbId = localProfileIdFromFirebase(firebaseUser.uid);

  // Lire le cache local en avance pour merger si Supabase est incomplet.
  let cachedProfile: UserProfile | null = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = coerceUserProfile(JSON.parse(raw));
      if (
        parsed &&
        (parsed.id === localFbId ||
          (supabaseUserId && parsed.id === supabaseUserId) ||
          (email && parsed.email === email))
      ) {
        cachedProfile = parsed;
      }
    }
  } catch {
    // ignore corrupt cache
  }

  if (supabaseUserId && isSupabaseConfigured()) {
    try {
      const remote = await ensureProfileRow({
        id: supabaseUserId,
        email,
        name,
      });

      // Si Supabase est incomplet mais le cache local est complet, fusionner.
      if (!remote.onboardingComplete && cachedProfile?.onboardingComplete) {
        const merged: UserProfile = {
          ...cachedProfile,
          id: remote.id,
          email: remote.email || cachedProfile.email,
          photo: firebaseUser.photoURL ?? remote.photo ?? cachedProfile.photo,
        };
        // Remettre Supabase à jour en arrière-plan pour éviter la prochaine régression.
        saveProfile(merged).catch(() => undefined);
        return merged;
      }

      // Même compte : migrer l'état « Du jour » fb-* → UUID.
      if (localFbId !== supabaseUserId) {
        const { linkDailyJumeloIdentity } = await import('../lib/dailyJumelo');
        await linkDailyJumeloIdentity(localFbId, supabaseUserId).catch(
          () => undefined,
        );
      }
      return remote;
    } catch {
      // fallback local ci-dessous
    }
  }

  // Option B : session Firebase + profil AsyncStorage (Teams/Messages Supabase limités).
  if (cachedProfile) {
    return {
      ...cachedProfile,
      email: email || cachedProfile.email,
      // Préférer le pseudo local (édité via updateProfile) ; Firebase en secours.
      name: cachedProfile.name?.trim() || name || cachedProfile.name,
      photo: firebaseUser.photoURL ?? cachedProfile.photo,
    };
  }

  return profileFromFirebaseLocal(firebaseUser);
}

/**
 * Répare silencieusement le flag `onboardingComplete` si le profil a des données
 * (universes) mais que le flag est toujours à false (ex : save Supabase raté).
 * Tente aussi de corriger la DB Supabase en arrière-plan.
 */
function repairOnboardingFlag(profile: UserProfile): UserProfile {
  if (profile.onboardingComplete || !profile.universes?.length) return profile;
  const fixed: UserProfile = { ...profile, onboardingComplete: true };
  // Tenter de corriger en DB Supabase en arrière-plan (sans bloquer)
  if (isSupabaseConfigured() && canWriteSupabaseUserId(fixed.id)) {
    saveProfile(fixed).catch(() => undefined);
  }
  return fixed;
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

                const profile = repairOnboardingFlag(
                  await resolveProfileAfterFirebase({
                    firebaseUser: fbUser,
                    supabaseUserId,
                    supabaseEmail,
                  }),
                );
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
            const remote = repairOnboardingFlag(
              await ensureProfileRow({
                id: session.user.id,
                email: session.user.email ?? '',
                name: displayNameFromSupabaseUser(session.user),
              }),
            );
            // Si Supabase est incomplet, tenter fusion avec cache local.
            let profile = remote;
            if (!remote.onboardingComplete) {
              try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) {
                  const cached = coerceUserProfile(JSON.parse(raw));
                  if (
                    cached?.onboardingComplete &&
                    (cached.id === session.user.id || cached.email === session.user.email)
                  ) {
                    profile = { ...cached, id: remote.id, email: remote.email || cached.email };
                    saveProfile(profile).catch(() => undefined);
                  }
                }
              } catch {
                // ignore corrupt cache
              }
            }
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
                const profile = repairOnboardingFlag(
                  await ensureProfileRow({
                    id: nextSession.user.id,
                    email: nextSession.user.email ?? '',
                    name: displayNameFromSupabaseUser(nextSession.user),
                  }),
                );
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
        const profile = repairOnboardingFlag(
          await resolveProfileAfterFirebase({
            firebaseUser: result.firebaseUser,
            supabaseUserId: result.supabaseUserId,
            supabaseEmail: result.supabaseEmail,
          }),
        );
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
        const profile = repairOnboardingFlag(
          await ensureProfileRow({
            id: data.user.id,
            email: data.user.email ?? normalized,
            name: displayNameFromSupabaseUser(data.user),
          }),
        );
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
          avatarColor: '#0186F0',
          universes: [],
          interests: [],
          level: 'intermediaire',
          vibes: ['social'],
          availability: [],
          objectives: [],
          reliability: 80,
          onboardingComplete: false,
          themeId: 'blue',
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
      const profile = repairOnboardingFlag(
        await resolveProfileAfterFirebase({
          firebaseUser: result.firebaseUser,
          supabaseUserId: result.supabaseUserId,
          supabaseEmail: result.supabaseEmail,
        }),
      );
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
    const parsedAge = Number.parseInt((draft.age ?? '').trim(), 10);
    const age =
      Number.isFinite(parsedAge) && parsedAge >= 13 && parsedAge <= 100
        ? parsedAge
        : user.age;
    const next: UserProfile = {
      ...user,
      name: draft.name.trim() || user.name,
      city: draft.city.trim() || 'Lyon',
      bio: draft.bio.trim() || user.bio,
      age,
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
      if (typeof patch.name === 'string') {
        next.name = patch.name.trim();
      }
      // Permet d’effacer photo / persona (JSON.stringify omettrait sinon le champ).
      if ('photo' in patch && !patch.photo) {
        delete next.photo;
      }
      if ('avatarPersonaId' in patch && !patch.avatarPersonaId) {
        delete next.avatarPersonaId;
      }
      setUser(next);
      await persistLocal(next);
      // Annuaire + Firebase Auth : le nouveau pseudo apparaît dans home / rosters.
      if (typeof patch.name === 'string' && next.name) {
        await updateFirebaseDisplayName(next.name).catch(() => undefined);
      }
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
