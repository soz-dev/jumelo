import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';

const GATING_KEY = '@jumelo/premium-gating';
const USERS_KEY = '@jumelo/premium-users';
/** Même clé que `adminStore` — évite une dépendance circulaire. */
const ACTIVITY_KEY = '@jumelo/admin-activity';

type PremiumMap = Record<string, boolean>;
type Listener = () => void;

const listeners = new Set<Listener>();

function notifyPremiumListeners() {
  listeners.forEach((l) => l());
}

export function subscribePremium(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function readPremiumMap(): Promise<PremiumMap> {
  try {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PremiumMap;
  } catch {
    return {};
  }
}

async function writePremiumMap(map: PremiumMap): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(map));
}

async function logPremiumActivity(action: string, detail: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_KEY);
    const rows: { id: string; action: string; detail: string; createdAt: string }[] = raw
      ? (JSON.parse(raw) as { id: string; action: string; detail: string; createdAt: string }[])
      : [];
    rows.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      detail,
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    // best-effort
  }
}

/** Flag global : paywall / feature gating actif. */
export async function getPremiumGatingEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(GATING_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setPremiumGatingEnabled(
  enabled: boolean,
  opts?: { actorLabel?: string },
): Promise<void> {
  await AsyncStorage.setItem(GATING_KEY, enabled ? 'true' : 'false');
  await logPremiumActivity(
    enabled ? 'premium_gating_on' : 'premium_gating_off',
    opts?.actorLabel ? `par ${opts.actorLabel}` : 'dashboard admin',
  );
  notifyPremiumListeners();
}

/** Premium par user id (AsyncStorage ; champ profil optionnel côté UI). */
export async function isUserPremium(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const map = await readPremiumMap();
  return Boolean(map[userId]);
}

export async function setUserPremium(
  userId: string,
  premium: boolean,
  opts?: { actorLabel?: string },
): Promise<void> {
  const map = await readPremiumMap();
  if (premium) {
    map[userId] = true;
  } else {
    delete map[userId];
  }
  await writePremiumMap(map);
  await logPremiumActivity(
    premium ? 'premium_grant' : 'premium_revoke',
    `${userId}${opts?.actorLabel ? ` · ${opts.actorLabel}` : ''}`,
  );
  notifyPremiumListeners();
}

export async function getPremiumUserIds(): Promise<string[]> {
  const map = await readPremiumMap();
  return Object.keys(map).filter((id) => map[id]);
}

/** Flag global paywall (réactif). */
export function usePremiumGating(): {
  ready: boolean;
  gatingEnabled: boolean;
  setGatingEnabled: (enabled: boolean, actorLabel?: string) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [ready, setReady] = useState(false);
  const [gatingEnabled, setGating] = useState(false);

  const refresh = useCallback(async () => {
    setGating(await getPremiumGatingEnabled());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
    return subscribePremium(() => {
      refresh().catch(() => undefined);
    });
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const setGatingEnabled = useCallback(async (enabled: boolean, actorLabel?: string) => {
    setGating(enabled);
    await setPremiumGatingEnabled(enabled, { actorLabel });
  }, []);

  return { ready, gatingEnabled, setGatingEnabled, refresh };
}

/** Statut premium du compte courant (réactif). */
export function usePremium(): {
  ready: boolean;
  isPremium: boolean;
  userId: string | undefined;
  setPremium: (premium: boolean, actorLabel?: string) => Promise<void>;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const refresh = useCallback(async () => {
    setIsPremium(await isUserPremium(user?.id));
    setReady(true);
  }, [user?.id]);

  useEffect(() => {
    refresh().catch(() => undefined);
    return subscribePremium(() => {
      refresh().catch(() => undefined);
    });
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const setPremium = useCallback(
    async (premium: boolean, actorLabel?: string) => {
      if (!user?.id) return;
      setIsPremium(premium);
      await setUserPremium(user.id, premium, { actorLabel });
    },
    [user?.id],
  );

  return { ready, isPremium, userId: user?.id, setPremium, refresh };
}

/**
 * Accès feature : bloqué si gating ON et user non premium.
 * `guard()` redirige vers /premium et renvoie false si bloqué.
 */
export function usePremiumAccess(): {
  ready: boolean;
  gatingEnabled: boolean;
  isPremium: boolean;
  blocked: boolean;
  guard: () => boolean;
  openPaywall: () => void;
  refresh: () => Promise<void>;
} {
  const { ready: gReady, gatingEnabled, refresh: refreshGating } = usePremiumGating();
  const { ready: pReady, isPremium, refresh: refreshPremium } = usePremium();
  const ready = gReady && pReady;
  const blocked = ready && gatingEnabled && !isPremium;

  const openPaywall = useCallback(() => {
    router.push('/premium');
  }, []);

  const guard = useCallback(() => {
    if (!ready) return true;
    if (!gatingEnabled || isPremium) return true;
    openPaywall();
    return false;
  }, [ready, gatingEnabled, isPremium, openPaywall]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshGating(), refreshPremium()]);
  }, [refreshGating, refreshPremium]);

  return { ready, gatingEnabled, isPremium, blocked, guard, openPaywall, refresh };
}

/** Redirige vers le paywall dès que l’accès est bloqué (écrans protégés). */
export function useRequirePremium(enabled = true): {
  ready: boolean;
  blocked: boolean;
  allowed: boolean;
} {
  const access = usePremiumAccess();

  useEffect(() => {
    if (!enabled || !access.ready || !access.blocked) return;
    router.replace('/premium');
  }, [enabled, access.ready, access.blocked]);

  return {
    ready: access.ready,
    blocked: access.blocked,
    allowed: access.ready && !access.blocked,
  };
}
