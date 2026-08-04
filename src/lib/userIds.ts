/**
 * IDs locaux (démo AsyncStorage / Firebase sans bridge Supabase)
 * vs UUID Postgres attendus par les colonnes uuid Supabase.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Compte démo `u-*` ou profil Firebase local `fb-<firebaseUid>`. */
export function isLocalUserId(id: string | null | undefined): boolean {
  if (!id) return true;
  return id.startsWith('u-') || id.startsWith('fb-');
}

/** Vrai UUID utilisable en FK / owner_id Postgres. */
export function isSupabaseUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_RE.test(id);
}

/**
 * True uniquement si l’id peut être écrit dans une colonne uuid Supabase.
 * Jamais pour `fb-*` / `u-*` — même si Supabase est « configuré ».
 */
export function canWriteSupabaseUserId(id: string | null | undefined): boolean {
  return isSupabaseUuid(id) && !isLocalUserId(id);
}
