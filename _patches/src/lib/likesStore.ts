import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockUsers, type UserProfile } from '../data/mock';
import { isOfficialJumelage, MATCH_THRESHOLD, rankMatches } from './matching';

const STORAGE_KEY = '@jumelo/likes';

export type LikeRecord = {
  fromUserId: string;
  toUserId: string;
  createdAt: string;
  /** Incoming like seen by the recipient */
  read?: boolean;
  /** Recipient passed / dismissed the incoming like */
  dismissed?: boolean;
};

export type MatchRecord = {
  userA: string;
  userB: string;
  score?: number;
  createdAt: string;
};

export type LikesState = {
  likes: LikeRecord[];
  matches: MatchRecord[];
};

const EMPTY: LikesState = { likes: [], matches: [] };

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return 'à l’instant';
  if (ms < 3_600_000) return `il y a ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `il y a ${Math.floor(ms / 3_600_000)} h`;
  return `il y a ${Math.floor(ms / 86_400_000)} j`;
}

export async function loadLikesState(): Promise<LikesState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY, likes: [], matches: [] };
    const parsed = JSON.parse(raw) as Partial<LikesState>;
    return {
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch {
    return { likes: [], matches: [] };
  }
}

async function saveLikesState(state: LikesState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetLikesState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** True if `fromUserId` already liked `toUserId`. */
export async function hasLike(fromUserId: string, toUserId: string): Promise<boolean> {
  const state = await loadLikesState();
  return state.likes.some(
    (l) => l.fromUserId === fromUserId && l.toUserId === toUserId && !l.dismissed,
  );
}

/** True if `likerId` liked the current user (incoming, not dismissed). */
export async function hasIncomingLike(myId: string, likerId: string): Promise<boolean> {
  return hasLike(likerId, myId);
}

export async function listIncomingLikes(myId: string): Promise<LikeRecord[]> {
  const state = await loadLikesState();
  return state.likes
    .filter((l) => l.toUserId === myId && !l.dismissed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countUnreadIncomingLikes(myId: string): Promise<number> {
  const incoming = await listIncomingLikes(myId);
  return incoming.filter((l) => !l.read).length;
}

export type LikeActionResult = {
  created: boolean;
  mutual: boolean;
  alreadyMatched: boolean;
};

/**
 * Persist an outgoing like. If the peer already liked me → mutual match.
 */
export async function recordOutgoingLike(
  myId: string,
  peerId: string,
  score?: number,
): Promise<LikeActionResult> {
  if (!myId || !peerId || myId === peerId) {
    return { created: false, mutual: false, alreadyMatched: false };
  }

  const state = await loadLikesState();
  const [userA, userB] = orderedPair(myId, peerId);
  const alreadyMatched = state.matches.some((m) => m.userA === userA && m.userB === userB);

  const existing = state.likes.find((l) => l.fromUserId === myId && l.toUserId === peerId);
  if (!existing) {
    state.likes.push({
      fromUserId: myId,
      toUserId: peerId,
      createdAt: new Date().toISOString(),
      read: true,
    });
  }

  const theyLikedMe = state.likes.some(
    (l) => l.fromUserId === peerId && l.toUserId === myId && !l.dismissed,
  );

  // Jumelage officiel seulement si score ≥ MATCH_THRESHOLD (sinon like enregistré, pas de match).
  const scoreOk = typeof score !== 'number' || isOfficialJumelage(score);
  let mutual = false;
  if (theyLikedMe && !alreadyMatched && scoreOk) {
    state.matches.push({
      userA,
      userB,
      score,
      createdAt: new Date().toISOString(),
    });
    // Mark their incoming like as read once we match
    state.likes = state.likes.map((l) =>
      l.fromUserId === peerId && l.toUserId === myId ? { ...l, read: true } : l,
    );
    mutual = true;
  }

  await saveLikesState(state);
  return { created: !existing, mutual: mutual || alreadyMatched, alreadyMatched };
}

/** Enregistre un match démo (ex. jumelage score ≥ 80 sans like entrant). */
export async function recordDemoMatch(
  myId: string,
  peerId: string,
  score?: number,
): Promise<void> {
  if (!myId || !peerId || myId === peerId) return;
  const state = await loadLikesState();
  const [userA, userB] = orderedPair(myId, peerId);
  if (state.matches.some((m) => m.userA === userA && m.userB === userB)) return;
  state.matches.push({
    userA,
    userB,
    score,
    createdAt: new Date().toISOString(),
  });
  await saveLikesState(state);
}

export async function dismissIncomingLike(myId: string, likerId: string): Promise<void> {
  const state = await loadLikesState();
  state.likes = state.likes.map((l) =>
    l.fromUserId === likerId && l.toUserId === myId
      ? { ...l, dismissed: true, read: true }
      : l,
  );
  await saveLikesState(state);
}

export async function markIncomingLikeRead(myId: string, likerId: string): Promise<void> {
  const state = await loadLikesState();
  let changed = false;
  state.likes = state.likes.map((l) => {
    if (l.fromUserId === likerId && l.toUserId === myId && !l.read) {
      changed = true;
      return { ...l, read: true };
    }
    return l;
  });
  if (changed) await saveLikesState(state);
}

export type ActivityItem = {
  id: string;
  kind: 'incoming_like' | 'match' | 'other';
  text: string;
  time: string;
  color: string;
  userId?: string;
  unread?: boolean;
};

const ACTIVITY_SEEN_KEY = '@jumelo/home-activity-seen';

export async function loadSeenActivityIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITY_SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Marque les ids d’activité comme vus (badge Home). */
export async function markActivityIdsSeen(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const seen = await loadSeenActivityIds();
  let changed = false;
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  // Garde une fenêtre raisonnable pour éviter une croissance infinie
  const list = Array.from(seen).slice(-200);
  await AsyncStorage.setItem(ACTIVITY_SEEN_KEY, JSON.stringify(list));
}

export async function buildLikeActivity(myId: string): Promise<ActivityItem[]> {
  const state = await loadLikesState();
  const items: ActivityItem[] = [];

  for (const like of state.likes) {
    if (like.toUserId !== myId || like.dismissed) continue;
    const liker = mockUsers.find((u) => u.id === like.fromUserId);
    const name = liker?.name ?? 'Quelqu’un';
    items.push({
      id: `like-${like.fromUserId}-${like.createdAt}`,
      kind: 'incoming_like',
      text: `${name} a validé votre proposition du jour`,
      time: relativeTime(like.createdAt),
      color: '#0186F0',
      userId: like.fromUserId,
      unread: !like.read,
    });
  }

  for (const match of state.matches) {
    if (match.userA !== myId && match.userB !== myId) continue;
    const peerId = match.userA === myId ? match.userB : match.userA;
    const peer = mockUsers.find((u) => u.id === peerId);
    const name = peer?.name ?? 'ton jumelo';
    const scoreBit = typeof match.score === 'number' ? ` à ${match.score}%` : '';
    items.push({
      id: `match-${peerId}-${match.createdAt}`,
      kind: 'match',
      text: `Nouveau jumelage${scoreBit} avec ${name}`,
      time: relativeTime(match.createdAt),
      color: '#011867',
      userId: peerId,
      unread: false,
    });
  }

  return items.sort((a, b) => {
    // Unread likes first, then keep insertion order via id timestamp suffix
    if (a.unread && !b.unread) return -1;
    if (!a.unread && b.unread) return 1;
    return b.id.localeCompare(a.id);
  });
}

/** Seed: Maxime liked the current user (notification / tap UX). */
export async function seedIncomingLikeFixture(myId: string): Promise<string> {
  const fromId = 'u-maxime';
  const state = await loadLikesState();
  // Remove prior Maxime→me like / match so the case is re-triggerable
  state.likes = state.likes.filter(
    (l) => !(l.fromUserId === fromId && l.toUserId === myId) && !(l.fromUserId === myId && l.toUserId === fromId),
  );
  const [userA, userB] = orderedPair(myId, fromId);
  state.matches = state.matches.filter((m) => !(m.userA === userA && m.userB === userB));
  state.likes.push({
    fromUserId: fromId,
    toUserId: myId,
    createdAt: new Date().toISOString(),
    read: false,
  });
  await saveLikesState(state);
  return fromId;
}

/**
 * Seed: Maya already liked the current user — like her back / Jumelo du jour → mutual match.
 */
export async function seedMutualLikeFixture(myId: string): Promise<string> {
  const fromId = 'u-maya';
  const state = await loadLikesState();
  state.likes = state.likes.filter(
    (l) => !(l.fromUserId === fromId && l.toUserId === myId) && !(l.fromUserId === myId && l.toUserId === fromId),
  );
  const [userA, userB] = orderedPair(myId, fromId);
  state.matches = state.matches.filter((m) => !(m.userA === userA && m.userB === userB));
  state.likes.push({
    fromUserId: fromId,
    toUserId: myId,
    createdAt: new Date().toISOString(),
    read: false,
  });
  await saveLikesState(state);
  return fromId;
}

export type RandomMatchFixture = {
  peerId: string;
  score: number;
  name: string;
  forced: boolean;
};

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * DEV: tire un participant aléatoire compatible (≥80%), crée un match mutuel,
 * puis permet d’ouvrir l’écran « C’est un jumelage ! ».
 * Si aucun score ≥ seuil, retente / force le meilleur candidat pour la démo.
 */
export async function seedRandomMatchFixture(
  me: UserProfile,
  candidates: UserProfile[] = mockUsers,
): Promise<RandomMatchFixture | null> {
  const myId = me.id;
  const pool = candidates.filter((u) => u.id !== myId);
  if (pool.length === 0) return null;

  const ranked = rankMatches(me, pool);
  const official = ranked.filter((m) => isOfficialJumelage(m.score));

  let pick = shuffleInPlace([...official])[0];
  let forced = false;

  if (!pick) {
    // Aucun ≥80 : forcer le meilleur score pour un setup démo cohérent.
    pick = ranked[0];
    forced = true;
  }

  const peerId = pick.user.id;
  const score = forced ? Math.max(pick.score, MATCH_THRESHOLD) : pick.score;
  const now = new Date().toISOString();

  const state = await loadLikesState();
  state.likes = state.likes.filter(
    (l) =>
      !(l.fromUserId === peerId && l.toUserId === myId) &&
      !(l.fromUserId === myId && l.toUserId === peerId),
  );
  const [userA, userB] = orderedPair(myId, peerId);
  state.matches = state.matches.filter((m) => !(m.userA === userA && m.userB === userB));

  state.likes.push(
    {
      fromUserId: peerId,
      toUserId: myId,
      createdAt: now,
      read: true,
    },
    {
      fromUserId: myId,
      toUserId: peerId,
      createdAt: now,
      read: true,
    },
  );
  state.matches.push({
    userA,
    userB,
    score,
    createdAt: now,
  });
  await saveLikesState(state);

  return {
    peerId,
    score,
    name: pick.user.name,
    forced,
  };
}

/**
 * Ancien flux Discover (likes entrants seedés).
 * Avec Jumelo du jour, on ne fabrique plus d’invites Maxime fictives.
 * On nettoie les seeds démo encore en mémoire locale.
 */
export async function ensureDemoIncomingLikes(myId: string): Promise<void> {
  if (!myId) return;
  const state = await loadLikesState();
  const before = state.likes.length;
  // Retirer les likes entrants provenant de personas mock (u-*).
  state.likes = state.likes.filter(
    (l) => !(l.toUserId === myId && l.fromUserId.startsWith('u-')),
  );
  if (state.likes.length !== before) {
    await saveLikesState(state);
  }
}
