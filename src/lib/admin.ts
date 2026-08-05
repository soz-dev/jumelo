import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from './firebase';

/** UID Firebase Google — seul compte autorisé à voir /admin */
export const ADMIN_UID = '4acsLCU0qNgsLEOEzMZeGqYDp5i1';

export function isAdminUid(uid: string | null | undefined): boolean {
  return Boolean(uid && uid === ADMIN_UID);
}

/**
 * True uniquement si l’utilisateur Firebase connecté a l’UID admin.
 * Démo AsyncStorage / mocks → false (pas de crash).
 */
export function useIsAdmin(): boolean {
  const [uid, setUid] = useState<string | null>(() => {
    if (!isFirebaseConfigured()) return null;
    return getFirebaseAuth()?.currentUser?.uid ?? null;
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUid(null);
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      setUid(null);
      return;
    }
    setUid(auth.currentUser?.uid ?? null);
    return onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
  }, []);

  return isAdminUid(uid);
}

/** UID Firebase courant (ou null). */
export function getCurrentFirebaseUid(): string | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

/**
 * Messages / threads seedés (mock) — visibles uniquement pour le compte Firebase admin.
 * Comptes démo AsyncStorage (`u-*`) et utilisateurs non-admin → false.
 */
export function canViewSeededDemoContent(): boolean {
  return isAdminUid(getCurrentFirebaseUid());
}
