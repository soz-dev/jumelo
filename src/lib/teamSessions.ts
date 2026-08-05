import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@jumelo/team-sessions';

export type TeamSessionStatus = 'idle' | 'active' | 'ended';

export type TeamSession = {
  id: string;
  teamId: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  startedBy: string;
  /** Membres présents au démarrage — base de la notation */
  participantIds: string[];
};

export type SessionRating = {
  id: string;
  sessionId: string;
  teamId: string;
  /** Stocké pour anti-doublon ; jamais exposé sur le profil */
  raterId: string;
  rateeId: string;
  stars: number;
  tag?: string;
  createdAt: string;
};

export type RatingTagId =
  | 'fairplay'
  | 'vibe'
  | 'fiable'
  | 'clair'
  | 'motive';

export const RATING_TAGS: { id: RatingTagId; label: string }[] = [
  { id: 'fairplay', label: 'Fair-play' },
  { id: 'vibe', label: 'Bonne vibe' },
  { id: 'fiable', label: 'Fiable' },
  { id: 'clair', label: 'Clair en com' },
  { id: 'motive', label: 'Motivé' },
];

export type RatingEntryInput = {
  rateeId: string;
  stars: number;
  tag?: RatingTagId;
};

export type UserRatingSummary = {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  topTags: { id: RatingTagId; label: string; count: number }[];
};

type SessionsState = {
  sessions: TeamSession[];
  ratings: SessionRating[];
};

function clampStars(n: number): number {
  const rounded = Math.round(n);
  return Math.min(5, Math.max(1, rounded));
}

async function loadState(): Promise<SessionsState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], ratings: [] };
    const parsed = JSON.parse(raw) as Partial<SessionsState>;
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      ratings: Array.isArray(parsed.ratings) ? parsed.ratings : [],
    };
  } catch {
    return { sessions: [], ratings: [] };
  }
}

async function saveState(state: SessionsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetTeamSessionsDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Dernière session connue pour une équipe (active ou ended). */
export async function getLatestSession(teamId: string): Promise<TeamSession | null> {
  const state = await loadState();
  const list = state.sessions
    .filter((s) => s.teamId === teamId)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  return list[0] ?? null;
}

export function sessionUiStatus(session: TeamSession | null): TeamSessionStatus {
  if (!session) return 'idle';
  return session.status === 'active' ? 'active' : 'ended';
}

export async function getSessionById(sessionId: string): Promise<TeamSession | null> {
  const state = await loadState();
  return state.sessions.find((s) => s.id === sessionId) ?? null;
}

export async function startTeamSession(params: {
  teamId: string;
  ownerId: string;
  actorId: string;
  memberIds: string[];
}): Promise<{ ok: true; session: TeamSession } | { ok: false; error: string }> {
  const { teamId, ownerId, actorId, memberIds } = params;
  if (actorId !== ownerId) {
    return { ok: false, error: 'Seul le chef peut démarrer la session.' };
  }
  const uniqueMembers = [...new Set(memberIds.filter(Boolean))];
  if (uniqueMembers.length < 2) {
    return {
      ok: false,
      error: 'Il faut au moins 2 membres pour démarrer une session.',
    };
  }
  if (!uniqueMembers.includes(ownerId)) {
    return { ok: false, error: 'Le chef doit faire partie de l’équipe.' };
  }

  const state = await loadState();
  const active = state.sessions.find((s) => s.teamId === teamId && s.status === 'active');
  if (active) {
    return { ok: false, error: 'Une session est déjà en cours.' };
  }

  const session: TeamSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    teamId,
    status: 'active',
    startedAt: new Date().toISOString(),
    startedBy: actorId,
    participantIds: uniqueMembers,
  };
  state.sessions = [session, ...state.sessions];
  await saveState(state);
  return { ok: true, session };
}

export async function endTeamSession(params: {
  teamId: string;
  ownerId: string;
  actorId: string;
  /** Membres encore présents à la fin (optionnel — fusionné avec le snapshot start) */
  memberIds?: string[];
}): Promise<{ ok: true; session: TeamSession } | { ok: false; error: string }> {
  const { teamId, ownerId, actorId, memberIds } = params;
  if (actorId !== ownerId) {
    return { ok: false, error: 'Seul le chef peut terminer la session.' };
  }

  const state = await loadState();
  const idx = state.sessions.findIndex((s) => s.teamId === teamId && s.status === 'active');
  if (idx < 0) {
    return { ok: false, error: 'Aucune session active à terminer.' };
  }

  const current = state.sessions[idx];
  const merged = [
    ...new Set([...(current.participantIds ?? []), ...(memberIds ?? [])].filter(Boolean)),
  ];
  const ended: TeamSession = {
    ...current,
    status: 'ended',
    endedAt: new Date().toISOString(),
    participantIds: merged.length >= 2 ? merged : current.participantIds,
  };
  state.sessions[idx] = ended;
  await saveState(state);
  return { ok: true, session: ended };
}

/** Sessions ended où l’utilisateur n’a pas encore soumis ses notes. */
export async function getPendingRatingSession(
  teamId: string,
  userId: string,
): Promise<TeamSession | null> {
  const state = await loadState();
  const ended = state.sessions
    .filter(
      (s) =>
        s.teamId === teamId &&
        s.status === 'ended' &&
        s.participantIds.includes(userId) &&
        s.participantIds.filter((id) => id !== userId).length > 0,
    )
    .sort((a, b) => (a.endedAt! < b.endedAt! ? 1 : -1));

  for (const session of ended) {
    const already = state.ratings.some(
      (r) => r.sessionId === session.id && r.raterId === userId,
    );
    if (!already) return session;
  }
  return null;
}

export async function hasRatedSession(
  sessionId: string,
  raterId: string,
): Promise<boolean> {
  const state = await loadState();
  return state.ratings.some((r) => r.sessionId === sessionId && r.raterId === raterId);
}

export async function submitSessionRatings(params: {
  sessionId: string;
  raterId: string;
  entries: RatingEntryInput[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { sessionId, raterId, entries } = params;
  const state = await loadState();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return { ok: false, error: 'Session introuvable.' };
  if (session.status !== 'ended') {
    return { ok: false, error: 'Tu pourras noter une fois la session terminée.' };
  }
  if (!session.participantIds.includes(raterId)) {
    return { ok: false, error: 'Tu ne faisais pas partie de cette session.' };
  }

  const already = state.ratings.some(
    (r) => r.sessionId === sessionId && r.raterId === raterId,
  );
  if (already) {
    return { ok: false, error: 'Tu as déjà noté les coéquipiers de cette session.' };
  }

  const others = session.participantIds.filter((id) => id !== raterId);
  if (others.length === 0) {
    return { ok: false, error: 'Personne d’autre à noter.' };
  }

  const byRatee = new Map<string, RatingEntryInput>();
  for (const entry of entries) {
    if (!entry?.rateeId) continue;
    byRatee.set(entry.rateeId, entry);
  }

  const missing = others.filter((id) => !byRatee.has(id));
  if (missing.length > 0) {
    return { ok: false, error: 'Note chaque coéquipier avant de valider.' };
  }

  const now = new Date().toISOString();
  const created: SessionRating[] = [];
  for (const rateeId of others) {
    const entry = byRatee.get(rateeId)!;
    if (rateeId === raterId) {
      return { ok: false, error: 'Tu ne peux pas te noter toi-même.' };
    }
    if (!session.participantIds.includes(rateeId)) {
      return { ok: false, error: 'Un des profils notés n’était pas dans la session.' };
    }
    const stars = clampStars(entry.stars);
    const tag =
      entry.tag && RATING_TAGS.some((t) => t.id === entry.tag) ? entry.tag : undefined;
    created.push({
      id: `rate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId,
      teamId: session.teamId,
      raterId,
      rateeId,
      stars,
      tag,
      createdAt: now,
    });
  }

  state.ratings = [...created, ...state.ratings];
  await saveState(state);
  return { ok: true };
}

/** Agrégat public — aucune identité de rater. */
export async function getUserRatingSummary(
  userId: string,
): Promise<UserRatingSummary> {
  const state = await loadState();
  const mine = state.ratings.filter((r) => r.rateeId === userId);
  const distribution: UserRatingSummary['distribution'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let sum = 0;
  const tagCounts = new Map<RatingTagId, number>();
  for (const r of mine) {
    const stars = clampStars(r.stars) as 1 | 2 | 3 | 4 | 5;
    distribution[stars] += 1;
    sum += stars;
    if (r.tag && RATING_TAGS.some((t) => t.id === r.tag)) {
      tagCounts.set(r.tag as RatingTagId, (tagCounts.get(r.tag as RatingTagId) ?? 0) + 1);
    }
  }
  const count = mine.length;
  const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
  const topTags = [...tagCounts.entries()]
    .map(([id, c]) => ({
      id,
      label: RATING_TAGS.find((t) => t.id === id)?.label ?? id,
      count: c,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return { average, count, distribution, topTags };
}

export async function clearSessionsForTeam(teamId: string): Promise<void> {
  const state = await loadState();
  const sessionIds = new Set(
    state.sessions.filter((s) => s.teamId === teamId).map((s) => s.id),
  );
  state.sessions = state.sessions.filter((s) => s.teamId !== teamId);
  state.ratings = state.ratings.filter((r) => !sessionIds.has(r.sessionId));
  await saveState(state);
}

/** Si le chef disparaît / équipe dissoute pendant une session active. */
export async function forceEndActiveSession(teamId: string): Promise<void> {
  const state = await loadState();
  let changed = false;
  state.sessions = state.sessions.map((s) => {
    if (s.teamId === teamId && s.status === 'active') {
      changed = true;
      return { ...s, status: 'ended' as const, endedAt: new Date().toISOString() };
    }
    return s;
  });
  if (changed) await saveState(state);
}

/** Sessions + notes d’une équipe (pour score jumelo, stats, etc.). */
export async function getTeamSessionBundle(teamId: string): Promise<{
  sessions: TeamSession[];
  ratings: SessionRating[];
}> {
  const state = await loadState();
  return {
    sessions: state.sessions.filter((s) => s.teamId === teamId),
    ratings: state.ratings.filter((r) => r.teamId === teamId),
  };
}

/** Bundle multi-équipes en un seul load AsyncStorage. */
export async function getTeamSessionBundles(
  teamIds: string[],
): Promise<Map<string, { sessions: TeamSession[]; ratings: SessionRating[] }>> {
  const ids = [...new Set(teamIds.filter(Boolean))];
  const state = await loadState();
  const map = new Map<string, { sessions: TeamSession[]; ratings: SessionRating[] }>();
  for (const id of ids) {
    map.set(id, {
      sessions: state.sessions.filter((s) => s.teamId === id),
      ratings: state.ratings.filter((r) => r.teamId === id),
    });
  }
  return map;
}
