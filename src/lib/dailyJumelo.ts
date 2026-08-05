import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '../data/mock';
import { createLike } from './api/likes';
import { getOrCreateDmConversation } from './api/messages';
import { createTeam, findLocalDuoForPair, joinTeam } from './api/teams';
import { confirmJumeloValidation } from './jumeloValidation';
import { rankMatches } from './matching';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { isLocalUserId } from './userIds';

const STORAGE_KEY = '@jumelo/daily-jumelo';
export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const TRIAL_WINDOW_MS = 72 * 60 * 60 * 1000;

export type ProposalStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'waiting_peer'
  | 'matched'
  | 'expired';

export type DailyProposal = {
  periodId: number;
  peerId: string;
  score: number;
  status: ProposalStatus;
  acceptedAt?: string;
  refusedAt?: string;
};

export type DailyTrial = {
  peerId: string;
  conversationId: string;
  startedAt: string;
  endsAt: string;
  confirmedBy: string[];
  teamId?: string;
  outcome: 'open' | 'formed' | 'rejected';
};

export type DailyDecision = 'accepted' | 'refused';

export type UserDailyState = {
  proposal?: DailyProposal;
  /** @deprecated Prefer lockUntil — kept in sync on refuse for compat. */
  cooldownUntil?: string;
  /** Verrou 24h après accept ou refus (prochaine proposition après expiration). */
  lockUntil?: string;
  /** Décision utilisateur sur la carte du jour (persiste pendant le lock). */
  decision?: DailyDecision;
  decisionAt?: string;
  trial?: DailyTrial;
  /** Peers refusés récemment (exclus du pick). */
  refusedPeerIds?: string[];
  /** Peers avec qui un jumelo a été formé via daily. */
  formedWith?: string[];
};

type DailyRootState = {
  byUserId: Record<string, UserDailyState>;
  /** Acceptations daily globales (même device / démo). */
  accepts: Array<{ fromUserId: string; toUserId: string; periodId: number; at: string }>;
  /**
   * Alias d’identité → clé canonique dans byUserId.
   * Ex. `fb-xxx` ↔ UUID Supabase bridgé : même namespace daily.
   */
  idAliases?: Record<string, string>;
};

export type DailyScreenMode =
  | 'cooldown'
  | 'card'
  | 'waiting_peer'
  | 'trial'
  | 'formed'
  | 'rejected'
  | 'empty';

export type DailyViewModel = {
  mode: DailyScreenMode;
  periodId: number;
  proposal: DailyProposal | null;
  peer: UserProfile | null;
  score: number;
  cooldownUntil: string | null;
  lockUntil: string | null;
  decision: DailyDecision | null;
  decisionAt: string | null;
  trial: DailyTrial | null;
  msUntilCooldownEnd: number;
  msUntilLockEnd: number;
  msUntilTrialEnd: number;
  iConfirmedFormation: boolean;
  peerConfirmedFormation: boolean;
};

function emptyRoot(): DailyRootState {
  return { byUserId: {}, accepts: [], idAliases: {} };
}

function periodIdAt(now = Date.now()): number {
  return Math.floor(now / DAILY_WINDOW_MS);
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '0 min';
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Sérialise lecture/écriture AsyncStorage (évite courses focus × accept). */
let dailyQueue: Promise<unknown> = Promise.resolve();

function enqueueDaily<T>(task: () => Promise<T>): Promise<T> {
  const run = dailyQueue.then(task, task);
  dailyQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadRoot(): Promise<DailyRootState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRoot();
    const parsed = JSON.parse(raw) as Partial<DailyRootState>;
    return {
      byUserId:
        parsed.byUserId && typeof parsed.byUserId === 'object' ? parsed.byUserId : {},
      accepts: Array.isArray(parsed.accepts) ? parsed.accepts : [],
      idAliases:
        parsed.idAliases && typeof parsed.idAliases === 'object'
          ? parsed.idAliases
          : {},
    };
  } catch {
    return emptyRoot();
  }
}

async function saveRoot(state: DailyRootState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function canonicalUserId(root: DailyRootState, userId: string): string {
  if (!userId) return userId;
  const aliases = root.idAliases ?? {};
  let cur = userId;
  const seen = new Set<string>();
  while (aliases[cur] && !seen.has(cur)) {
    seen.add(cur);
    cur = aliases[cur]!;
  }
  return cur;
}

function userState(root: DailyRootState, userId: string): UserDailyState {
  const key = canonicalUserId(root, userId);
  return root.byUserId[key] ?? root.byUserId[userId] ?? {};
}

function setUserState(
  root: DailyRootState,
  userId: string,
  next: UserDailyState,
): void {
  const key = canonicalUserId(root, userId);
  root.byUserId[key] = next;
  if (key !== userId && root.byUserId[userId]) {
    delete root.byUserId[userId];
  }
}

/**
 * Relie deux ids (ex. fb-* → UUID) sous la même entrée daily.
 * À appeler si l’auth change de namespace pour le même compte.
 */
export async function linkDailyJumeloIdentity(
  fromId: string,
  toId: string,
): Promise<void> {
  if (!fromId || !toId || fromId === toId) return;
  await enqueueDaily(async () => {
    const root = await loadRoot();
    root.idAliases = root.idAliases ?? {};
    const fromKey = canonicalUserId(root, fromId);
    const toKey = canonicalUserId(root, toId);
    if (fromKey === toKey) {
      root.idAliases[fromId] = toKey;
      root.idAliases[toId] = toKey;
      await saveRoot(root);
      return;
    }
    const fromState = root.byUserId[fromKey] ?? {};
    const toState = root.byUserId[toKey] ?? {};
    // Fusion : privilégier l’état le plus « avancé » (trial / décision).
    const merged: UserDailyState = { ...fromState, ...toState };
    if (fromState.trial && !toState.trial) merged.trial = fromState.trial;
    if (fromState.proposal && !toState.proposal) merged.proposal = fromState.proposal;
    if (fromState.lockUntil && !toState.lockUntil) {
      merged.lockUntil = fromState.lockUntil;
      merged.decision = fromState.decision ?? merged.decision;
      merged.decisionAt = fromState.decisionAt ?? merged.decisionAt;
    }
    merged.refusedPeerIds = [
      ...new Set([
        ...(fromState.refusedPeerIds ?? []),
        ...(toState.refusedPeerIds ?? []),
      ]),
    ].slice(-40);
    merged.formedWith = [
      ...new Set([
        ...(fromState.formedWith ?? []),
        ...(toState.formedWith ?? []),
      ]),
    ];
    root.byUserId[toKey] = merged;
    if (fromKey !== toKey) delete root.byUserId[fromKey];
    root.idAliases[fromId] = toKey;
    root.idAliases[toId] = toKey;
    root.idAliases[fromKey] = toKey;
    // Réécrit les accepts vers la clé canonique
    root.accepts = root.accepts.map((a) => ({
      ...a,
      fromUserId:
        a.fromUserId === fromId || a.fromUserId === fromKey ? toKey : a.fromUserId,
      toUserId: a.toUserId === fromId || a.toUserId === fromKey ? toKey : a.toUserId,
    }));
    await saveRoot(root);
  });
}

/** Accept A→B déjà enregistré (tous periodId — survit au rollover 24h). */
function hasAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
): boolean {
  const from = canonicalUserId(root, fromUserId);
  const to = canonicalUserId(root, toUserId);
  return root.accepts.some((a) => {
    const aFrom = canonicalUserId(root, a.fromUserId);
    const aTo = canonicalUserId(root, a.toUserId);
    return aFrom === from && aTo === to;
  });
}

function recordAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
  periodId: number,
): void {
  const from = canonicalUserId(root, fromUserId);
  const to = canonicalUserId(root, toUserId);
  if (hasAccept(root, from, to)) return;
  root.accepts.push({
    fromUserId: from,
    toUserId: to,
    periodId,
    at: new Date().toISOString(),
  });
}

/**
 * Accepts entrants non répondus : survivent au-delà du periodId courant.
 * Exclut mutuel, refusés, et jumelos déjà formés.
 * Plus ancien d’abord (anti-starvation) : la file priorise l’attente la plus longue.
 */
function pendingIncomingAccepts(
  root: DailyRootState,
  myId: string,
): Array<{ fromUserId: string; periodId: number; at: string }> {
  const meKey = canonicalUserId(root, myId);
  const mine = userState(root, meKey);
  const refused = new Set(mine.refusedPeerIds ?? []);
  const formed = new Set(mine.formedWith ?? []);
  const seen = new Set<string>();
  const sorted = root.accepts
    .filter((a) => {
      const to = canonicalUserId(root, a.toUserId);
      const from = canonicalUserId(root, a.fromUserId);
      return (
        to === meKey &&
        !hasAccept(root, meKey, from) &&
        !refused.has(from) &&
        !refused.has(a.fromUserId) &&
        !formed.has(from) &&
        !formed.has(a.fromUserId)
      );
    })
    .sort((a, b) => a.at.localeCompare(b.at));

  const out: Array<{ fromUserId: string; periodId: number; at: string }> = [];
  for (const a of sorted) {
    const from = canonicalUserId(root, a.fromUserId);
    if (seen.has(from)) continue;
    seen.add(from);
    out.push({ fromUserId: from, periodId: a.periodId, at: a.at });
  }
  return out;
}

function incomingAccepter(root: DailyRootState, myId: string): string | null {
  return pendingIncomingAccepts(root, myId)[0]?.fromUserId ?? null;
}

/** Force la carte du jour de `targetUserId` vers `fromUserId` (accept entrant). */
function forceIncomingProposal(
  root: DailyRootState,
  targetUserId: string,
  fromUserId: string,
  pool: UserProfile[],
  periodId: number,
  now: number,
  fallbackScore: number,
): void {
  let target = { ...userState(root, targetUserId) };
  if (lockEndMs(target) > now) return;
  if (target.trial?.outcome === 'open') return;
  if (target.proposal?.status === 'waiting_peer' || target.proposal?.status === 'matched') {
    return;
  }
  const meProfile = pool.find((u) => u.id === targetUserId);
  const fromProfile = pool.find((u) => u.id === fromUserId);
  if (!meProfile || !fromProfile) {
    target.proposal = {
      periodId,
      peerId: fromUserId,
      score: fallbackScore,
      status: 'pending',
    };
    setUserState(root, targetUserId, target);
    return;
  }
  const picked = pickPeer(meProfile, pool, excludeIds(target), fromUserId);
  target.proposal = {
    periodId,
    peerId: fromUserId,
    score: picked?.score ?? fallbackScore,
    status: 'pending',
  };
  setUserState(root, targetUserId, target);
}

function expireStaleTrial(trial: DailyTrial | undefined, now: number): DailyTrial | undefined {
  if (!trial) return trial;
  if (trial.outcome !== 'open') return trial;
  if (now <= new Date(trial.endsAt).getTime()) return trial;
  return { ...trial, outcome: 'rejected' };
}

function excludeIds(me: UserDailyState): Set<string> {
  const out = new Set<string>([
    ...(me.refusedPeerIds ?? []),
    ...(me.formedWith ?? []),
  ]);
  if (me.trial?.outcome === 'open') out.add(me.trial.peerId);
  if (me.trial?.outcome === 'formed') out.add(me.trial.peerId);
  return out;
}

/** Fin effective du verrou 24h (lockUntil prioritaire, sinon cooldownUntil). */
function lockEndMs(me: UserDailyState): number {
  const lock = me.lockUntil ? new Date(me.lockUntil).getTime() : 0;
  const cool = me.cooldownUntil ? new Date(me.cooldownUntil).getTime() : 0;
  return Math.max(lock, cool);
}

function applyDecisionLock(
  me: UserDailyState,
  decision: DailyDecision,
  now: number,
): UserDailyState {
  const until = new Date(now + DAILY_WINDOW_MS).toISOString();
  const next: UserDailyState = {
    ...me,
    decision,
    decisionAt: new Date(now).toISOString(),
    lockUntil: until,
  };
  if (decision === 'refused') {
    next.cooldownUntil = until;
  }
  return next;
}

function clearExpiredLock(me: UserDailyState, now: number): UserDailyState {
  const end = lockEndMs(me);
  if (end > now) return me;
  const dropLock = Boolean(me.lockUntil);
  const dropCool =
    Boolean(me.cooldownUntil) && new Date(me.cooldownUntil!).getTime() <= now;
  const dropDecision = Boolean(me.decision);
  if (!dropLock && !dropCool && !dropDecision) return me;
  const next = { ...me };
  if (dropLock) delete next.lockUntil;
  if (dropCool) delete next.cooldownUntil;
  if (dropDecision) {
    delete next.decision;
    delete next.decisionAt;
  }
  return next;
}

function pickPeer(
  me: UserProfile,
  pool: UserProfile[],
  excluded: Set<string>,
  forcePeerId?: string | null,
): { peer: UserProfile; score: number } | null {
  if (forcePeerId) {
    const forced = pool.find((u) => u.id === forcePeerId);
    if (forced && forced.id !== me.id) {
      const ranked = rankMatches(me, [forced])[0];
      return {
        peer: forced,
        score: ranked?.score ?? 0,
      };
    }
  }
  const candidates = pool.filter((u) => u.id !== me.id && !excluded.has(u.id));
  const ranked = rankMatches(me, candidates);
  const top = ranked[0];
  if (!top) return null;
  return { peer: top.user, score: top.score };
}

async function ensureProposal(
  root: DailyRootState,
  me: UserProfile,
  pool: UserProfile[],
  now: number,
): Promise<{ mine: UserDailyState; dirty: boolean }> {
  const periodId = periodIdAt(now);
  const prev = userState(root, me.id);
  let mine = { ...prev };
  const expiredTrial = expireStaleTrial(mine.trial, now);
  let dirty = expiredTrial !== mine.trial;
  mine.trial = expiredTrial;

  const lockMs = lockEndMs(mine) - now;
  if (lockMs > 0) {
    // Verrou actif : ne jamais inventer un nouveau peer (même si period a glissé).
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  // Lock expiré : nettoyer décision / proposition consommée (sauf trial ouvert)
  const cleared = clearExpiredLock(mine, now);
  if (cleared !== mine) {
    dirty = true;
    mine = cleared;
  }
  if (mine.trial?.outcome === 'open') {
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  let prop = mine.proposal;
  const propPeriod =
    prop && Number.isFinite(Number(prop.periodId))
      ? Number(prop.periodId)
      : null;
  const status = prop?.status;

  // Sticky dans la fenêtre 24h : pending / attente / accept / match → même peer.
  const stickySamePeriod =
    Boolean(prop) &&
    propPeriod === periodId &&
    (status === 'pending' ||
      status === 'waiting_peer' ||
      status === 'accepted' ||
      status === 'matched');

  if (stickySamePeriod && prop) {
    const incoming = incomingAccepter(root, me.id);
    // Un accept entrant peut seulement réorienter une carte encore pending.
    if (
      incoming &&
      status === 'pending' &&
      (prop.peerId !== incoming || propPeriod !== periodId)
    ) {
      const picked = pickPeer(me, pool, excludeIds(mine), incoming);
      if (picked) {
        mine.proposal = {
          periodId,
          peerId: picked.peer.id,
          score: picked.score,
          status: 'pending',
        };
        setUserState(root, me.id, mine);
        return { mine, dirty: true };
      }
    }
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  // Hors sticky : jeter les propositions consommées / d’une autre période.
  if (
    prop &&
    (propPeriod !== periodId ||
      status === 'refused' ||
      status === 'waiting_peer' ||
      status === 'accepted' ||
      status === 'expired' ||
      status === 'matched')
  ) {
    delete mine.proposal;
    prop = undefined;
    dirty = true;
  }

  const incoming = incomingAccepter(root, me.id);

  // Priorité : accept entrant non répondu
  if (incoming && (!prop || prop.status === 'pending')) {
    if (!prop || prop.peerId !== incoming || propPeriod !== periodId) {
      const picked = pickPeer(me, pool, excludeIds(mine), incoming);
      if (picked) {
        mine.proposal = {
          periodId,
          peerId: picked.peer.id,
          score: picked.score,
          status: 'pending',
        };
        setUserState(root, me.id, mine);
        return { mine, dirty: true };
      }
    } else if (prop) {
      if (dirty) setUserState(root, me.id, mine);
      return { mine, dirty };
    }
  }

  if (prop && propPeriod === periodId && prop.status === 'pending') {
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  // Nouvelle proposition pour la fenêtre
  const picked = pickPeer(me, pool, excludeIds(mine), incoming);
  if (!picked) {
    if (mine.proposal !== undefined) {
      mine.proposal = undefined;
      dirty = true;
    }
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  mine.proposal = {
    periodId,
    peerId: picked.peer.id,
    score: picked.score,
    status: 'pending',
  };
  mine = clearExpiredLock(mine, now);
  setUserState(root, me.id, mine);
  return { mine, dirty: true };
}

async function startTrial(
  root: DailyRootState,
  myId: string,
  peerId: string,
  score: number,
  now: number,
): Promise<DailyTrial> {
  const conversationId = await getOrCreateDmConversation(myId, peerId);
  const startedAt = new Date(now).toISOString();
  const endsAt = new Date(now + TRIAL_WINDOW_MS).toISOString();
  const trial: DailyTrial = {
    peerId,
    conversationId: conversationId || `dm-${[myId, peerId].sort().join('__')}`,
    startedAt,
    endsAt,
    confirmedBy: [],
    outcome: 'open',
  };

  const apply = (uid: string, otherId: string) => {
    const u = { ...userState(root, uid) };
    u.proposal = {
      periodId: periodIdAt(now),
      peerId: otherId,
      score,
      status: 'matched',
      acceptedAt: u.proposal?.acceptedAt ?? startedAt,
    };
    u.trial = { ...trial };
    // Garder lockUntil / decision si déjà posés (verrou 24h post-accept)
    setUserState(root, uid, u);
  };

  apply(myId, peerId);
  apply(peerId, myId);
  return trial;
}

/**
 * Charge / rafraîchit la vue « Jumelo du jour » pour l’utilisateur.
 */
function baseViewFields(
  mine: UserDailyState,
  now: number,
): Pick<
  DailyViewModel,
  | 'cooldownUntil'
  | 'lockUntil'
  | 'decision'
  | 'decisionAt'
  | 'msUntilCooldownEnd'
  | 'msUntilLockEnd'
> {
  const lockEnd = lockEndMs(mine);
  const msUntilLockEnd = Math.max(0, lockEnd - now);
  const cooldownUntil = mine.cooldownUntil ?? mine.lockUntil ?? null;
  const lockUntil = mine.lockUntil ?? mine.cooldownUntil ?? null;
  return {
    cooldownUntil,
    lockUntil,
    decision: mine.decision ?? null,
    decisionAt: mine.decisionAt ?? null,
    msUntilCooldownEnd: msUntilLockEnd,
    msUntilLockEnd,
  };
}

export async function getDailyJumeloView(
  me: UserProfile,
  pool: UserProfile[],
): Promise<DailyViewModel> {
  return enqueueDaily(async () => {
    const now = Date.now();
    const periodId = periodIdAt(now);
    const root = await loadRoot();
    const { mine, dirty } = await ensureProposal(root, me, pool, now);
    // AsyncStorage web = localStorage sync : éviter write à chaque focus/refresh.
    if (dirty) await saveRoot(root);

    const lock = baseViewFields(mine, now);
    const trial = mine.trial ?? null;
    const msUntilTrialEnd = trial
      ? Math.max(0, new Date(trial.endsAt).getTime() - now)
      : 0;

    const peerId = trial?.peerId ?? mine.proposal?.peerId ?? null;
    const peer = peerId ? pool.find((u) => u.id === peerId) ?? null : null;

    const iConfirmedFormation = Boolean(
      trial && me.id && trial.confirmedBy.includes(me.id),
    );
    const peerConfirmedFormation = Boolean(
      trial && peerId && trial.confirmedBy.includes(peerId),
    );

    const common = {
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      trial,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
      ...lock,
    };

    // Refus verrouillé 24h → carte grisée (même pendant un ancien trial non ouvert)
    if (
      lock.msUntilLockEnd > 0 &&
      (mine.decision === 'refused' ||
        mine.proposal?.status === 'refused' ||
        (!mine.decision && Boolean(mine.cooldownUntil))) &&
      trial?.outcome !== 'open'
    ) {
      return { ...common, mode: 'cooldown' as const };
    }

    if (trial?.outcome === 'formed') {
      return {
        ...common,
        mode: 'formed' as const,
        iConfirmedFormation: true,
        peerConfirmedFormation: true,
      };
    }

    if (trial?.outcome === 'rejected') {
      return { ...common, mode: 'rejected' as const };
    }

    if (trial?.outcome === 'open') {
      return { ...common, mode: 'trial' as const };
    }

    const status = mine.proposal?.status;
    if (
      status === 'waiting_peer' ||
      status === 'accepted' ||
      (lock.msUntilLockEnd > 0 &&
        mine.decision === 'accepted' &&
        Boolean(mine.proposal))
    ) {
      return { ...common, mode: 'waiting_peer' as const };
    }

    // Accept/formé dissipé mais verrou 24h encore actif → pas de nouvelle carte
    if (lock.msUntilLockEnd > 0 && mine.decision === 'accepted') {
      return { ...common, mode: 'cooldown' as const };
    }

    if (mine.proposal && status === 'pending') {
      return {
        ...common,
        mode: 'card' as const,
        proposal: mine.proposal,
        score: mine.proposal.score,
      };
    }

    return {
      ...common,
      mode: 'empty' as const,
      proposal: null,
      peer: null,
      score: 0,
      iConfirmedFormation: false,
      peerConfirmedFormation: false,
    };
  });
}

export async function refuseDailyJumelo(myId: string): Promise<DailyViewModel | null> {
  return enqueueDaily(async () => {
    const now = Date.now();
    const root = await loadRoot();
    let mine = { ...userState(root, myId) };
    if (!mine.proposal || mine.proposal.status !== 'pending') {
      return null;
    }
    const peerId = mine.proposal.peerId;
    mine.proposal = {
      ...mine.proposal,
      status: 'refused',
      refusedAt: new Date(now).toISOString(),
    };
    mine = applyDecisionLock(mine, 'refused', now);
    mine.refusedPeerIds = [...new Set([...(mine.refusedPeerIds ?? []), peerId])].slice(
      -40,
    );
    setUserState(root, myId, mine);
    await saveRoot(root);
    return null;
  });
}

export type AcceptDailyResult = {
  mutual: boolean;
  conversationId?: string;
  trial?: DailyTrial;
};

/**
 * Accepte la proposition du jour.
 * Match mutuel → ouvre le trial 72h + DM.
 * Les profils mock `u-*` acceptent automatiquement en retour (démo mono-device).
 */
export async function acceptDailyJumelo(
  me: UserProfile,
  pool: UserProfile[],
): Promise<AcceptDailyResult> {
  return enqueueDaily(async () => {
    const now = Date.now();
    const periodId = periodIdAt(now);
    const root = await loadRoot();
    const ensured = await ensureProposal(root, me, pool, now);
    let mine = { ...ensured.mine };
    const prop = mine.proposal;
    if (!prop || prop.status !== 'pending') {
      if (ensured.dirty) await saveRoot(root);
      return { mutual: false };
    }

    const peerId = prop.peerId;
    recordAccept(root, me.id, peerId, periodId);
    await createLike(me.id, peerId, prop.score);

    // Pas d’auto-accept mock : accepter seul = attente (pas de trial / chat).
    // Mutuel cross-période : l’accept entrant peut dater d’une fenêtre 24h précédente.
    const mutual = hasAccept(root, peerId, me.id);

    if (mutual) {
      const trial = await startTrial(root, me.id, peerId, prop.score, now);
      mine = applyDecisionLock({ ...userState(root, me.id) }, 'accepted', now);
      setUserState(root, me.id, mine);
      // Sync lock sur le peer mutuel
      const peerState = applyDecisionLock(
        { ...userState(root, peerId) },
        'accepted',
        now,
      );
      setUserState(root, peerId, peerState);
      await saveRoot(root);
      return { mutual: true, conversationId: trial.conversationId, trial };
    }

    mine = applyDecisionLock({ ...userState(root, me.id) }, 'accepted', now);
    mine.proposal = {
      ...prop,
      status: 'waiting_peer',
      acceptedAt: new Date(now).toISOString(),
    };
    setUserState(root, me.id, mine);
    // Priorité pour l’autre : sa prochaine carte Du jour = moi
    forceIncomingProposal(root, peerId, me.id, pool, periodId, now, prop.score);
    await saveRoot(root);
    return { mutual: false };
  });
}

/** Récupère le trial ouvert lié à une conversation DM (si présent). */
export async function getOpenTrialForConversation(
  myId: string,
  conversationId: string,
): Promise<DailyTrial | null> {
  return enqueueDaily(async () => {
    const root = await loadRoot();
    let mine = { ...userState(root, myId) };
    let trial = expireStaleTrial(mine.trial, Date.now());
    let dirty = false;

    if (trial && trial !== mine.trial) {
      mine = { ...mine, trial };
      dirty = true;
      const peer = { ...userState(root, trial.peerId) };
      if (
        peer.trial &&
        peer.trial.outcome === 'open' &&
        (peer.trial.conversationId === conversationId ||
          peer.trial.conversationId === trial.conversationId)
      ) {
        peer.trial = { ...peer.trial, outcome: 'rejected' };
        setUserState(root, trial.peerId, peer);
      }
    }

    if (!trial) {
      if (dirty) {
        setUserState(root, myId, mine);
        await saveRoot(root);
      }
      return null;
    }

    // Heal : trial pointait vers un chat seedé `c-*` (bloqué hors admin)
    if (trial.outcome === 'open' && trial.conversationId.startsWith('c-')) {
      const healedId = await getOrCreateDmConversation(myId, trial.peerId);
      if (healedId && healedId !== trial.conversationId) {
        trial = { ...trial, conversationId: healedId };
        mine = { ...mine, trial };
        dirty = true;
        const peer = { ...userState(root, trial.peerId) };
        if (peer.trial) {
          peer.trial = { ...trial };
          setUserState(root, trial.peerId, peer);
        }
      }
    }

    if (dirty) {
      setUserState(root, myId, mine);
      await saveRoot(root);
    }

    if (trial.conversationId !== conversationId) {
      // Ancienne URL seedée encore ouverte après heal → exposer le trial
      if (
        conversationId.startsWith('c-') &&
        trial.conversationId.startsWith('dm-') &&
        (trial.outcome === 'open' || trial.outcome === 'formed')
      ) {
        return trial;
      }
      return null;
    }
    if (
      trial.outcome !== 'open' &&
      trial.outcome !== 'formed' &&
      trial.outcome !== 'rejected'
    ) {
      return null;
    }
    return trial;
  });
}

/**
 * Garantit un conversationId DM réel pour le trial ouvert (pas de seed `c-*`).
 * À appeler avant d’ouvrir le chat d’essai.
 */
export async function ensureDailyTrialConversation(
  myId: string,
): Promise<string | null> {
  return enqueueDaily(async () => {
    const root = await loadRoot();
    const mine = { ...userState(root, myId) };
    const trial = expireStaleTrial(mine.trial, Date.now());
    if (!trial || (trial.outcome !== 'open' && trial.outcome !== 'formed')) {
      return null;
    }
    if (trial.conversationId.startsWith('dm-')) {
      await getOrCreateDmConversation(myId, trial.peerId);
      return trial.conversationId;
    }
    const healedId = await getOrCreateDmConversation(myId, trial.peerId);
    if (!healedId) return trial.conversationId;
    if (healedId === trial.conversationId) return healedId;

    const next = { ...trial, conversationId: healedId };
    setUserState(root, myId, { ...mine, trial: next });
    const peer = { ...userState(root, trial.peerId) };
    if (peer.trial) {
      peer.trial = { ...next };
      setUserState(root, trial.peerId, peer);
    }
    await saveRoot(root);
    return healedId;
  });
}

async function addPeerToTeam(
  teamId: string,
  ownerId: string,
  peerId: string,
  peerMeta?: { name?: string; photo?: string; avatarColor?: string; city?: string },
): Promise<void> {
  const joined = await joinTeam(teamId, peerId, peerMeta);
  if (joined.ok && joined.mode === 'joined') return;

  // Cloud / locked : forcer l’ajout membre si possible
  if (!isSupabaseConfigured() || isLocalUserId(ownerId)) {
    // joinTeam local locked path may have created a request — reopen unlocked path via direct patch
    const { getTeam } = await import('./api/teams');
    // Already attempted join; for local unlocked it should have worked.
    return;
  }

  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from('team_members').upsert({
    team_id: teamId,
    user_id: peerId,
    role: 'member',
  });
}

/**
 * Confirme « former le jumelo » pendant le trial 72h.
 * Quand les deux ont confirmé → crée l’équipe capacity 2.
 */
export async function confirmDailyFormation(params: {
  me: UserProfile;
  peer: UserProfile | null;
}): Promise<
  | { ok: true; trial: DailyTrial; formed: boolean; teamId?: string }
  | { ok: false; error: string }
> {
  return enqueueDaily(async () => {
    const { me, peer } = params;
    const now = Date.now();
    const root = await loadRoot();
    let mine = { ...userState(root, me.id) };
    let trial = expireStaleTrial(mine.trial, now);
    if (!trial || trial.outcome === 'rejected') {
      if (trial) {
        mine.trial = trial;
        setUserState(root, me.id, mine);
        await saveRoot(root);
      }
      return { ok: false as const, error: 'Cette discussion a expiré.' };
    }
    if (trial.outcome === 'formed') {
      return { ok: true as const, trial, formed: true, teamId: trial.teamId };
    }

    let confirmedBy = [...new Set([...trial.confirmedBy, me.id])];
    // Démo mono-device : les personas mock valident aussi la formation.
    if (isLocalUserId(trial.peerId) && trial.peerId.startsWith('u-')) {
      confirmedBy = [...new Set([...confirmedBy, trial.peerId])];
    }
    trial = { ...trial, confirmedBy };
    mine.trial = trial;
    setUserState(root, me.id, mine);

    // Sync peer copy
    const peerState = { ...userState(root, trial.peerId) };
    if (peerState.trial?.conversationId === trial.conversationId) {
      peerState.trial = { ...trial };
      setUserState(root, trial.peerId, peerState);
    }

    const both =
      confirmedBy.includes(me.id) && confirmedBy.includes(trial.peerId);

    if (!both) {
      await saveRoot(root);
      return { ok: true as const, trial, formed: false };
    }

    // Réutilise un duo déjà formé pour la même paire (évite « loup × maxime » en double).
    const existingDuo = await findLocalDuoForPair(me.id, trial.peerId, me.id);
    let team = existingDuo;

    if (!team) {
      const peerName = peer?.name?.trim() || 'Partenaire';
      const myName = me.name?.trim() || 'Jumelo';
      const universe = me.universes?.[0] ?? peer?.universes?.[0] ?? 'gaming';
      const activity =
        me.interests?.[0] ?? peer?.interests?.[0] ?? 'Jumelo';
      const created = await createTeam(me.id, {
        name: `${myName} × ${peerName}`,
        universe,
        activity,
        city: me.city || peer?.city || 'Lyon',
        levelLabel: me.level || 'tous niveaux',
        vibe: me.vibes?.[0] || peer?.vibes?.[0] || 'fun',
        nextSession: 'À définir',
        blurb: 'Jumelo formé via la proposition du jour.',
        capacity: 2,
        locked: false,
      });
      if (!created.ok) {
        await saveRoot(root);
        return { ok: false as const, error: created.error };
      }
      await addPeerToTeam(created.team.id, me.id, trial.peerId, peer
        ? {
            name: peer.name,
            photo: peer.photo,
            avatarColor: peer.avatarColor,
            city: peer.city,
          }
        : undefined);
      team = created.team;
    }

    // Recharger team avec 2 membres si join local a marché
    const { getTeam } = await import('./api/teams');
    team = (await getTeam(team.id, me.id)) ?? team;
    // Si le peer n’est pas encore member (cloud request), forcer memberIds localement pour validation
    if (!team.memberIds.includes(trial.peerId)) {
      team = {
        ...team,
        memberIds: [...new Set([me.id, trial.peerId, ...team.memberIds])],
        membersCount: 2,
        locked: false,
      };
    }

    await confirmJumeloValidation({ team, userId: me.id });
    await confirmJumeloValidation({ team, userId: trial.peerId });

    trial = {
      ...trial,
      outcome: 'formed',
      teamId: team.id,
      confirmedBy: [me.id, trial.peerId],
    };

    const finalize = (uid: string, other: string) => {
      const u = { ...userState(root, uid) };
      u.trial = { ...trial };
      u.formedWith = [...new Set([...(u.formedWith ?? []), other])];
      if (u.proposal) u.proposal = { ...u.proposal, status: 'matched' };
      setUserState(root, uid, u);
    };
    finalize(me.id, trial.peerId);
    finalize(trial.peerId, me.id);
    await saveRoot(root);

    return { ok: true as const, trial, formed: true, teamId: team.id };
  });
}

/** Après un rejet / formed, permet de passer à la prochaine carte (nouvelle fenêtre). */
export async function dismissDailyOutcome(myId: string): Promise<void> {
  await enqueueDaily(async () => {
    const root = await loadRoot();
    let mine = { ...userState(root, myId) };
    const outcome = mine.trial?.outcome;
    if (outcome === 'rejected' || outcome === 'formed') {
      const trialPeerId = mine.trial?.peerId;
      // Garder formedWith ; clear trial pour ne plus bloquer l’UI
      if (outcome === 'rejected') {
        mine = applyDecisionLock(mine, 'refused', Date.now());
        if (trialPeerId) {
          mine.refusedPeerIds = [
            ...new Set([...(mine.refusedPeerIds ?? []), trialPeerId]),
          ].slice(-40);
        }
      } else {
        // Formé : garder / poser le verrou 24h — pas de nouvelle carte au reload immédiat
        if (lockEndMs(mine) <= Date.now()) {
          mine = applyDecisionLock(mine, 'accepted', Date.now());
        }
      }
      delete mine.trial;
      delete mine.proposal;
      setUserState(root, myId, mine);
      await saveRoot(root);
    }
  });
}

export async function resetDailyJumeloDemoState(): Promise<void> {
  await enqueueDaily(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  });
}

export type IncomingDailyAccept = {
  fromUserId: string;
  periodId: number;
  at: string;
};

/** Accepts daily entrants non répondus (tous periodId — prioritaire Du jour). */
export async function listIncomingDailyAccepts(
  myId: string,
): Promise<IncomingDailyAccept[]> {
  return enqueueDaily(async () => {
    const root = await loadRoot();
    return pendingIncomingAccepts(root, myId);
  });
}

/**
 * DEV / démo : Maxime (ou autre persona) t’accepte en Jumelo du jour.
 * La carte du jour priorise alors cette personne.
 */
export async function seedIncomingDailyAccept(
  myId: string,
  fromUserId = 'u-maxime',
): Promise<string> {
  return enqueueDaily(async () => {
    const now = Date.now();
    const periodId = periodIdAt(now);
    const root = await loadRoot();
    // Reset lock / trial pour pouvoir répondre
    const mine = { ...userState(root, myId) };
    delete mine.cooldownUntil;
    delete mine.lockUntil;
    delete mine.decision;
    delete mine.decisionAt;
    if (mine.trial?.outcome !== 'open') {
      delete mine.trial;
    }
    // Force une proposition pending vers ce peer
    mine.proposal = {
      periodId,
      peerId: fromUserId,
      score: 82,
      status: 'pending',
    };
    setUserState(root, myId, mine);
    recordAccept(root, fromUserId, myId, periodId);
    await saveRoot(root);
    return fromUserId;
  });
}
