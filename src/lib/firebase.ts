import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
};

/** True when the public Firebase web config is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/** Metro résout l’entrée RN de `@firebase/auth` qui expose cette API. */
function getRnPersistence(storage: typeof AsyncStorage): Persistence | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rnAuth = require('@firebase/auth') as {
      getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence;
    };
    return rnAuth.getReactNativePersistence?.(storage);
  } catch {
    return undefined;
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) {
    try {
      if (Platform.OS === 'web') {
        // Navigateur : persistence IndexedDB / localStorage native Firebase.
        // Évite getReactNativePersistence (peut faire flasher la session).
        auth = getAuth(firebaseApp);
      } else {
        const persistence = getRnPersistence(AsyncStorage);
        auth = persistence
          ? initializeAuth(firebaseApp, { persistence })
          : initializeAuth(firebaseApp);
      }
    } catch {
      // Already initialized (Fast Refresh / second import).
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

export function getGoogleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
}

export function getGoogleIosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';
}

export function getGoogleAndroidClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '';
}
