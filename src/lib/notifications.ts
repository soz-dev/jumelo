import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getNotifPrefs } from '../legal';

const TOKENS_KEY = '@jumelo/push-tokens';
const INBOX_KEY = '@jumelo/notif-inbox';

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt: string;
  read: boolean;
};

export type NotifyKind = 'message' | 'team' | 'match' | 'other';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Enregistre le token push Expo pour l’utilisateur courant. */
export async function registerPushTokenForUser(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    // Simulateur : on garde quand même une entrée locale pour les notifs locales
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Jumelo',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
    });
    await Notifications.setNotificationChannelAsync('teams', {
      name: 'Équipes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data;
    const map = await readJson<Record<string, string>>(TOKENS_KEY, {});
    map[userId] = token;
    await writeJson(TOKENS_KEY, map);
    return token;
  } catch {
    return null;
  }
}

async function pushToExpo(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  channelId?: string,
) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data: data ?? {},
        channelId: channelId ?? 'default',
      }),
    });
  } catch {
    // best-effort
  }
}

async function prefsAllow(kind: NotifyKind): Promise<boolean> {
  try {
    const prefs = await getNotifPrefs();
    if (kind === 'message') return prefs.messageAlerts;
    if (kind === 'team') return prefs.teamAlerts;
    if (kind === 'match') return prefs.matchAlerts;
    return true;
  } catch {
    return true;
  }
}

function channelForKind(kind: NotifyKind): string {
  if (kind === 'message') return 'messages';
  if (kind === 'team') return 'teams';
  return 'default';
}

/**
 * Notifie un user (inbox + push Expo si token).
 * `presentLocally` = bannière sur CET appareil (uniquement si le destinataire est l’utilisateur courant).
 */
export async function notifyUser(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  kind?: NotifyKind;
  /** Affiche une notif locale sur l’appareil courant (destinataire = user connecté). */
  presentLocally?: boolean;
}): Promise<void> {
  if (!params.userId) return;
  const kind = params.kind ?? 'other';
  if (!(await prefsAllow(kind))) return;

  const inbox = await readJson<AppNotification[]>(INBOX_KEY, []);
  inbox.unshift({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: params.userId,
    title: params.title,
    body: params.body,
    data: params.data,
    createdAt: new Date().toISOString(),
    read: false,
  });
  await writeJson(INBOX_KEY, inbox.slice(0, 100));

  const channelId = channelForKind(kind);
  const tokens = await readJson<Record<string, string>>(TOKENS_KEY, {});
  const token = tokens[params.userId];
  if (token) {
    await pushToExpo(token, params.title, params.body, params.data, channelId);
  }

  // Ne pas spammer l’appareil de l’émetteur quand on notifie quelqu’un d’autre.
  if (params.presentLocally && Platform.OS !== 'web') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data ?? {},
          sound: true,
          ...(Platform.OS === 'android' ? { channelId } : {}),
        },
        trigger: null,
      });
    } catch {
      // ignore
    }
  }
}

export async function listInboxForUser(userId: string): Promise<AppNotification[]> {
  const inbox = await readJson<AppNotification[]>(INBOX_KEY, []);
  return inbox.filter((n) => n.userId === userId);
}

/** Confirmation après join / approve (« Tu as rejoint [nom] »). */
export async function notifyTeamJoined(params: {
  userId: string;
  teamId: string;
  teamName: string;
  /** Bannière locale (appareil du membre qui vient de rejoindre). */
  presentLocally?: boolean;
}): Promise<void> {
  const name = params.teamName.trim() || 'ce jumelo';
  await notifyUser({
    userId: params.userId,
    title: 'Jumelo rejoint',
    body: `Tu as rejoint « ${name} » — bienvenue dans le binôme !`,
    data: { type: 'team_joined', teamId: params.teamId },
    kind: 'team',
    presentLocally: params.presentLocally,
  });
}
