import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGAL_VERSION } from './version';

const LEGAL_ACCEPTED_AT_KEY = '@jumelo/legal_accepted_at';
const LEGAL_VERSION_KEY = '@jumelo/legal_version';
const MARKETING_CONSENT_KEY = '@jumelo/marketing_consent';
const NOTIF_PREFS_KEY = '@jumelo/notif_prefs';

export type NotifPrefs = {
  matchAlerts: boolean;
  messageAlerts: boolean;
  teamAlerts: boolean;
  productTips: boolean;
};

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  matchAlerts: true,
  messageAlerts: true,
  teamAlerts: true,
  productTips: false,
};

export async function getLegalAcceptance(): Promise<{
  acceptedAt: string | null;
  version: string | null;
}> {
  const [acceptedAt, version] = await Promise.all([
    AsyncStorage.getItem(LEGAL_ACCEPTED_AT_KEY),
    AsyncStorage.getItem(LEGAL_VERSION_KEY),
  ]);
  return { acceptedAt, version };
}

export async function hasAcceptedCurrentLegal(): Promise<boolean> {
  const { acceptedAt, version } = await getLegalAcceptance();
  return Boolean(acceptedAt && version === LEGAL_VERSION);
}

export async function acceptLegal(version: string = LEGAL_VERSION): Promise<void> {
  const now = new Date().toISOString();
  await AsyncStorage.multiSet([
    [LEGAL_ACCEPTED_AT_KEY, now],
    [LEGAL_VERSION_KEY, version],
  ]);
}

export async function clearLegalAcceptance(): Promise<void> {
  await AsyncStorage.multiRemove([LEGAL_ACCEPTED_AT_KEY, LEGAL_VERSION_KEY]);
}

export async function getMarketingConsent(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(MARKETING_CONSENT_KEY);
  return raw === 'true';
}

export async function setMarketingConsent(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MARKETING_CONSENT_KEY, enabled ? 'true' : 'false');
}

export async function getNotifPrefs(): Promise<NotifPrefs> {
  const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
  if (!raw) return { ...DEFAULT_NOTIF_PREFS };
  try {
    return { ...DEFAULT_NOTIF_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export async function setNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
}

/** Clés locales liées au compte / préférences (hors session Supabase). */
export const JUMELO_LOCAL_KEYS = [
  '@jumelo/auth',
  '@jumelo/theme',
  '@jumelo/likes',
  '@jumelo/dm-chats',
  '@jumelo/team-chats',
  '@jumelo/teams-state',
  '@jumelo/jumelo-validation',
  '@jumelo/profile-directory',
  '@jumelo/team-sessions',
  '@jumelo/premium-gating',
  '@jumelo/premium-users',
  LEGAL_ACCEPTED_AT_KEY,
  LEGAL_VERSION_KEY,
  MARKETING_CONSENT_KEY,
  NOTIF_PREFS_KEY,
] as const;

export async function wipeJumeloLocalStorage(): Promise<void> {
  await AsyncStorage.multiRemove([...JUMELO_LOCAL_KEYS]);
}
