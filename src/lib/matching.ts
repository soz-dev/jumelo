import {
  availabilities,
  categories,
  platforms,
  vibes,
  type Availability,
  type PlatformId,
  type UniverseId,
  type Vibe,
} from '../constants/catalog';
import type { UserProfile } from '../data/mock';

/** Seuil officiel d’un jumelage : score >= 80 / 100. */
export const MATCH_THRESHOLD = 80;

export function isOfficialJumelage(score: number): boolean {
  return score >= MATCH_THRESHOLD;
}

export type MatchReasonKey =
  | 'activites'
  | 'univers'
  | 'dispos'
  | 'vibe'
  | 'objectifs'
  | 'niveau'
  | 'plateformes'
  | 'ville'
  | 'langues';

export type MatchReason = {
  key: MatchReasonKey;
  label: string;
  detail: string;
  /** Contribution au score final (0 → max). */
  points: number;
  /** Poids effectif de la dimension (somme des max ≈ 100). */
  max: number;
  /** Similarité brute 0–1 avant pondération. */
  similarity: number;
  /** Éléments concrets en commun (si applicable). */
  shared: string[];
};

export type MatchResult = {
  user: UserProfile;
  score: number;
  reasons: MatchReason[];
};

/** Poids relatifs des dimensions (somme = 100). */
export const MATCH_WEIGHTS = {
  activites: 32,
  univers: 12,
  dispos: 14,
  vibe: 12,
  objectifs: 10,
  niveau: 8,
  plateformes: 6,
  ville: 4,
  langues: 2,
} as const satisfies Record<MatchReasonKey, number>;

const levelRank: Record<UserProfile['level'], number> = {
  debutant: 0,
  intermediaire: 1,
  avance: 2,
  pro: 3,
};

type DimDraft = {
  key: MatchReasonKey;
  label: string;
  weight: number;
  /** false = dimension ignorée (les deux côtés vides) → poids redistribué. */
  applicable: boolean;
  similarity: number;
  detail: string;
  shared: string[];
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function uniqueNormalized(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const key = normalize(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Intersection sur clés normalisées, labels d’affichage pris du premier profil. */
function overlapLabels(meValues: readonly string[], otherValues: readonly string[]): {
  keys: string[];
  labels: string[];
} {
  const meMap = new Map<string, string>();
  for (const raw of meValues) {
    const key = normalize(raw);
    if (!key || meMap.has(key)) continue;
    meMap.set(key, raw.trim());
  }
  const otherKeys = new Set(uniqueNormalized(otherValues));
  const keys: string[] = [];
  const labels: string[] = [];
  for (const [key, label] of meMap) {
    if (!otherKeys.has(key)) continue;
    keys.push(key);
    labels.push(label);
  }
  return { keys, labels };
}

function overlapKeys(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(a);
  return b.filter((item) => set.has(item));
}

/**
 * Similarité d’ensembles pour le matching coéquipier :
 * - Dice : chevauchement relatif équilibré
 * - Coverage : part du plus petit profil couverte (ex. « tout ce qu’il aime, je l’ai »)
 * Moyenne pondérée → plus précise qu’un simple count plafonné.
 */
function setSimilarity(a: readonly string[], b: readonly string[]): {
  similarity: number;
  shared: string[];
  applicable: boolean;
} {
  if (a.length === 0 && b.length === 0) {
    return { similarity: 0, shared: [], applicable: false };
  }
  if (a.length === 0 || b.length === 0) {
    return { similarity: 0, shared: [], applicable: true };
  }
  const shared = overlapKeys(a, b);
  const dice = (2 * shared.length) / (a.length + b.length);
  const coverage = shared.length / Math.min(a.length, b.length);
  const similarity = clamp01(0.55 * dice + 0.45 * coverage);
  return { similarity, shared, applicable: true };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function subLabel(subId: string): string {
  for (const cat of categories) {
    const sub = cat.subCategories.find((s) => s.id === subId);
    if (sub) return sub.label;
  }
  return subId;
}

function findSubIdByLabel(label: string): string | undefined {
  const n = normalize(label);
  for (const cat of categories) {
    const sub = cat.subCategories.find(
      (s) => normalize(s.label) === n || normalize(s.id) === n,
    );
    if (sub) return sub.id;
  }
  return undefined;
}

/** Clés canoniques d’activités (sous-cat + intérêts mappés) — évite les doublons Valorant/valorant. */
export function activityKeys(profile: UserProfile): string[] {
  const keys = new Set<string>();
  for (const id of profile.subCategoryIds ?? []) {
    if (id.trim()) keys.add(`id:${normalize(id)}`);
  }
  for (const interest of profile.interests) {
    const mapped = findSubIdByLabel(interest);
    if (mapped) keys.add(`id:${normalize(mapped)}`);
    else keys.add(`label:${normalize(interest)}`);
  }
  return [...keys];
}

function activityLabels(keys: string[]): string[] {
  return keys.map((key) => {
    if (key.startsWith('id:')) return subLabel(key.slice(3));
    if (key.startsWith('label:')) return key.slice(6);
    return key;
  });
}

function universeLabels(ids: UniverseId[]): string[] {
  return ids.map((id) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.shortLabel ?? id;
  });
}

function vibeLabels(ids: Vibe[]): string[] {
  return ids.map((id) => vibes.find((v) => v.id === id)?.label ?? id);
}

function availabilityLabels(ids: Availability[]): string[] {
  return ids.map((id) => availabilities.find((a) => a.id === id)?.label ?? id);
}

function platformLabels(ids: PlatformId[]): string[] {
  return ids.map((id) => platforms.find((p) => p.id === id)?.label ?? id);
}

function formatShared(labels: string[], empty: string): string {
  if (labels.length === 0) return empty;
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 3).join(', ')} (+${labels.length - 3})`;
}

function levelSimilarity(me: UserProfile, other: UserProfile): number {
  const delta = Math.abs(levelRank[me.level] - levelRank[other.level]);
  // Même niveau = 1 ; ±1 = 0.72 ; ±2 = 0.38 ; ±3 = 0.1
  if (delta === 0) return 1;
  if (delta === 1) return 0.72;
  if (delta === 2) return 0.38;
  return 0.1;
}

function levelDetail(me: UserProfile, other: UserProfile): string {
  const delta = Math.abs(levelRank[me.level] - levelRank[other.level]);
  if (delta === 0) return 'Même niveau';
  if (delta === 1) return 'Niveaux proches';
  if (delta === 2) return 'Écart de niveau notable';
  return 'Niveaux très éloignés';
}

function citySimilarity(me: UserProfile, other: UserProfile): {
  similarity: number;
  applicable: boolean;
  detail: string;
  shared: string[];
} {
  const a = normalize(me.city);
  const b = normalize(other.city);
  if (!a && !b) return { similarity: 0, applicable: false, detail: 'Ville non renseignée', shared: [] };
  if (!a || !b) {
    return {
      similarity: 0,
      applicable: true,
      detail: `${other.city || '—'} vs ${me.city || '—'}`,
      shared: [],
    };
  }
  if (a === b) {
    return {
      similarity: 1,
      applicable: true,
      detail: `Tous les deux à ${me.city.trim()}`,
      shared: [me.city.trim()],
    };
  }
  // Soft match : une ville contient l’autre (ex. « Lyon 3e » / « Lyon »)
  if (a.includes(b) || b.includes(a)) {
    return {
      similarity: 0.75,
      applicable: true,
      detail: `Même zone · ${me.city.trim()} / ${other.city.trim()}`,
      shared: [me.city.trim()],
    };
  }
  return {
    similarity: 0,
    applicable: true,
    detail: `${other.city} vs ${me.city}`,
    shared: [],
  };
}

/** Répartition entière via plus grands restes pour que Σ max = 100. */
function largestRemainder(exact: number[], total: number): number[] {
  const floored = exact.map((n) => Math.floor(n));
  let remain = total - floored.reduce((s, n) => s + n, 0);
  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floored];
  for (let k = 0; k < order.length && remain > 0; k += 1) {
    out[order[k].i] += 1;
    remain -= 1;
  }
  return out;
}

function buildDimensions(me: UserProfile, other: UserProfile): DimDraft[] {
  const myActivities = activityKeys(me);
  const theirActivities = activityKeys(other);
  const act = setSimilarity(myActivities, theirActivities);
  const sharedActivityLabels = activityLabels(act.shared);

  const uni = setSimilarity(
    me.universes.map((u) => normalize(u)),
    other.universes.map((u) => normalize(u)),
  );
  const sharedUniverses = overlapKeys(me.universes, other.universes) as UniverseId[];

  const avail = setSimilarity(
    me.availability.map((a) => normalize(a)),
    other.availability.map((a) => normalize(a)),
  );
  const sharedAvail = overlapKeys(me.availability, other.availability) as Availability[];

  const vibe = setSimilarity(
    me.vibes.map((v) => normalize(v)),
    other.vibes.map((v) => normalize(v)),
  );
  const sharedVibes = overlapKeys(me.vibes, other.vibes) as Vibe[];

  const objKeysMe = uniqueNormalized(me.objectives);
  const objKeysOther = uniqueNormalized(other.objectives);
  const obj = setSimilarity(objKeysMe, objKeysOther);
  const objLabels = overlapLabels(me.objectives, other.objectives).labels;

  const plat = setSimilarity(
    (me.platforms ?? []).map((p) => normalize(p)),
    (other.platforms ?? []).map((p) => normalize(p)),
  );
  const sharedPlatforms = overlapKeys(
    me.platforms ?? [],
    other.platforms ?? [],
  ) as PlatformId[];

  const city = citySimilarity(me, other);

  const lang = setSimilarity(
    uniqueNormalized(me.languages ?? []),
    uniqueNormalized(other.languages ?? []),
  );
  const langLabels = overlapLabels(me.languages ?? [], other.languages ?? []).labels;

  return [
    {
      key: 'activites',
      label: 'Activités',
      weight: MATCH_WEIGHTS.activites,
      applicable: act.applicable,
      similarity: act.similarity,
      shared: sharedActivityLabels,
      detail:
        sharedActivityLabels.length > 0
          ? formatShared(sharedActivityLabels, '')
          : 'Peu d’activités en commun',
    },
    {
      key: 'univers',
      label: 'Univers',
      weight: MATCH_WEIGHTS.univers,
      applicable: uni.applicable,
      similarity: uni.similarity,
      shared: universeLabels(sharedUniverses),
      detail:
        sharedUniverses.length > 0
          ? formatShared(universeLabels(sharedUniverses), '')
          : 'Univers différents',
    },
    {
      key: 'dispos',
      label: 'Disponibilités',
      weight: MATCH_WEIGHTS.dispos,
      applicable: avail.applicable,
      similarity: avail.similarity,
      shared: availabilityLabels(sharedAvail),
      detail:
        sharedAvail.length > 0
          ? formatShared(availabilityLabels(sharedAvail), '')
          : 'Créneaux peu alignés',
    },
    {
      key: 'vibe',
      label: 'Vibes',
      weight: MATCH_WEIGHTS.vibe,
      applicable: vibe.applicable,
      similarity: vibe.similarity,
      shared: vibeLabels(sharedVibes),
      detail:
        sharedVibes.length > 0
          ? formatShared(vibeLabels(sharedVibes), '')
          : 'Vibes différentes',
    },
    {
      key: 'objectifs',
      label: 'Objectifs',
      weight: MATCH_WEIGHTS.objectifs,
      applicable: obj.applicable,
      similarity: obj.similarity,
      shared: objLabels,
      detail:
        objLabels.length > 0
          ? formatShared(objLabels, '')
          : 'Objectifs différents',
    },
    {
      key: 'niveau',
      label: 'Niveau',
      weight: MATCH_WEIGHTS.niveau,
      applicable: true,
      similarity: levelSimilarity(me, other),
      shared: [],
      detail: levelDetail(me, other),
    },
    {
      key: 'plateformes',
      label: 'Plateformes',
      weight: MATCH_WEIGHTS.plateformes,
      applicable: plat.applicable,
      similarity: plat.similarity,
      shared: platformLabels(sharedPlatforms),
      detail:
        sharedPlatforms.length > 0
          ? formatShared(platformLabels(sharedPlatforms), '')
          : plat.applicable
            ? 'Pas de plateforme en commun'
            : 'Plateformes non renseignées',
    },
    {
      key: 'ville',
      label: 'Ville',
      weight: MATCH_WEIGHTS.ville,
      applicable: city.applicable,
      similarity: city.similarity,
      shared: city.shared,
      detail: city.detail,
    },
    {
      key: 'langues',
      label: 'Langues',
      weight: MATCH_WEIGHTS.langues,
      applicable: lang.applicable,
      similarity: lang.similarity,
      shared: langLabels,
      detail:
        langLabels.length > 0
          ? formatShared(langLabels, '')
          : lang.applicable
            ? 'Langues différentes'
            : 'Langues non renseignées',
    },
  ];
}

function scorePair(me: UserProfile, other: UserProfile): MatchResult {
  const dims = buildDimensions(me, other);
  const active = dims.filter((d) => d.applicable);
  const pool = active.length > 0 ? active : dims;
  const totalWeight = pool.reduce((sum, d) => sum + d.weight, 0) || 1;

  const exactMax = pool.map((d) => (d.weight / totalWeight) * 100);
  const maxes = largestRemainder(exactMax, 100);
  const exactPoints = pool.map((d, i) => d.similarity * maxes[i]);

  // Points entiers, bornés par max, puis ajustement pour coller au score arrondi global.
  const rawScore = exactPoints.reduce((s, n) => s + n, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  let points = exactPoints.map((n, i) => Math.min(maxes[i], Math.round(n)));
  let pointsSum = points.reduce((s, n) => s + n, 0);
  if (pointsSum !== score && pool.length > 0) {
    const diff = score - pointsSum;
    const order = exactPoints
      .map((n, i) => ({ i, frac: n - Math.floor(n), room: maxes[i] - points[i] }))
      .sort((a, b) => (diff > 0 ? b.frac - a.frac : a.frac - b.frac));
    let left = diff;
    for (const item of order) {
      if (left === 0) break;
      if (left > 0 && item.room > 0) {
        points[item.i] += 1;
        left -= 1;
      } else if (left < 0 && points[item.i] > 0) {
        points[item.i] -= 1;
        left += 1;
      }
    }
  }

  const reasons: MatchReason[] = pool.map((d, i) => ({
    key: d.key,
    label: d.label,
    detail: d.detail,
    points: points[i],
    max: maxes[i],
    similarity: Math.round(d.similarity * 1000) / 1000,
    shared: d.shared,
  }));

  // Tri : meilleures contributions d’abord (stable pour l’UI « pourquoi »).
  reasons.sort((a, b) => b.points - a.points || b.similarity - a.similarity);

  return { user: other, score, reasons };
}

export function computeMatch(me: UserProfile, other: UserProfile): MatchResult {
  return scorePair(me, other);
}

export function rankMatches(
  me: UserProfile,
  candidates: UserProfile[],
): MatchResult[] {
  return candidates
    .filter((candidate) => candidate.id !== me.id)
    .map((candidate) => scorePair(me, candidate))
    .sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name));
}

export function getMatch(
  me: UserProfile,
  candidates: UserProfile[],
  userId: string,
): MatchResult | undefined {
  return rankMatches(me, candidates).find((match) => match.user.id === userId);
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Jumelage excellent';
  if (score >= MATCH_THRESHOLD) return 'Jumelage';
  if (score >= 65) return 'Très compatible';
  if (score >= 50) return 'Bon potentiel';
  if (score >= 35) return 'À explorer';
  return 'Peu aligné';
}
