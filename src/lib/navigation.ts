import { type Href, router } from 'expo-router';

/**
 * `router.back()` no-ops when the stack has no history (deep link, replace, cold open).
 * Prefer going back when possible, otherwise land on a sensible screen.
 */
export function safeBack(fallback: Href = '/(tabs)/home') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
