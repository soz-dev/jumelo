/** Pseudo / display name — validation partagée (profil, auth). */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateDisplayName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = normalizeDisplayName(raw);
  if (!name) {
    return { ok: false, error: 'Le pseudo ne peut pas être vide.' };
  }
  if (name.length < DISPLAY_NAME_MIN) {
    return {
      ok: false,
      error: `Au moins ${DISPLAY_NAME_MIN} caractères.`,
    };
  }
  if (name.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: `Maximum ${DISPLAY_NAME_MAX} caractères.`,
    };
  }
  return { ok: true, name };
}
