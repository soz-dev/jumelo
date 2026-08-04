import { hasIncomingLike } from './api/likes';
import { isOfficialJumelage } from './matching';

/**
 * Règles de jumelage en mode démo / Expo Go.
 *
 * Un jumelage peut venir de :
 * 1. Invite mutuelle — la personne voulait déjà jumeler → « C’est un jumelage ! »
 * 2. Score ≥ MATCH_THRESHOLD (80) sur le premier swipe Discover, ou sur Léa / Noah
 *
 * Cas de test (voir TEST.md) :
 * - Home → « Invite reçue » → Maxime dans Activité → sheet Jumeler aussi / Pas pour moi
 * - Home → « Jumelage mutuel » → jumeler Maya dans Discover → jumelage
 * - Premier swipe Discover avec score ≥ 80 → « C’est un jumelage ! »
 * - Score < 80 sans invite entrante → toast seulement
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
 * Décide si un swipe droit doit ouvrir l’écran « C’est un jumelage ! ».
 * Priorité à l’invite mutuelle (incoming), puis aux règles score démo.
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
