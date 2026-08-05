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

export type UserDailyState = {
  proposal?: DailyProposal;
  cooldownUntil?: string;
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
  trial: DailyTrial | null;
  msUntilCooldownEnd: number;
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

function hasAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
  periodId: number,
): boolean {
  return root.accepts.some(
    (a) =>
      a.fromUserId === fromUserId &&
      a.toUserId === toUserId &&
      a.periodId === periodId,
  );
}

function recordAccept(
  root: DailyRootState,
  fromUserId: string,
  toUserId: string,
  periodId: number,
): void {
  if (hasAccept(root, fromUserId, toUserId, periodId)) return;
  root.accepts.push({
    fromUserId,
    toUserId,
    periodId,
    at: new Date().toISOString(),
  });
}

function incomingAccepter(
  root: DailyRootState,
  myId: string,
  periodId: number,
): string | null {
  const hit = root.accepts.find(
    (a) =>
      a.toUserId === myId &&
      a.periodId === periodId &&
      !hasAccept(root, myId, a.fromUserId, periodId),
  );
  return hit?.fromUserId ?? null;
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
): Promise<UserDailyState> {
  const periodId = periodIdAt(now);
  let mine = { ...userState(root, me.id) };
  mine.trial = expireStaleTrial(mine.trial, now);

  const cooldownMs = mine.cooldownUntil
    ? new Date(mine.cooldownUntil).getTime() - now
    : 0;
  if (cooldownMs > 0) {
    setUserState(root, me.id, mine);
    return mine;
  }

  if (mine.trial?.outcome === 'open') {
    setUserState(root, me.id, mine);
    return mine;
  }

  const incoming = incomingAccepter(root, me.id, periodId);
  const prop = mine.proposal;

  const reusable =
    prop &&
    prop.periodId === periodId &&
    (prop.status === 'pending' ||
      prop.status === 'accepted' ||
      prop.status === 'waiting_peer' ||
      prop.status === 'matched');

  if (reusable && prop) {
    // Priorité accept entrant si on n’a pas encore accepté
    if (
      incoming &&
      prop.status === 'pending' &&
      prop.peerId !== incoming
    ) {
      const picked = pickPeer(me, pool, excludeIds(mine), incoming);
      if (picked) {
        mine.proposal = {
          periodId,
          peerId: picked.peer.id,
          score: picked.score,
          status: 'pending',
        };
      }
    } else if (prop.status === 'accepted') {
      mine.proposal = { ...prop, status: 'waiting_peer' };
    }
    setUserState(root, me.id, mine);
    return mine;
  }

  // Nouvelle proposition pour la fenêtre
  const picked = pickPeer(me, pool, excludeIds(mine), incoming);
  if (!picked) {
    mine.proposal = undefined;
    setUserState(root, me.id, mine);
    return mine;
  }

  mine.proposal = {
    periodId,
    peerId: picked.peer.id,
    score: picked.score,
    status: 'pending',
  };
  // Clear old cooldown once a new card is issued
  if (mine.cooldownUntil && new Date(mine.cooldownUntil).getTime() <= now) {
    delete mine.cooldownUntil;
  }
  setUserState(root, me.id, mine);
  return mine;
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
    delete u.cooldownUntil;
    setUserState(root, uid, u);
  };

  apply(myId, peerId);
  apply(peerId, myId);
  return trial;
}

/**
 * Charge / rafraîchit la vue « Jumelo du jour » pour l’utilisateur.
 */
export async function getDailyJumeloView(
  me: UserProfile,
  pool: UserProfile[],
): Promise<DailyViewModel> {
  const now = Date.now();
  const periodId = periodIdAt(now);
  const root = await loadRoot();
  const mine = await ensureProposal(root, me, pool, now);
  await saveRoot(root);

  const cooldownUntil = mine.cooldownUntil ?? null;
  const msUntilCooldownEnd = cooldownUntil
    ? Math.max(0, new Date(cooldownUntil).getTime() - now)
    : 0;

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

  if (msUntilCooldownEnd > 0 && trial?.outcome !== 'open') {
    return {
      mode: 'cooldown',
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
    };
  }

  if (trial?.outcome === 'formed') {
    return {
      mode: 'formed',
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation: true,
      peerConfirmedFormation: true,
    };
  }

  if (trial?.outcome === 'rejected') {
    return {
      mode: 'rejected',
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
    };
  }

  if (trial?.outcome === 'open') {
    return {
      mode: 'trial',
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
    };
  }

  const status = mine.proposal?.status;
  if (status === 'waiting_peer' || status === 'accepted') {
    return {
      mode: 'waiting_peer',
      periodId,
      proposal: mine.proposal ?? null,
      peer,
      score: mine.proposal?.score ?? 0,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
    };
  }

  if (mine.proposal && status === 'pending') {
    return {
      mode: 'card',
      periodId,
      proposal: mine.proposal,
      peer,
      score: mine.proposal.score,
      cooldownUntil,
      trial,
      msUntilCooldownEnd,
      msUntilTrialEnd,
      iConfirmedFormation,
      peerConfirmedFormation,
    };
  }

  return {
    mode: 'empty',
    periodId,
    proposal: null,
    peer: null,
    score: 0,
    cooldownUntil,
    trial,
    msUntilCooldownEnd,
    msUntilTrialEnd,
    iConfirmedFormation: false,
    peerConfirmedFormation: false,
  };
}

export async function refuseDailyJumelo(myId: string): Promise<DailyViewModel | null> {
  const now = Date.now();
  const root = await loadRoot();
  const mine = { ...userState(root, myId) };
  if (!mine.proposal || mine.proposal.status !== 'pending') {
    return null;
  }
  const peerId = mine.proposal.peerId;
  mine.proposal = {
    ...mine.proposal,
    status: 'refused',
    refusedAt: new Date(now).toISOString(),
  };
  mine.cooldownUntil = new Date(now + DAILY_WINDOW_MS).toISOString();
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
  await ensureProposal(root, me, pool, now);
  let mine = { ...userState(root, me.id) };
  const prop = mine.proposal;
  if (!prop || prop.status !== 'pending') {
    return { mutual: false };
  }

  const peerId = prop.peerId;
  recordAccept(root, me.id, peerId, periodId);
  await createLike(me.id, peerId, prop.score);

  // Démo : les personas mock acceptent en miroir pour tester le flux mutuel.
  if (isLocalUserId(peerId) && peerId.startsWith('u-')) {
    recordAccept(root, peerId, me.id, periodId);
  }

  const mutual = hasAccept(root, peerId, me.id, periodId);

  if (mutual) {
    const trial = await startTrial(root, me.id, peerId, prop.score, now);
    await saveRoot(root);
    return { mutual: true, conversationId: trial.conversationId, trial };
  }

  mine = { ...userState(root, me.id) };
  mine.proposal = {
    ...prop,
    status: 'waiting_peer',
    acceptedAt: new Date(now).toISOString(),
  };
  setUserState(root, me.id, mine);
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
  const mine = { ...userState(root, myId) };
  if (mine.trial?.outcome === 'rejected' || mine.trial?.outcome === 'formed') {
    // Garder formedWith ; clear trial pour ne plus bloquer l’UI
    if (mine.trial.outcome === 'rejected') {
      mine.cooldownUntil = new Date(Date.now() + DAILY_WINDOW_MS).toISOString();
      if (mine.trial.peerId) {
        mine.refusedPeerIds = [
          ...new Set([...(mine.refusedPeerIds ?? []), mine.trial.peerId]),
        ].slice(-40);
      }
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

/** Accepts daily entrants (quelqu’un t’a accepté — en attente de ta réponse). */
export async function listIncomingDailyAccepts(
  myId: string,
): Promise<IncomingDailyAccept[]> {
  const now = Date.now();
  const periodId = periodIdAt(now);
  const root = await loadRoot();
  return root.accepts
    .filter(
      (a) =>
        a.toUserId === myId &&
        a.periodId === periodId &&
        !hasAccept(root, myId, a.fromUserId, periodId),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
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
  // Reset cooldown / trial pour pouvoir répondre
  const mine = { ...userState(root, myId) };
  delete mine.cooldownUntil;
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
