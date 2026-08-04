/**
 * Entrypoint OAuth Jumelo — Firebase Auth (Google / Apple).
 * L’ancien flux Supabase `signInWithOAuth` est retiré pour éviter un double OAuth cassé.
 * Pont données : `bridgeIdTokenToSupabase` dans firebaseAuth.ts.
 */

export type OAuthProvider = 'google' | 'apple';

export {
  signInWithProviderFirebase as signInWithOAuthProvider,
  type ProviderSignInResult,
} from './firebaseAuth';

/** @deprecated Deep links OAuth Supabase — plus utilisés (Firebase gère la session). */
export async function handleAuthUrl(_url: string | null) {
  return null;
}
