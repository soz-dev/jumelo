import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

async function pushToExpo(token: string, title: string, body: string, data?: Record<string, string>) {
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
      }),
    });
  } catch {
    // best-effort
  }
}

/** Notifie un user (inbox + push si token + notif locale de secours). */
export async function notifyUser(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
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

  const tokens = await readJson<Record<string, string>>(TOKENS_KEY, {});
  const token = tokens[params.userId];
  if (token) {
    await pushToExpo(token, params.title, params.body, params.data);
  }

  if (Platform.OS !== 'web') {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data ?? {},
          sound: true,
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
