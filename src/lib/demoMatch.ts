import { hasIncomingLike } from './api/likes';
import { isOfficialJumelage } from './matching';

/**
 * Règles de match en mode démo / Expo Go.
 *
 * Un jumelage peut venir de :
 * 1. Like mutuel — la personne m’avait déjà liké → « C’est un match! »
 * 2. Score ≥ MATCH_THRESHOLD (80) sur le premier like Discover, ou sur Léa / Noah
 *
 * Cas de test (voir TEST.md) :
 * - Home → « Cas de test : like reçu » → Maxime dans Activité → sheet Like back / Pass
 * - Home → « Cas de test : like mutuel » → liker Maya dans Discover → match
 * - Premier like Discover avec score ≥ 80 → « C’est un match! »
 * - Score < 80 sans like entrant → toast seulement
 */
export const DEMO_ALWAYS_MATCH_IDS = ['u-lea', 'u-noah'] as const;

export function isDemoHighScoreMatch(
  likedUserId: string,
  previousLikeCount: number,
  score: number,
): boolean {
  if (!isOfficialJumelage(score)) return false;
  if (previousLikeCount === 0) return true;
  return (DEMO_ALWAYS_MATCH_IDS as readonly string[]).includes(likedUserId);
}

/** @deprecated Prefer `isDemoHighScoreMatch` + `shouldCelebrateMatch`. */
export function isDemoMutualMatch(
  likedUserId: string,
  previousLikeCount: number,
  score: number,
): boolean {
  return isDemoHighScoreMatch(likedUserId, previousLikeCount, score);
}

/**
 * Décide si un like droit doit ouvrir l’écran « C’est un match! ».
 * Priorité au like mutuel (incoming), puis aux règles score démo.
 */
export async function shouldCelebrateMatch(params: {
  myId: string;
  likedUserId: string;
  previousLikeCount: number;
  score: number;
  /** Résultat déjà calculé par createLike (évite un 2e round-trip) */
  mutualFromLike?: boolean;
}): Promise<boolean> {
  if (params.mutualFromLike) return true;
  const theyLikedMe = await hasIncomingLike(params.myId, params.likedUserId);
  if (theyLikedMe) return true;
  return isDemoHighScoreMatch(params.likedUserId, params.previousLikeCount, params.score);
}
