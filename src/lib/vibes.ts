import { vibes, type Vibe } from '../constants/catalog';

/** Max vibes sélectionnables sur le profil / onboarding. */
export const MAX_PROFILE_VIBES = 3;
/** Min pour activer Continuer (1 autorisé ; on encourage 2–3 en UI). */
export const MIN_PROFILE_VIBES = 1;

const vibeIdSet = new Set<string>(vibes.map((v) => v.id));

export function isVibe(value: string): value is Vibe {
  return vibeIdSet.has(value);
}

export function clampVibes(list: readonly string[]): Vibe[] {
  const seen = new Set<Vibe>();
  const out: Vibe[] = [];
  for (const raw of list) {
    if (!isVibe(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= MAX_PROFILE_VIBES) break;
  }
  return out;
}

/**
 * Accepte une vibe unique, une CSV, un JSON array, ou un tableau.
 * Anciennes données (`"fun"`) restent valides.
 */
export function parseVibes(raw: unknown): Vibe[] {
  if (Array.isArray(raw)) {
    return clampVibes(raw.filter((v): v is string => typeof v === 'string'));
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];

  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parseVibes(parsed);
    } catch {
      // fall through to CSV / single
    }
  }

  return clampVibes(trimmed.split(',').map((part) => part.trim()));
}

/** Stockage Supabase / compat string : CSV d’ids. */
export function serializeVibes(list: readonly Vibe[]): string {
  return clampVibes(list).join(',');
}

/** Migre `vibes[]` ou l’ancien champ `vibe` string. */
export function normalizeProfileVibes(source: {
  vibes?: unknown;
  vibe?: unknown;
}): Vibe[] {
  if (Array.isArray(source.vibes) && source.vibes.length > 0) {
    const fromArray = clampVibes(
      source.vibes.filter((v): v is string => typeof v === 'string'),
    );
    if (fromArray.length) return fromArray;
  }
  const fromLegacy = parseVibes(source.vibe);
  return fromLegacy.length ? fromLegacy : ['social'];
}

export function formatVibesLabel(list: readonly Vibe[]): string {
  return list
    .map((id) => vibes.find((v) => v.id === id)?.label ?? id)
    .join(' · ');
}

export function toggleVibeSelection(current: readonly Vibe[], id: Vibe): Vibe[] {
  if (current.includes(id)) {
    return current.filter((v) => v !== id);
  }
  if (current.length >= MAX_PROFILE_VIBES) return [...current];
  return [...current, id];
}
