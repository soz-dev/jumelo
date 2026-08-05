import type { IconName } from '../design-system/Icon';
import type { ProfileStats } from './profileStats';
import { getProfileStats } from './profileStats';

export type AchievementId =
  | 'first-jumelo'
  | 'trio-jumelo'
  | 'circle-jumelo'
  | 'first-team'
  | 'captain'
  | 'first-session'
  | 'session-regular'
  | 'well-rated'
  | 'reliable'
  | 'session-chef';

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  icon: IconName;
  /** Seuil pour la barre de progression (si > 1) */
  target: number;
};

export type AchievementProgress = AchievementDef & {
  current: number;
  unlocked: boolean;
  progress: number;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-jumelo',
    title: 'Premier jumelage',
    description: 'Réalise ton premier jumelage mutuel.',
    icon: 'heart',
    target: 1,
  },
  {
    id: 'trio-jumelo',
    title: 'Jumelo régulier',
    description: 'Cumule 3 jumelages.',
    icon: 'social',
    target: 3,
  },
  {
    id: 'circle-jumelo',
    title: 'Cercle Jumelo',
    description: 'Atteins 5 jumelages.',
    icon: 'teams',
    target: 5,
  },
  {
    id: 'first-team',
    title: 'Premier jumelo',
    description: 'Crée ton premier binôme.',
    icon: 'spark',
    target: 1,
  },
  {
    id: 'captain',
    title: 'Capitaine',
    description: 'Crée 3 jumelos ou groupes.',
    icon: 'live',
    target: 3,
  },
  {
    id: 'first-session',
    title: 'Session bouclée',
    description: 'Termine une session en équipe.',
    icon: 'check',
    target: 1,
  },
  {
    id: 'session-regular',
    title: 'Habitué',
    description: 'Participe à 5 sessions terminées.',
    icon: 'pulse',
    target: 5,
  },
  {
    id: 'well-rated',
    title: 'Bien noté',
    description: 'Moyenne ≥ 4★ avec au moins 3 avis.',
    icon: 'interest',
    target: 3,
  },
  {
    id: 'reliable',
    title: 'Fiable',
    description: 'Score de fiabilité ≥ 90.',
    icon: 'lock-open',
    target: 90,
  },
  {
    id: 'session-chef',
    title: 'Chef de session',
    description: 'Mène 3 sessions en tant que chef.',
    icon: 'common',
    target: 3,
  },
];

function progressFor(
  current: number,
  target: number,
): { current: number; unlocked: boolean; progress: number } {
  const capped = Math.min(current, target);
  return {
    current: capped,
    unlocked: current >= target,
    progress: target <= 0 ? 0 : Math.min(1, current / target),
  };
}

export function computeAchievements(
  stats: ProfileStats,
  reliability: number,
): AchievementProgress[] {
  const values: Record<AchievementId, number> = {
    'first-jumelo': stats.jumelosCount,
    'trio-jumelo': stats.jumelosCount,
    'circle-jumelo': stats.jumelosCount,
    'first-team': stats.teamsOwned,
    captain: stats.teamsOwned,
    'first-session': stats.sessionsCompleted,
    'session-regular': stats.sessionsCompleted,
    'well-rated':
      stats.rating.count >= 3 && stats.rating.average >= 4
        ? stats.rating.count
        : Math.min(stats.rating.count, 2),
    reliable: reliability,
    'session-chef': stats.sessionsLed,
  };

  return ACHIEVEMENTS.map((def) => {
    const raw = values[def.id] ?? 0;
    // well-rated: unlock only when avg ≥ 4 and count ≥ 3
    if (def.id === 'well-rated') {
      const unlocked = stats.rating.count >= 3 && stats.rating.average >= 4;
      return {
        ...def,
        current: Math.min(stats.rating.count, def.target),
        unlocked,
        progress: unlocked
          ? 1
          : Math.min(1, stats.rating.count / def.target),
      };
    }
    return { ...def, ...progressFor(raw, def.target) };
  });
}

export async function getAchievementsForUser(
  userId: string,
  reliability = 80,
): Promise<AchievementProgress[]> {
  const stats = await getProfileStats(userId);
  return computeAchievements(stats, reliability);
}
