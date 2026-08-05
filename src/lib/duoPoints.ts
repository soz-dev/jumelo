import type { SessionRating, TeamSession } from './teamSessions';
import { getTeamSessionBundles } from './teamSessions';
import { computeCheckinXp } from './dailyCheckin';

/**
 * Points & rang jumelo — style progression ranked (inspiré Wild Rift / ranked duo).
 *
 * Gain XP (pts) :
 *   sessions_terminées × 50
 * + sessions_actives × 15
 * + Σ(étoiles) × 4
 * + bonus qualité (moy. notes)
 *
 * Cadence réaliste (~65–90 XP / session notée) :
 *   ~2 sessions  → Bronze
 *   ~7           → Or
 *   ~12          → Platine
 *   ~26          → Diamant
 *   ~40          → Maître
 *   ~70+         → Légendaire
 *
 * Niveau jumelo 1–50 (courbe croissante) + rang (Fer → Légendaire) + titre d’ambiance.
 */
export const DUO_POINT_RULES = {
  ENDED_SESSION: 50,
  ACTIVE_SESSION: 15,
  PER_STAR: 4,
  HIGH_AVG_THRESHOLD: 4.5,
  HIGH_AVG_BONUS: 40,
  GOOD_AVG_THRESHOLD: 4.0,
  GOOD_AVG_BONUS: 20,
  MIN_RATINGS_FOR_AVG_BONUS: 2,
  MAX_LEVEL: 50,
} as const;

export type DuoRankId =
  | 'fer'
  | 'bronze'
  | 'argent'
  | 'or'
  | 'platine'
  | 'emeraude'
  | 'diamant'
  | 'maitre'
  | 'grand_maitre'
  | 'legendaire';

export type DuoDivision = 'IV' | 'III' | 'II' | 'I';

export type DuoRankTier = {
  id: DuoRankId;
  label: string;
  /** XP cumulé minimum pour entrer dans le rang. */
  minXp: number;
  color: string;
  colorSoft: string;
  /** Divisions IV→I (false pour Maître+). */
  hasDivisions: boolean;
};

/** Seuils calibrés sur ~70 XP / session finie + notes. */
export const DUO_RANK_TIERS: readonly DuoRankTier[] = [
  {
    id: 'fer',
    label: 'Fer',
    minXp: 0,
    color: '#8B7355',
    colorSoft: 'rgba(139,115,85,0.16)',
    hasDivisions: true,
  },
  {
    id: 'bronze',
    label: 'Bronze',
    minXp: 100,
    color: '#C47A3A',
    colorSoft: 'rgba(196,122,58,0.16)',
    hasDivisions: true,
  },
  {
    id: 'argent',
    label: 'Argent',
    minXp: 250,
    color: '#7A8B9A',
    colorSoft: 'rgba(122,139,154,0.18)',
    hasDivisions: true,
  },
  {
    id: 'or',
    label: 'Or',
    minXp: 450,
    color: '#C9A227',
    colorSoft: 'rgba(201,162,39,0.18)',
    hasDivisions: true,
  },
  {
    id: 'platine',
    label: 'Platine',
    minXp: 750,
    color: '#3FA9A0',
    colorSoft: 'rgba(63,169,160,0.16)',
    hasDivisions: true,
  },
  {
    id: 'emeraude',
    label: 'Émeraude',
    minXp: 1150,
    color: '#2E9B6A',
    colorSoft: 'rgba(46,155,106,0.16)',
    hasDivisions: true,
  },
  {
    id: 'diamant',
    label: 'Diamant',
    minXp: 1700,
    color: '#4A8FD4',
    colorSoft: 'rgba(74,143,212,0.16)',
    hasDivisions: true,
  },
  {
    id: 'maitre',
    label: 'Maître',
    minXp: 2450,
    color: '#8E4EC6',
    colorSoft: 'rgba(142,78,198,0.16)',
    hasDivisions: false,
  },
  {
    id: 'grand_maitre',
    label: 'Grand Maître',
    minXp: 3400,
    color: '#D64545',
    colorSoft: 'rgba(214,69,69,0.16)',
    hasDivisions: false,
  },
  {
    id: 'legendaire',
    label: 'Légendaire',
    minXp: 4600,
    color: '#E8A317',
    colorSoft: 'rgba(232,163,23,0.18)',
    hasDivisions: false,
  },
] as const;

const DIVISIONS: DuoDivision[] = ['IV', 'III', 'II', 'I'];

export type DuoRankSnapshot = {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  /** 0–1 vers le prochain niveau (1 si max). */
  progressToNextLevel: number;
  rankId: DuoRankId;
  rankLabel: string;
  division: DuoDivision | null;
  /** Affichage ranked : « Or II », « Légendaire ». */
  displayName: string;
  /** Titre d’ambiance du binôme. */
  title: string;
  color: string;
  colorSoft: string;
  /** 0–1 dans la bande du rang actuel. */
  progressInRank: number;
  rankIndex: number;
  isMaxLevel: boolean;
  isMaxRank: boolean;
};

export type DuoScore = {
  points: number;
  sessionsEnded: number;
  sessionsActive: number;
  averageRating: number;
  ratingCount: number;
  breakdown: {
    fromSessions: number;
    fromStars: number;
    qualityBonus: number;
  };
  rank: DuoRankSnapshot;
};

/** XP requis pour passer du niveau `level` → `level + 1` (level ≥ 1). */
export function xpNeededForLevel(level: number): number {
  const L = Math.max(1, Math.min(DUO_POINT_RULES.MAX_LEVEL, Math.floor(level)));
  // Courbe douce : ~niv.20 vers Diamant, ~niv.30 vers Légendaire, max ~120–140 sessions.
  return Math.round(24 + L * 10 + Math.pow(L, 1.22) * 2.4);
}

/** XP cumulé pour atteindre un niveau (niveau 1 = 0). */
export function cumulativeXpForLevel(level: number): number {
  const target = Math.max(1, Math.min(DUO_POINT_RULES.MAX_LEVEL, Math.floor(level)));
  let total = 0;
  for (let L = 1; L < target; L += 1) {
    total += xpNeededForLevel(L);
  }
  return total;
}

export function levelFromXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressToNextLevel: number;
  isMaxLevel: boolean;
} {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  let spent = 0;

  while (level < DUO_POINT_RULES.MAX_LEVEL) {
    const need = xpNeededForLevel(level);
    if (safeXp < spent + need) {
      const into = safeXp - spent;
      return {
        level,
        xpIntoLevel: into,
        xpForNextLevel: need,
        progressToNextLevel: need <= 0 ? 1 : Math.min(1, into / need),
        isMaxLevel: false,
      };
    }
    spent += need;
    level += 1;
  }

  return {
    level: DUO_POINT_RULES.MAX_LEVEL,
    xpIntoLevel: Math.max(0, safeXp - spent),
    xpForNextLevel: 0,
    progressToNextLevel: 1,
    isMaxLevel: true,
  };
}

function tierIndexForXp(xp: number): number {
  let idx = 0;
  for (let i = 0; i < DUO_RANK_TIERS.length; i += 1) {
    if (xp >= DUO_RANK_TIERS[i].minXp) idx = i;
  }
  return idx;
}

function divisionForXp(xp: number, tierIndex: number): DuoDivision | null {
  const tier = DUO_RANK_TIERS[tierIndex];
  if (!tier.hasDivisions) return null;

  const next = DUO_RANK_TIERS[tierIndex + 1];
  const bandEnd = next ? next.minXp : tier.minXp + 400;
  const span = Math.max(1, bandEnd - tier.minXp);
  const into = Math.max(0, xp - tier.minXp);
  const segment = span / 4;
  const raw = Math.min(3, Math.floor(into / segment));
  return DIVISIONS[raw];
}

function progressInRank(xp: number, tierIndex: number): number {
  const tier = DUO_RANK_TIERS[tierIndex];
  const next = DUO_RANK_TIERS[tierIndex + 1];
  if (!next) return 1;
  const span = Math.max(1, next.minXp - tier.minXp);
  return Math.min(1, Math.max(0, (xp - tier.minXp) / span));
}

/**
 * Titres d’ambiance — distincts du rang ranked.
 * Priorité : légende → synergie → volume de sessions.
 */
export function duoFlavorTitle(input: {
  sessionsEnded: number;
  averageRating: number;
  ratingCount: number;
  rankId: DuoRankId;
}): string {
  const { sessionsEnded, averageRating, ratingCount, rankId } = input;

  if (rankId === 'legendaire') return 'Légende jumelée';
  if (rankId === 'grand_maitre') return 'Jumelo d’élite';
  if (rankId === 'maitre') return 'Maîtres du binôme';

  if (ratingCount >= 6 && averageRating >= 4.7) return 'Synergie parfaite';
  if (ratingCount >= 4 && averageRating >= 4.5) return 'Chimie rare';

  if (sessionsEnded >= 50) return 'Inséparables';
  if (sessionsEnded >= 30) return 'Binôme de fer';
  if (sessionsEnded >= 15) return 'Chimie confirmée';
  if (sessionsEnded >= 7) return 'Jumelo régulier';
  if (sessionsEnded >= 3) return 'Binôme en rodage';
  if (sessionsEnded >= 1) return 'Premiers pas';
  return 'Jumelo naissant';
}

export function computeDuoRank(
  points: number,
  meta: { sessionsEnded: number; averageRating: number; ratingCount: number },
): DuoRankSnapshot {
  const xp = Math.max(0, Math.floor(points));
  const lvl = levelFromXp(xp);
  const rankIndex = tierIndexForXp(xp);
  const tier = DUO_RANK_TIERS[rankIndex];
  const division = divisionForXp(xp, rankIndex);
  const displayName = division ? `${tier.label} ${division}` : tier.label;
  const title = duoFlavorTitle({
    sessionsEnded: meta.sessionsEnded,
    averageRating: meta.averageRating,
    ratingCount: meta.ratingCount,
    rankId: tier.id,
  });

  return {
    level: lvl.level,
    xp,
    xpIntoLevel: lvl.xpIntoLevel,
    xpForNextLevel: lvl.xpForNextLevel,
    progressToNextLevel: lvl.progressToNextLevel,
    rankId: tier.id,
    rankLabel: tier.label,
    division,
    displayName,
    title,
    color: tier.color,
    colorSoft: tier.colorSoft,
    progressInRank: progressInRank(xp, rankIndex),
    rankIndex,
    isMaxLevel: lvl.isMaxLevel,
    isMaxRank: tier.id === 'legendaire',
  };
}

export function emptyDuoScore(): DuoScore {
  return {
    points: 0,
    sessionsEnded: 0,
    sessionsActive: 0,
    averageRating: 0,
    ratingCount: 0,
    breakdown: { fromSessions: 0, fromStars: 0, qualityBonus: 0 },
    rank: computeDuoRank(0, {
      sessionsEnded: 0,
      averageRating: 0,
      ratingCount: 0,
    }),
  };
}

export function computeDuoPoints(
  sessions: TeamSession[],
  ratings: SessionRating[],
  checkinXp = 0,
): DuoScore {
  const sessionsEnded = sessions.filter((s) => s.status === 'ended').length;
  const sessionsActive = sessions.filter((s) => s.status === 'active').length;

  const fromSessions =
    sessionsEnded * DUO_POINT_RULES.ENDED_SESSION +
    sessionsActive * DUO_POINT_RULES.ACTIVE_SESSION;

  let starSum = 0;
  for (const r of ratings) {
    starSum += Math.min(5, Math.max(1, Math.round(r.stars)));
  }
  const ratingCount = ratings.length;
  const averageRating =
    ratingCount === 0 ? 0 : Math.round((starSum / ratingCount) * 10) / 10;
  const fromStars = starSum * DUO_POINT_RULES.PER_STAR;

  let qualityBonus = 0;
  if (ratingCount >= DUO_POINT_RULES.MIN_RATINGS_FOR_AVG_BONUS) {
    if (averageRating >= DUO_POINT_RULES.HIGH_AVG_THRESHOLD) {
      qualityBonus = DUO_POINT_RULES.HIGH_AVG_BONUS;
    } else if (averageRating >= DUO_POINT_RULES.GOOD_AVG_THRESHOLD) {
      qualityBonus = DUO_POINT_RULES.GOOD_AVG_BONUS;
    }
  }

  const points = fromSessions + fromStars + qualityBonus + checkinXp;

  return {
    points,
    sessionsEnded,
    sessionsActive,
    averageRating,
    ratingCount,
    breakdown: { fromSessions, fromStars, qualityBonus },
    rank: computeDuoRank(points, { sessionsEnded, averageRating, ratingCount }),
  };
}

/** Scores pour plusieurs jumelos — inclut les XP de check-in quotidien. */
export async function getDuoScoresByTeamIds(
  teamIds: string[],
  /** memberIds par teamId — nécessaire pour valider les journées mutuelles. */
  memberIdsByTeam?: Map<string, string[]>,
): Promise<Map<string, DuoScore>> {
  const { getValidatedDays } = await import('./dailyCheckin');
  const bundles = await getTeamSessionBundles(teamIds);
  const out = new Map<string, DuoScore>();
  for (const id of teamIds) {
    const bundle = bundles.get(id) ?? { sessions: [], ratings: [] };
    let checkinXp = 0;
    const memberIds = memberIdsByTeam?.get(id);
    if (memberIds && memberIds.length >= 2) {
      const validated = await getValidatedDays(id, memberIds);
      checkinXp = computeCheckinXp(validated);
    }
    out.set(id, computeDuoPoints(bundle.sessions, bundle.ratings, checkinXp));
  }
  return out;
}

export async function getDuoScore(teamId: string): Promise<DuoScore> {
  const map = await getDuoScoresByTeamIds([teamId]);
  return map.get(teamId) ?? emptyDuoScore();
}
