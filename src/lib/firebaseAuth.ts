import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  AuthRequest,
  Prompt,
  ResponseType,
  makeRedirectUri,
} from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { Alert, Platform } from 'react-native';

import {
  GOOGLE_WEB_STABLE_REDIRECT,
  completeAuthSessionIfNeeded,
} from './completeAuthSession';
import {
  getFirebaseAuth,
  getGoogleWebClientId,
  isFirebaseConfigured,
} from './firebase';
import { getSupabase, isSupabaseConfigured } from './supabase';

export { GOOGLE_WEB_STABLE_REDIRECT } from './completeAuthSession';

// Natif : deep link. Web : uniquement si on est sur /oauth (pas l’onglet app).
completeAuthSessionIfNeeded();

/** Deep link natif (retour app après proxy). Ne pas envoyer à Google (client Web refuse les schemes custom). */
const GOOGLE_APP_RETURN = 'jumelo://auth/callback';

/**
 * URI web forcée — une seule valeur stable (pas makeRedirectUri, pas 127.0.0.1).
 * Doit être collée telle quelle dans Google Cloud → client OAuth **Web**.
 */
export const GOOGLE_WEB_REDIRECT_URI = GOOGLE_WEB_STABLE_REDIRECT; // http://localhost:8081/oauth

/**
 * Liste minimale à coller dans Google Cloud (redirects).
 * L’app n’envoie QUE `GOOGLE_WEB_REDIRECT_URI` (web) ou `auth.expo.io/@OWNER/jumelo` (Expo Go).
 */
export const GOOGLE_WEB_LOCALHOST_REDIRECTS = [
  GOOGLE_WEB_REDIRECT_URI,
  // Variantes fréquentes si quelqu’un a déjà enregistré autre chose :
  'http://localhost:8081/oauth/',
  'http://127.0.0.1:8081/oauth',
  'https://jumelo-aca80.firebaseapp.com/__/auth/handler',
] as const;

/** Handlers Firebase Auth (à garder aussi côté Google Cloud). */
const FIREBASE_AUTH_HANDLERS = [
  'https://jumelo-aca80.firebaseapp.com/__/auth/handler',
  'https://jumelo-aca80.web.app/__/auth/handler',
] as const;

/** Message UI — Apple Sign-In non supporté dans le navigateur. */
export const APPLE_WEB_UNSUPPORTED_MESSAGE =
  'Sign in with Apple n’est pas disponible sur le web (navigateur).\n\n' +
  'Sur ordinateur : utilise Google ou email.\n' +
  'Sur iPhone : Expo Go bloque aussi Apple+Firebase (audience host.exp.Exponent) — ' +
  'il faut un development build iOS (voir FIREBASE_AUTH.md).';

/** True dans le client Expo Go (bundle `host.exp.Exponent`), pas dans un dev/standalone. */
export function isExpoGoRuntime(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * Apple Sign-In + Firebase Auth JS échoue sous Expo Go :
 * le JWT Apple a `aud: host.exp.Exponent`, Firebase attend `app.jumelo`.
 * Pas de workaround sûr (changer le Service ID Firebase casserait la prod).
 */
export const APPLE_FIREBASE_EXPO_GO_MESSAGE =
  'Apple + Firebase ne fonctionne pas dans Expo Go.\n\n' +
  'Le jeton Apple a pour audience host.exp.Exponent, alors que Firebase attend le bundle app.jumelo.\n\n' +
  'Sous Expo Go : utilise Google (après fix redirect URI).\n' +
  'Pour Apple : installe un development build (eas build --profile development --platform ios) — voir FIREBASE_AUTH.md.';

/** Alerte avant Google — comptes Workspace / pro bloquent souvent les apps non vérifiées. */
export const GOOGLE_WORKSPACE_HINT_FR =
  'N’utilise pas ton compte pro / Workspace — choisis un Gmail personnel. Les comptes entreprise bloquent souvent Jumelo (app non vérifiée).';

function resolveExpoOwner(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_OWNER?.trim().replace(/^@/, '');
  if (fromEnv) return fromEnv;

  const fromConfig = Constants.expoConfig?.owner?.trim().replace(/^@/, '');
  if (fromConfig) return fromConfig;

  const originalFullName = (
    Constants.expoConfig as { originalFullName?: string } | null
  )?.originalFullName;
  if (originalFullName && !originalFullName.startsWith('@anonymous/')) {
    const match = originalFullName.match(/^@([^/]+)\//);
    if (match?.[1]) return match[1];
  }

  const easOwner = (
    Constants as { easConfig?: { owner?: string } }
  ).easConfig?.owner?.trim().replace(/^@/, '');
  if (easOwner) return easOwner;

  return undefined;
}

/** Redirect Expo Go / natif via proxy HTTPS (seul format accepté par le client OAuth Web Google). */
export function getExpoGoGoogleRedirectUri(owner?: string): string {
  const resolved =
    owner?.trim().replace(/^@/, '') ||
    resolveExpoOwner() ||
    'TON_COMPTE_EXPO';
  const slug = Constants.expoConfig?.slug ?? 'jumelo';
  return `https://auth.expo.io/@${resolved}/${slug}`;
}

/**
 * URIs exactes à coller dans Google Cloud → client OAuth Web → Authorized redirect URIs.
 * (Pas de `jumelo://` / `exp://` : les clients OAuth **Web** Google les refusent.)
 */
export function getGoogleRedirectUrisToRegister(owner?: string): string[] {
  return [
    getExpoGoGoogleRedirectUri(owner),
    ...GOOGLE_WEB_LOCALHOST_REDIRECTS,
    ...FIREBASE_AUTH_HANDLERS,
  ];
}

/**
 * Redirect Google OAuth pour client **Web** + AuthSession — toujours une URI stable :
 * - Navigateur : `http://localhost:8081/oauth` (forcé, jamais makeRedirectUri).
 * - Expo Go / natif : `https://auth.expo.io/@OWNER/jumelo` (seul HTTPS simple accepté).
 * Jamais `exp://` ni `jumelo://` comme `redirect_uri` Google (400 mismatch / custom scheme).
 */
function resolveGoogleRedirect(): {
  /** URI envoyée à Google (`redirect_uri`). */
  redirectUri: string;
  /** URI attendue par `openAuthSessionAsync` pour refermer la session. */
  returnUrl: string;
  /** Ouvre via le proxy Expo (HTTPS accepté par les clients Web Google). */
  useExpoProxy: boolean;
  projectFullName?: string;
  owner?: string;
  /** Bloque le login si Expo Go/natif sans owner (proxy impossible). */
  configError?: string;
} {
  const owner = resolveExpoOwner();
  const slug = Constants.expoConfig?.slug ?? 'jumelo';
  const projectFullName = owner ? `@${owner}/${slug}` : undefined;

  // Navigateur : URI unique stable — facile à enregistrer une seule fois.
  if (Platform.OS === 'web') {
    return {
      redirectUri: GOOGLE_WEB_REDIRECT_URI,
      returnUrl: GOOGLE_WEB_REDIRECT_URI,
      useExpoProxy: false,
      projectFullName,
      owner,
    };
  }

  const linkingUri = makeRedirectUri({
    scheme: 'jumelo',
    path: 'auth/callback',
  });
  const returnUrl =
    linkingUri.startsWith('jumelo:') || linkingUri.startsWith('exp:')
      ? linkingUri
      : GOOGLE_APP_RETURN;

  // Client Web Google : uniquement http(s). Sans owner → pas de proxy → erreur claire.
  if (!projectFullName) {
    return {
      redirectUri: GOOGLE_WEB_REDIRECT_URI,
      returnUrl,
      useExpoProxy: false,
      owner,
      configError:
        'Compte Expo manquant pour Google (Expo Go / natif).\n\n' +
        '1) npx expo login && npx expo whoami\n' +
        '2) .env → EXPO_PUBLIC_EXPO_OWNER=<username> (sans @)\n' +
        '3) Google Cloud → Authorized redirect URIs → ' +
        'https://auth.expo.io/@<username>/jumelo → Save\n' +
        '4) npx expo start -c\n\n' +
        'Sinon teste sur le web (touche w) : redirect = http://localhost:8081/oauth',
    };
  }

  return {
    redirectUri: getExpoGoGoogleRedirectUri(owner),
    returnUrl,
    useExpoProxy: true,
    projectFullName,
    owner,
  };
}

/** En __DEV__, affiche l’URI exacte envoyée à Google (diagnostic redirect_uri_mismatch). */
function notifyGoogleRedirectUri(redirectUri: string, clientId: string): void {
  const shortClient = `${clientId.slice(0, 18)}…${clientId.slice(-12)}`;
  const message =
    `Coller EXACTEMENT cette URI dans Google Cloud\n` +
    `→ APIs & Services → Credentials → client OAuth Web → Authorized redirect URIs → Save\n\n` +
    `${redirectUri}\n\n` +
    `Client ID : ${shortClient}`;
  console.log('[jumelo] ======= GOOGLE redirect_uri (COLLER TEL QUEL) =======');
  console.log(redirectUri);
  console.log('[jumelo] =====================================================');
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message);
    return;
  }
  Alert.alert('Google redirect_uri', message);
}

function mapGoogleAuthFailure(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('access_denied') ||
    lower.includes('org_internal') ||
    lower.includes('admin_policy_enforced') ||
    lower.includes('restricted_client') ||
    lower.includes('disallowed_useragent') ||
    lower.includes('403')
  ) {
    return (
      'Google a refusé l’autorisation. ' +
      'Compte pro / Workspace ? Utilise un Gmail personnel, ' +
      'ou demande à l’admin d’autoriser les apps tierces. Ce n’est pas un bug Jumelo — voir FIREBASE_AUTH.md § Workspace.'
    );
  }
  if (lower.includes('redirect_uri') || lower.includes('invalid_request')) {
    const owner = resolveExpoOwner() || 'TON_COMPTE_EXPO';
    const expected =
      Platform.OS === 'web'
        ? GOOGLE_WEB_REDIRECT_URI
        : getExpoGoGoogleRedirectUri(owner);
    return (
      'Erreur 400 redirect_uri_mismatch.\n\n' +
      `URI attendue par Jumelo :\n${expected}\n\n` +
      'Google Cloud → APIs & Services → Credentials → client OAuth **Web** ' +
      '(pas iOS/Android) → Authorized redirect URIs → colle l’URI ci-dessus → Save.\n' +
      'Puis `npx expo start -c`. Voir aussi `npm run google:redirects`.'
    );
  }
  return raw;
}

export type AuthProviderId = 'google' | 'apple';

export type ProviderSignInResult =
  | {
      ok: true;
      firebaseUser: FirebaseUser;
      /** Supabase user id when the idToken bridge succeeded. */
      supabaseUserId?: string;
      supabaseEmail?: string;
      cancelled?: undefined;
    }
  | { ok: false; error: string; cancelled?: boolean };

const googleDiscovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function randomNonce(length = 32): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/**
 * Bridge Firebase OAuth idToken → session Supabase (RLS / profiles UUID).
 * Soft-fail : l’auth Firebase reste valide même si le bridge échoue.
 */
export async function bridgeIdTokenToSupabase(
  provider: AuthProviderId,
  idToken: string,
  nonce?: string,
): Promise<{ userId: string; email: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token: idToken,
    nonce,
  });

  if (error || !data.user) {
    console.warn('[jumelo] Bridge Supabase idToken échoué:', error?.message);
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? '',
  };
}

export function displayNameFromFirebase(user: FirebaseUser): string | undefined {
  if (user.displayName?.trim()) return user.displayName.trim();
  return undefined;
}

export function subscribeFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, callback);
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function signInEmailFirebase(
  email: string,
  password: string,
): Promise<ProviderSignInResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase non configuré. Voir FIREBASE_AUTH.md.' };
  }
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: 'Firebase indisponible.' };

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, firebaseUser: cred.user };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Connexion Firebase impossible.',
    };
  }
}

export async function registerEmailFirebase(
  name: string,
  email: string,
  password: string,
): Promise<ProviderSignInResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase non configuré. Voir FIREBASE_AUTH.md.' };
  }
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: 'Firebase indisponible.' };

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return { ok: true, firebaseUser: cred.user };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Inscription Firebase impossible.',
    };
  }
}

/** Google via AuthSession (Web client ID + redirect jumelo / proxy) → Firebase (+ bridge Supabase). */
export async function signInWithGoogleFirebase(): Promise<ProviderSignInResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase non configuré. Ajoute EXPO_PUBLIC_FIREBASE_* (FIREBASE_AUTH.md).' };
  }

  // Flux navigateur AuthSession : toujours le client OAuth **Web** (pas iOS/Android natifs).
  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    return {
      ok: false,
      error:
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID manquant (client OAuth Web Firebase / Google Cloud).',
    };
  }

  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: 'Firebase indisponible.' };

  const {
    redirectUri,
    returnUrl,
    useExpoProxy,
    projectFullName,
    owner,
    configError,
  } = resolveGoogleRedirect();
  const nonce = await sha256(randomNonce());

  // Toujours loguer dès le début — nécessaire pour coller l’URI exacte dans Google Cloud.
  console.log('[jumelo] Google OAuth redirect_uri →', redirectUri);
  console.log('[jumelo] Google OAuth returnUrl →', returnUrl);
  console.log('[jumelo] Google OAuth useExpoProxy →', useExpoProxy);
  console.log(
    '[jumelo] Google OAuth clientId →',
    `${webClientId.slice(0, 12)}…${webClientId.slice(-20)}`,
  );
  console.log(
    '[jumelo] Google OAuth URIs à enregistrer →',
    getGoogleRedirectUrisToRegister(owner).join(' | '),
  );
  if (projectFullName) {
    console.log('[jumelo] Expo projectFullName →', projectFullName);
  }

  if (configError) {
    console.warn('[jumelo] Google OAuth bloqué →', configError);
    return { ok: false, error: configError };
  }

  // Alerte DEV avant l’ouverture Google — l’URI affichée = celle envoyée.
  notifyGoogleRedirectUri(redirectUri, webClientId);

  try {
    const request = new AuthRequest({
      clientId: webClientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: ResponseType.IdToken,
      usePKCE: false,
      // Choix du compte (évite le compte pro Safari déjà connecté).
      prompt: Prompt.SelectAccount,
      extraParams: {
        nonce,
        // Pas de `hd=` (restreindrait à un domaine Workspace).
        // Pas de `login_hint` (éviterait de pré-sélectionner le compte pro).
      },
    });

    const authUrl = await request.makeAuthUrlAsync(googleDiscovery);
    // Garde-fou : jamais de `hd=` (restreint au domaine Workspace de la session).
    // Force aussi redirect_uri = notre URI stable (évite toute mutation AuthSession).
    let authUrlSafe = authUrl;
    try {
      const parsed = new URL(authUrl);
      parsed.searchParams.delete('hd');
      parsed.searchParams.delete('login_hint');
      const sentRedirect = parsed.searchParams.get('redirect_uri');
      if (sentRedirect !== redirectUri) {
        console.warn(
          '[jumelo] AuthSession a modifié redirect_uri — on force la valeur stable.',
          { sentRedirect, redirectUri },
        );
        parsed.searchParams.set('redirect_uri', redirectUri);
      }
      authUrlSafe = parsed.toString();
      console.log(
        '[jumelo] Google OAuth redirect_uri DANS authUrl →',
        parsed.searchParams.get('redirect_uri'),
      );
    } catch {
      /* URL opaque — laisser tel quel */
    }

    let sessionResult: WebBrowser.WebBrowserAuthSessionResult;
    if (useExpoProxy && projectFullName) {
      // Proxy legacy Expo : Google voit un HTTPS autorisable ; retour app via returnUrl (exp://…).
      const startUrl = `https://auth.expo.io/${projectFullName}/start?${new URLSearchParams({
        authUrl: authUrlSafe,
        returnUrl,
      }).toString()}`;
      console.log('[jumelo] Google OAuth proxy startUrl →', startUrl.slice(0, 140) + '…');
      sessionResult = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
    } else {
      sessionResult = await WebBrowser.openAuthSessionAsync(authUrlSafe, returnUrl);
    }

    if (sessionResult.type === 'cancel' || sessionResult.type === 'dismiss') {
      return { ok: false, cancelled: true, error: 'Connexion annulée.' };
    }
    if (sessionResult.type !== 'success') {
      return { ok: false, error: 'Retour Google invalide.' };
    }

    const result = request.parseReturnUrl(sessionResult.url);
    if (result.type === 'error') {
      const raw =
        result.error?.message ||
        result.params.error_description ||
        result.params.error ||
        'Autorisation Google refusée.';
      return {
        ok: false,
        error: mapGoogleAuthFailure(String(raw)),
      };
    }
    if (result.type !== 'success') {
      return { ok: false, error: 'Retour Google invalide.' };
    }

    const idToken = result.params.id_token;
    if (!idToken) {
      const errParam = result.params.error || result.params.error_description;
      if (errParam) {
        return { ok: false, error: mapGoogleAuthFailure(String(errParam)) };
      }
      return {
        ok: false,
        error:
          'Jeton Google manquant. Enregistre exactement le redirect_uri logué ' +
          'dans Google Cloud → client Web (FIREBASE_AUTH.md).',
      };
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);

    const bridged = await bridgeIdTokenToSupabase('google', idToken);

    return {
      ok: true,
      firebaseUser: cred.user,
      supabaseUserId: bridged?.userId,
      supabaseEmail: bridged?.email,
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'Connexion Google impossible.';
    return { ok: false, error: mapGoogleAuthFailure(raw) };
  }
}

function isAppleAudienceMismatchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('host.exp.Exponent') ||
    (message.toLowerCase().includes('audience') && message.includes('ID token'))
  );
}

/** Apple natif iOS (expo-apple-authentication) → Firebase (+ bridge Supabase). */
export async function signInWithAppleFirebase(): Promise<ProviderSignInResult> {
  if (!isFirebaseConfigured()) {
    return { ok: false, error: 'Firebase non configuré. Ajoute EXPO_PUBLIC_FIREBASE_* (FIREBASE_AUTH.md).' };
  }

  if (Platform.OS === 'web') {
    return { ok: false, error: APPLE_WEB_UNSUPPORTED_MESSAGE };
  }

  if (Platform.OS !== 'ios') {
    return {
      ok: false,
      error: 'Sign in with Apple est disponible sur iOS uniquement.',
    };
  }

  // Expo Go → aud = host.exp.Exponent ≠ app.jumelo attendu par Firebase.
  if (isExpoGoRuntime()) {
    return { ok: false, error: APPLE_FIREBASE_EXPO_GO_MESSAGE };
  }

  // Import dynamique : évite de charger le module natif sur Android / web.
  const AppleAuthentication = await import('expo-apple-authentication');

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, error: 'Sign in with Apple indisponible sur cet appareil.' };
  }

  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, error: 'Firebase indisponible.' };

  const rawNonce = randomNonce();
  const hashedNonce = await sha256(rawNonce);

  try {
    const apple = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!apple.identityToken) {
      return { ok: false, error: 'Jeton Apple manquant.' };
    }

    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: apple.identityToken,
      rawNonce,
    });

    const cred = await signInWithCredential(auth, credential);

    // Apple ne renvoie le nom qu’à la première autorisation.
    if (!cred.user.displayName) {
      const fullName = [apple.fullName?.givenName, apple.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (fullName) {
        await updateProfile(cred.user, { displayName: fullName });
      }
    }

    const bridged = await bridgeIdTokenToSupabase('apple', apple.identityToken, rawNonce);

    return {
      ok: true,
      firebaseUser: cred.user,
      supabaseUserId: bridged?.userId,
      supabaseEmail: bridged?.email,
    };
  } catch (e) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      return { ok: false, cancelled: true, error: 'Connexion annulée.' };
    }
    if (isAppleAudienceMismatchError(e)) {
      return { ok: false, error: APPLE_FIREBASE_EXPO_GO_MESSAGE };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Connexion Apple impossible.',
    };
  }
}

export async function signInWithProviderFirebase(
  provider: AuthProviderId,
): Promise<ProviderSignInResult> {
  if (provider === 'google') return signInWithGoogleFirebase();
  return signInWithAppleFirebase();
}

/** Construit un profil local tant que le bridge Supabase n’a pas fourni d’UUID. */
export function localProfileIdFromFirebase(uid: string): string {
  return `fb-${uid}`;
}

export function isLocalFirebaseProfileId(id: string): boolean {
  return id.startsWith('fb-');
}
