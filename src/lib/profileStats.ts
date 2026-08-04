import AsyncStorage from '@react-native-async-storage/async-storage';

import { listTeams } from './api/teams';
import { loadLikesState } from './likesStore';
import {
  getUserRatingSummary,
  type TeamSession,
  type UserRatingSummary,
} from './teamSessions';

const SESSIONS_KEY = '@jumelo/team-sessions';

export type ProfileStats = {
  jumelosCount: number;
  /** Sessions terminées où l’utilisateur était participant */
  sessionsCompleted: number;
  /** Équipes dont il est le chef (créateur) */
  sessionsCreated: number;
  teamsOwned: number;
  /** Sessions démarrées en tant que chef */
  sessionsLed: number;
  rating: UserRatingSummary;
};

async function loadSessions(): Promise<TeamSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { sessions?: TeamSession[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions : [];
  } catch {
    return [];
  }
}

/** Stats profil calculées depuis likes, équipes et sessions locales. */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  if (!userId) {
    return {
      jumelosCount: 0,
      sessionsCompleted: 0,
      sessionsCreated: 0,
      teamsOwned: 0,
      sessionsLed: 0,
      rating: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topTags: [],
      },
    };
  }

  const [likes, teams, sessions, rating] = await Promise.all([
    loadLikesState(),
    listTeams(userId),
    loadSessions(),
    getUserRatingSummary(userId),
  ]);

  const jumelosCount = likes.matches.filter(
    (m) => m.userA === userId || m.userB === userId,
  ).length;

  const teamsOwned = teams.filter((t) => t.ownerId === userId).length;

  const sessionsCompleted = sessions.filter(
    (s) => s.status === 'ended' && s.participantIds.includes(userId),
  ).length;

  const sessionsLed = sessions.filter((s) => s.startedBy === userId).length;
  /** Affiché comme « sessions créées » = équipes dont il est le chef. */
  const sessionsCreated = teamsOwned;

  return {
    jumelosCount,
    sessionsCompleted,
    sessionsCreated,
    teamsOwned,
    sessionsLed,
    rating,
  };
}
