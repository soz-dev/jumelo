import type { UserProfile } from '../data/mock';

/** Seuil officiel d’un jumelage : score >= 80 / 100. En dessous = invite seule, pas de « C’est un jumelage ! ». */
export const MATCH_THRESHOLD = 80;

export function isOfficialJumelage(score: number): boolean {
  return score >= MATCH_THRESHOLD;
}

export type MatchReason = {
  key:
    | 'interets'
    | 'niveau'
    | 'objectifs'
    | 'dispos'
    | 'vibe'
    | 'ville'
    | 'fiabilite';
  label: string;
  detail: string;
  points: number;
  max: number;
};

export type MatchResult = {
  user: UserProfile;
  score: number;
  reasons: MatchReason[];
};

const levelRank: Record<UserProfile['level'], number> = {
  debutant: 0,
  intermediaire: 1,
  avance: 2,
  pro: 3,
};

function overlap<T>(a: T[], b: T[]): T[] {
  const set = new Set(a);
  return b.filter((item) => set.has(item));
}

export function computeMatch(me: UserProfile, other: UserProfile): MatchResult {
  return scorePair(me, other);
}

function scorePair(me: UserProfile, other: UserProfile): MatchResult {
  const sharedInterests = overlap(me.interests, other.interests);
  const interestPoints = Math.min(30, sharedInterests.length * 8);

  const levelDelta = Math.abs(levelRank[me.level] - levelRank[other.level]);
  const levelPoints = levelDelta === 0 ? 15 : levelDelta === 1 ? 10 : levelDelta === 2 ? 5 : 0;

  const sharedObjectives = overlap(me.objectives, other.objectives);
  const objectivePoints = Math.min(15, sharedObjectives.length * 5);

  const sharedAvailability = overlap(me.availability, other.availability);
  const availabilityPoints = Math.min(15, sharedAvailability.length * 5);

  const sharedVibes = overlap(me.vibes, other.vibes);
  const vibePoints = sharedVibes.length > 0 ? 10 : 3;

  const sameCity =
    me.city.trim().toLowerCase() === other.city.trim().toLowerCase();
  const cityPoints = sameCity ? 10 : 0;

  const reliabilityPoints = Math.round((other.reliability / 100) * 5);

  const reasons: MatchReason[] = [
    {
      key: 'interets',
      label: 'Intérêts',
      detail:
        sharedInterests.length > 0
          ? sharedInterests.slice(0, 3).join(', ')
          : 'Peu d’intérêts en commun',
      points: interestPoints,
      max: 30,
    },
    {
      key: 'niveau',
      label: 'Niveau',
      detail:
        levelDelta === 0
          ? 'Même niveau'
          : levelDelta === 1
            ? 'Niveaux proches'
            : 'Écart de niveau notable',
      points: levelPoints,
      max: 15,
    },
    {
      key: 'objectifs',
      label: 'Objectifs',
      detail:
        sharedObjectives.length > 0
          ? sharedObjectives.slice(0, 2).join(', ')
          : 'Objectifs différents',
      points: objectivePoints,
      max: 15,
    },
    {
      key: 'dispos',
      label: 'Disponibilités',
      detail:
        sharedAvailability.length > 0
          ? sharedAvailability.join(', ')
          : 'Créneaux peu alignés',
      points: availabilityPoints,
      max: 15,
    },
    {
      key: 'vibe',
      label: 'Vibe',
      detail:
        sharedVibes.length > 0
          ? `Vibe${sharedVibes.length > 1 ? 's' : ''} ${sharedVibes.join(', ')} en commun`
          : 'Vibes différentes',
      points: vibePoints,
      max: 10,
    },
    {
      key: 'ville',
      label: 'Ville',
      detail: sameCity ? `Tous les deux à ${me.city}` : `${other.city} vs ${me.city}`,
      points: cityPoints,
      max: 10,
    },
    {
      key: 'fiabilite',
      label: 'Fiabilité',
      detail: `Score fiabilité ${other.reliability}%`,
      points: reliabilityPoints,
      max: 5,
    },
  ];

  const score = Math.min(
    100,
    reasons.reduce((sum, reason) => sum + reason.points, 0),
  );

  return { user: other, score, reasons };
}

export function rankMatches(
  me: UserProfile,
  candidates: UserProfile[],
): MatchResult[] {
  return candidates
    .filter((candidate) => candidate.id !== me.id)
    .map((candidate) => scorePair(me, candidate))
    .sort((a, b) => b.score - a.score);
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
