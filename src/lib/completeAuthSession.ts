import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/** Path web dédié au retour Google (popup) — ne doit pas monter l’UI welcome/login. */
export const WEB_OAUTH_CALLBACK_PATH = '/oauth';

export const GOOGLE_WEB_STABLE_REDIRECT = `http://localhost:8081${WEB_OAUTH_CALLBACK_PATH}`;

export function isWebOAuthCallbackUrl(href?: string): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    const url =
      href ??
      (typeof window !== 'undefined' ? window.location.href : '');
    if (!url) return false;
    const path = new URL(url, 'http://localhost').pathname.replace(/\/+$/, '') || '/';
    return path === WEB_OAUTH_CALLBACK_PATH;
  } catch {
    return false;
  }
}

/**
 * Finalise le popup AuthSession. Sur web, uniquement sur `/oauth`
 * pour éviter de traiter (ou fermer) l’onglet principal de l’app.
 */
export function completeAuthSessionIfNeeded(): void {
  try {
    if (Platform.OS === 'web') {
      if (!isWebOAuthCallbackUrl()) return;
      WebBrowser.maybeCompleteAuthSession();
      return;
    }
    WebBrowser.maybeCompleteAuthSession();
  } catch {
    // Popup sans parent / session absente — ignorer.
  }
}

/** Nettoie une session AuthSession orpheline sur l’onglet principal (pas le popup). */
export function clearStaleWebAuthSession(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (isWebOAuthCallbackUrl()) return;
  if (window.opener) return;
  try {
    const handle = window.localStorage.getItem('ExpoWebBrowserRedirectHandle');
    if (!handle) return;
    window.localStorage.removeItem('ExpoWebBrowserRedirectHandle');
    window.localStorage.removeItem(`ExpoWebBrowser_OriginUrl_${handle}`);
    window.localStorage.removeItem(`ExpoWebBrowser_RedirectUrl_${handle}`);
  } catch {
    /* private mode */
  }
}
