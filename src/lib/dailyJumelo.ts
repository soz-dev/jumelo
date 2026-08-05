import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '../data/mock';
import { createLike } from './api/likes';
import { getOrCreateDmConversation } from './api/messages';
import { createTeam, joinTeam } from './api/teams';
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
  return { byUserId: {}, accepts: [] };
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

async function loadRoot(): Promise<DailyRootState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRoot();
    const parsed = JSON.parse(raw) as Partial<DailyRootState>;
    return {
      byUserId:
        parsed.byUserId && typeof parsed.byUserId === 'object' ? parsed.byUserId : {},
      accepts: Array.isArray(parsed.accepts) ? parsed.accepts : [],
    };
  } catch {
    return emptyRoot();
  }
}

async function saveRoot(state: DailyRootState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function userState(root: DailyRootState, userId: string): UserDailyState {
  return root.byUserId[userId] ?? {};
}

function setUserState(
  root: DailyRootState,
  userId: string,
  next: UserDailyState,
): void {
  root.byUserId[userId] = next;
}

/** Accept A→B déjà enregistré (tous periodId — survit au rollover 24h). */
function hasAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
): boolean {
  return root.accepts.some(
    (a) => a.fromUserId === fromUserId && a.toUserId === toUserId,
  );
}

function recordAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
  periodId: number,
): void {
  if (hasAccept(root, fromUserId, toUserId)) return;
  root.accepts.push({
    fromUserId,
    toUserId,
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
  const mine = userState(root, myId);
  const refused = new Set(mine.refusedPeerIds ?? []);
  const formed = new Set(mine.formedWith ?? []);
  const seen = new Set<string>();
  const sorted = root.accepts
    .filter(
      (a) =>
        a.toUserId === myId &&
        !hasAccept(root, myId, a.fromUserId) &&
        !refused.has(a.fromUserId) &&
        !formed.has(a.fromUserId),
    )
    .sort((a, b) => a.at.localeCompare(b.at));

  const out: Array<{ fromUserId: string; periodId: number; at: string }> = [];
  for (const a of sorted) {
    if (seen.has(a.fromUserId)) continue;
    seen.add(a.fromUserId);
    out.push({ fromUserId: a.fromUserId, periodId: a.periodId, at: a.at });
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

  const spentStatus = mine.proposal?.status;
  if (
    spentStatus === 'refused' ||
    spentStatus === 'waiting_peer' ||
    spentStatus === 'accepted' ||
    spentStatus === 'expired'
  ) {
    // Après le verrou 24h, on ne recycle pas la carte décidée
    delete mine.proposal;
    dirty = true;
  }

  const incoming = incomingAccepter(root, me.id);
  const prop = mine.proposal;

  // Priorité absolue : accept entrant non répondu (même hors periodId courant)
  if (incoming && (!prop || prop.status === 'pending')) {
    if (!prop || prop.peerId !== incoming || prop.periodId !== periodId) {
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
  }

  const reusable =
    prop &&
    prop.periodId === periodId &&
    (prop.status === 'pending' || prop.status === 'matched');

  if (reusable && prop) {
    if (dirty) setUserState(root, me.id, mine);
    return { mine, dirty };
  }

  // Nouvelle proposition pour la fenêtre (incoming forcé si présent)
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
  // Clear expired lock fields once a new card is issued
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
    return { ...common, mode: 'cooldown' };
  }

  if (trial?.outcome === 'formed') {
    return {
      ...common,
      mode: 'formed',
      iConfirmedFormation: true,
      peerConfirmedFormation: true,
    };
  }

  if (trial?.outcome === 'rejected') {
    return { ...common, mode: 'rejected' };
  }

  if (trial?.outcome === 'open') {
    return { ...common, mode: 'trial' };
  }

  const status = mine.proposal?.status;
  if (
    status === 'waiting_peer' ||
    status === 'accepted' ||
    (lock.msUntilLockEnd > 0 && mine.decision === 'accepted')
  ) {
    return { ...common, mode: 'waiting_peer' };
  }

  if (mine.proposal && status === 'pending') {
    return {
      ...common,
      mode: 'card',
      proposal: mine.proposal,
      score: mine.proposal.score,
    };
  }

  return {
    ...common,
    mode: 'empty',
    proposal: null,
    peer: null,
    score: 0,
    iConfirmedFormation: false,
    peerConfirmedFormation: false,
  };
}

export async function refuseDailyJumelo(myId: string): Promise<DailyViewModel | null> {
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
}

/** Récupère le trial ouvert lié à une conversation DM (si présent). */
export async function getOpenTrialForConversation(
  myId: string,
  conversationId: string,
): Promise<DailyTrial | null> {
  const root = await loadRoot();
  const mine = userState(root, myId);
  const trial = expireStaleTrial(mine.trial, Date.now());
  if (trial && trial !== mine.trial) {
    setUserState(root, myId, { ...mine, trial });
    // sync peer rejection
    const peer = { ...userState(root, trial.peerId) };
    if (peer.trial?.conversationId === conversationId && peer.trial.outcome === 'open') {
      peer.trial = { ...peer.trial, outcome: 'rejected' };
      setUserState(root, trial.peerId, peer);
    }
    await saveRoot(root);
  }
  if (!trial || trial.conversationId !== conversationId) return null;
  if (trial.outcome !== 'open' && trial.outcome !== 'formed' && trial.outcome !== 'rejected') {
    return null;
  }
  return trial;
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
    return { ok: false, error: 'Cette discussion a expiré.' };
  }
  if (trial.outcome === 'formed') {
    return { ok: true, trial, formed: true, teamId: trial.teamId };
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
    return { ok: true, trial, formed: false };
  }

  // Créer le jumelo (équipe de 2)
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
    return { ok: false, error: created.error };
  }

  await addPeerToTeam(created.team.id, me.id, trial.peerId, peer
    ? {
        name: peer.name,
        photo: peer.photo,
        avatarColor: peer.avatarColor,
        city: peer.city,
      }
    : undefined);

  // Recharger team avec 2 membres si join local a marché
  const { getTeam } = await import('./api/teams');
  let team = (await getTeam(created.team.id, me.id)) ?? created.team;
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

  return { ok: true, trial, formed: true, teamId: team.id };
}

/** Après un rejet / formed, permet de passer à la prochaine carte (nouvelle fenêtre). */
export async function dismissDailyOutcome(myId: string): Promise<void> {
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
      delete mine.lockUntil;
      delete mine.cooldownUntil;
      delete mine.decision;
      delete mine.decisionAt;
    }
    delete mine.trial;
    delete mine.proposal;
    setUserState(root, myId, mine);
    await saveRoot(root);
  }
}

export async function resetDailyJumeloDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
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
  const root = await loadRoot();
  return pendingIncomingAccepts(root, myId);
}

/**
 * DEV / démo : Maxime (ou autre persona) t’accepte en Jumelo du jour.
 * La carte du jour priorise alors cette personne.
 */
export async function seedIncomingDailyAccept(
  myId: string,
  fromUserId = 'u-maxime',
): Promise<string> {
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
}
