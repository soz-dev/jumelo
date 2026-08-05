import { hasIncomingLike } from './api/likes';
import { isOfficialJumelage } from './matching';

/**
 * Règles de jumelage en mode démo / Expo Go.
 *
 * Un jumelage officiel exige toujours score ≥ MATCH_THRESHOLD (80%), y compris
 * en cas d’invite mutuelle. En dessous : invite seule / toast, pas de célébration.
 *
 * Cas de test (Home · DEV) :
 * - « Proposition reçue » → Maxime accepte en Jumelo du jour → répondre dans l’onglet Jumelo
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
 * Score ≥ 80 obligatoire ; invite mutuelle accélère le chemin si le seuil est atteint.
 */
export async function shouldCelebrateMatch(params: {
  myId: string;
  likedUserId: string;
  previousLikeCount: number;
  score: number;
  /** Résultat déjà calculé par createLike (évite un 2e round-trip) */
  mutualFromLike?: boolean;
}): Promise<boolean> {
  if (!isOfficialJumelage(params.score)) return false;
  if (params.mutualFromLike) return true;
  const theyLikedMe = await hasIncomingLike(params.myId, params.likedUserId);
  if (theyLikedMe) return true;
  return isDemoHighScoreMatch(params.likedUserId, params.previousLikeCount, params.score);
}
