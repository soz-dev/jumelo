import type { UserProfile } from '../../data/mock';
import {
  getLegalAcceptance,
  getMarketingConsent,
  getNotifPrefs,
  wipeJumeloLocalStorage,
} from '../../legal';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { canWriteSupabaseUserId } from '../userIds';

export type DataExportPayload = {
  exportedAt: string;
  source: 'jumelo-app';
  profile: UserProfile | null;
  preferences: {
    marketingConsent: boolean;
    notifications: Awaited<ReturnType<typeof getNotifPrefs>>;
    legal: Awaited<ReturnType<typeof getLegalAcceptance>>;
  };
};

export async function buildDataExport(profile: UserProfile | null): Promise<DataExportPayload> {
  const [marketingConsent, notifications, legal] = await Promise.all([
    getMarketingConsent(),
    getNotifPrefs(),
    getLegalAcceptance(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    source: 'jumelo-app',
    profile,
    preferences: {
      marketingConsent,
      notifications,
      legal,
    },
  };
}

export type DeleteAccountResult =
  | { ok: true; mode: 'local' | 'supabase-profile' }
  | { ok: false; error: string };

/**
 * Supprime les données applicatives du compte.
 * - Mode démo : wipe AsyncStorage uniquement.
 * - Mode Supabase : delete du profil (cascade relations) + signOut.
 * La suppression complète de auth.users nécessite souvent une Edge Function admin — documenté dans LEGAL.md.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  if (!isSupabaseConfigured() || !canWriteSupabaseUserId(userId)) {
    await wipeJumeloLocalStorage();
    return { ok: true, mode: 'local' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Supabase indisponible.' };
  }

  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        'Impossible de supprimer le profil. Vérifiez les politiques RLS (delete own).',
    };
  }

  await supabase.auth.signOut();
  await wipeJumeloLocalStorage();
  return { ok: true, mode: 'supabase-profile' };
}
