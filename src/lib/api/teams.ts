import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mockJoinRequests,
  mockTeams,
  type JoinRequestStatus,
  type Team,
  type TeamJoinRequest,
} from '../../data/mock';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { canWriteSupabaseUserId, isLocalUserId } from '../userIds';

const STORAGE_KEY = '@jumelo/teams-state';

export type TeamMembershipState =
  | 'none'
  | 'pending'
  | 'member'
  | 'owner'
  | 'rejected';

type TeamsState = {
  teams: Team[];
  joinRequests: TeamJoinRequest[];
};

function cloneSeed(): TeamsState {
  return {
    teams: mockTeams.map((t) => ({
      ...t,
      memberIds: [...t.memberIds],
    })),
    joinRequests: mockJoinRequests.map((r) => ({ ...r })),
  };
}

function syncMemberCount(team: Team): Team {
  return { ...team, membersCount: team.memberIds.length };
}

/**
 * Store local si Supabase off, ou si l’user n’a pas d’UUID session
 * (`u-*` démo, `fb-*` Firebase sans bridge). Ne jamais envoyer `fb-*` en uuid.
 */
function useLocalStore(userId?: string | null): boolean {
  if (!isSupabaseConfigured()) return true;
  if (!userId || isLocalUserId(userId) || !canWriteSupabaseUserId(userId)) {
    return true;
  }
  return false;
}

function hydrateTeam(raw: Team): Team {
  const seed = mockTeams.find((t) => t.id === raw.id);
  const ownerId = raw.ownerId || seed?.ownerId || raw.memberIds[0] || '';
  const memberIds = raw.memberIds?.length
    ? raw.memberIds
    : seed?.memberIds
      ? [...seed.memberIds]
      : ownerId
        ? [ownerId]
        : [];
  // Garantit que le chef est toujours dans la liste des membres
  const withOwner =
    ownerId && !memberIds.includes(ownerId) ? [ownerId, ...memberIds] : memberIds;
  return syncMemberCount({
    ...seed,
    ...raw,
    ownerId,
    memberIds: withOwner,
    locked: raw.locked ?? seed?.locked ?? true,
  });
}

async function loadLocal(): Promise<TeamsState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as TeamsState;
    if (!parsed?.teams?.length) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const state: TeamsState = {
      teams: parsed.teams.map(hydrateTeam),
      joinRequests: parsed.joinRequests ?? [],
    };
    // Persiste si on a injecté ownerId manquant (migration démo)
    const needsPersist = parsed.teams.some((t) => !t.ownerId);
    if (needsPersist) await saveLocal(state);
    return state;
  } catch {
    return cloneSeed();
  }
}

async function saveLocal(state: TeamsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mapDbTeam(
  row: {
    id: string;
    name: string;
    universe: string;
    activity: string;
    city: string;
    level_label: string;
    vibe: string;
    next_session: string | null;
    blurb: string;
    capacity: number;
    owner_id: string | null;
  },
  memberIds: string[],
): Team {
  return syncMemberCount({
    id: row.id,
    name: row.name,
    universe: row.universe as Team['universe'],
    activity: row.activity,
    ownerId: row.owner_id ?? '',
    memberIds,
    membersCount: memberIds.length,
    capacity: row.capacity,
    city: row.city,
    levelLabel: row.level_label,
    vibe: row.vibe,
    nextSession: row.next_session ?? '',
    blurb: row.blurb,
    locked: true,
  });
}

async function listTeamsRemote(): Promise<Team[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: rows, error } = await supabase.from('teams').select('*').order('created_at');
  if (error || !rows) return [];

  const { data: members } = await supabase.from('team_members').select('team_id, user_id');
  const byTeam = new Map<string, string[]>();
  for (const m of members ?? []) {
    const list = byTeam.get(m.team_id) ?? [];
    list.push(m.user_id);
    byTeam.set(m.team_id, list);
  }

  return rows.map((row) => mapDbTeam(row, byTeam.get(row.id) ?? []));
}

async function listJoinRequestsRemote(teamId?: string): Promise<TeamJoinRequest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('team_join_requests').select('*');
  if (teamId) query = query.eq('team_id', teamId);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    status: row.status as JoinRequestStatus,
    createdAt: row.created_at,
  }));
}

export async function listTeams(userId?: string | null): Promise<Team[]> {
  if (useLocalStore(userId)) {
    const state = await loadLocal();
    return state.teams;
  }
  return listTeamsRemote();
}

export async function getTeam(
  teamId: string,
  userId?: string | null,
): Promise<Team | null> {
  const teams = await listTeams(userId);
  return teams.find((t) => t.id === teamId) ?? null;
}

export async function listJoinRequestsForTeam(
  teamId: string,
  userId?: string | null,
): Promise<TeamJoinRequest[]> {
  if (useLocalStore(userId)) {
    const state = await loadLocal();
    return state.joinRequests.filter((r) => r.teamId === teamId);
  }
  return listJoinRequestsRemote(teamId);
}

export function membershipState(
  team: Team | null | undefined,
  joinRequests: TeamJoinRequest[],
  userId: string | null | undefined,
): TeamMembershipState {
  if (!team || !userId) return 'none';
  if (team.ownerId === userId) return 'owner';
  if (team.memberIds.includes(userId)) return 'member';
  const mine = joinRequests
    .filter((r) => r.teamId === team.id && r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!mine) return 'none';
  if (mine.status === 'pending') return 'pending';
  if (mine.status === 'rejected') return 'rejected';
  return 'none';
}

export type JoinTeamResult =
  | { ok: true; mode: 'joined' }
  | { ok: true; mode: 'requested'; request: TeamJoinRequest }
  | { ok: false; error: string };

/**
 * Rejoint une équipe ouverte, ou crée une demande si l’équipe est verrouillée.
 */
export async function joinTeam(
  teamId: string,
  userId: string,
  userName?: string,
): Promise<JoinTeamResult> {
  if (useLocalStore(userId)) {
    const state = await loadLocal();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Équipe introuvable.' };
    if (team.ownerId === userId || team.memberIds.includes(userId)) {
      return { ok: false, error: 'Tu es déjà membre de cette équipe.' };
    }
    if (team.memberIds.length >= team.capacity) {
      return { ok: false, error: 'Cette équipe est complète.' };
    }

    // Groupe ouvert → entrée directe
    if (!team.locked) {
      team.memberIds = [...team.memberIds, userId];
      Object.assign(team, syncMemberCount(team));
      state.joinRequests = state.joinRequests.filter(
        (r) => !(r.teamId === teamId && r.userId === userId),
      );
      await saveLocal(state);
      return { ok: true, mode: 'joined' };
    }

    return requestJoinLocked(state, team, userId, userName);
  }

  // Cloud : pour l’instant demande (colonne locked absente) — même flux request
  const req = await requestJoin(teamId, userId, userName);
  if (!req.ok) return req;
  return { ok: true, mode: 'requested', request: req.request };
}

async function requestJoinLocked(
  state: TeamsState,
  team: Team,
  userId: string,
  userName?: string,
): Promise<JoinTeamResult> {
  const existing = state.joinRequests.find(
    (r) => r.teamId === team.id && r.userId === userId && r.status === 'pending',
  );
  if (existing) {
    return { ok: true, mode: 'requested', request: existing };
  }

  const request: TeamJoinRequest = {
    id: `jr-${Date.now()}`,
    teamId: team.id,
    userId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  state.joinRequests = [
    ...state.joinRequests.filter((r) => !(r.teamId === team.id && r.userId === userId)),
    request,
  ];
  await saveLocal(state);

  try {
    const { notifyUser } = await import('../notifications');
    await notifyUser({
      userId: team.ownerId,
      title: 'Demande d’adhésion',
      body: `${userName?.trim() || 'Quelqu’un'} veut rejoindre « ${team.name} »`,
      data: { type: 'team_join_request', teamId: team.id, requestId: request.id },
    });
  } catch {
    // best-effort
  }

  return { ok: true, mode: 'requested', request };
}

/** @deprecated préférer joinTeam — conserve l’API demande pour équipes verrouillées / cloud */
export async function requestJoin(
  teamId: string,
  userId: string,
  userName?: string,
): Promise<{ ok: true; request: TeamJoinRequest } | { ok: false; error: string }> {
  if (useLocalStore(userId)) {
    const state = await loadLocal();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, error: 'Équipe introuvable.' };
    if (team.ownerId === userId || team.memberIds.includes(userId)) {
      return { ok: false, error: 'Tu es déjà membre de cette équipe.' };
    }
    if (team.memberIds.length >= team.capacity) {
      return { ok: false, error: 'Cette équipe est complète.' };
    }
    const result = await requestJoinLocked(state, team, userId, userName);
    if (!result.ok) return result;
    if (result.mode === 'joined') {
      return {
        ok: false,
        error: 'Équipe ouverte — utilise joinTeam.',
      };
    }
    return { ok: true, request: result.request };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data, error } = await supabase
    .from('team_join_requests')
    .upsert(
      {
        team_id: teamId,
        user_id: userId,
        status: 'pending',
      },
      { onConflict: 'team_id,user_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Demande impossible.' };
  }

  return {
    ok: true,
    request: {
      id: data.id,
      teamId: data.team_id,
      userId: data.user_id,
      status: data.status,
      createdAt: data.created_at,
    },
  };
}

export async function approveJoinRequest(
  requestId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useLocalStore(ownerId)) {
    const state = await loadLocal();
    const request = state.joinRequests.find((r) => r.id === requestId);
    if (!request || request.status !== 'pending') {
      return { ok: false, error: 'Demande introuvable.' };
    }
    const team = state.teams.find((t) => t.id === request.teamId);
    if (!team || team.ownerId !== ownerId) {
      return { ok: false, error: 'Seul le chef peut approuver.' };
    }
    if (team.memberIds.length >= team.capacity) {
      return { ok: false, error: 'Équipe complète.' };
    }
    if (!team.memberIds.includes(request.userId)) {
      team.memberIds = [...team.memberIds, request.userId];
    }
    Object.assign(team, syncMemberCount(team));
    request.status = 'approved';
    await saveLocal(state);
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data: request, error: reqErr } = await supabase
    .from('team_join_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (reqErr || !request) return { ok: false, error: 'Demande introuvable.' };

  const { data: team } = await supabase
    .from('teams')
    .select('owner_id, capacity')
    .eq('id', request.team_id)
    .single();
  if (!team || team.owner_id !== ownerId) {
    return { ok: false, error: 'Seul le chef peut approuver.' };
  }

  const { error: upErr } = await supabase
    .from('team_join_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);
  if (upErr) return { ok: false, error: upErr.message };

  const { error: memErr } = await supabase.from('team_members').upsert({
    team_id: request.team_id,
    user_id: request.user_id,
    role: 'member',
  });
  if (memErr) return { ok: false, error: memErr.message };

  return { ok: true };
}

export async function rejectJoinRequest(
  requestId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useLocalStore(ownerId)) {
    const state = await loadLocal();
    const request = state.joinRequests.find((r) => r.id === requestId);
    if (!request || request.status !== 'pending') {
      return { ok: false, error: 'Demande introuvable.' };
    }
    const team = state.teams.find((t) => t.id === request.teamId);
    if (!team || team.ownerId !== ownerId) {
      return { ok: false, error: 'Seul le chef peut refuser.' };
    }
    request.status = 'rejected';
    await saveLocal(state);
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data: request } = await supabase
    .from('team_join_requests')
    .select('*, teams!inner(owner_id)')
    .eq('id', requestId)
    .single();

  const owner = (request as { teams?: { owner_id: string } } | null)?.teams?.owner_id;
  if (!request || owner !== ownerId) {
    return { ok: false, error: 'Seul le chef peut refuser.' };
  }

  const { error } = await supabase
    .from('team_join_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function kickMember(
  teamId: string,
  memberId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (memberId === ownerId) {
    return { ok: false, error: 'Le chef ne peut pas s’exclure lui-même.' };
  }

  if (useLocalStore(ownerId)) {
    const state = await loadLocal();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || team.ownerId !== ownerId) {
      return { ok: false, error: 'Seul le chef peut exclure un membre.' };
    }
    team.memberIds = team.memberIds.filter((id) => id !== memberId);
    Object.assign(team, syncMemberCount(team));
    await saveLocal(state);
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();
  if (!team || team.owner_id !== ownerId) {
    return { ok: false, error: 'Seul le chef peut exclure un membre.' };
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', memberId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CreateTeamInput = {
  name: string;
  universe: Team['universe'];
  activity: string;
  city: string;
  levelLabel: string;
  vibe: string;
  nextSession: string;
  blurb: string;
  capacity: number;
  /** true = demandes ; false = entrée libre */
  locked?: boolean;
};

export async function createTeam(
  ownerId: string,
  input: CreateTeamInput,
): Promise<{ ok: true; team: Team } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Donne un nom à ton équipe.' };
  if (!input.universe) return { ok: false, error: 'Choisis un univers.' };
  const capacity = Math.round(Number(input.capacity));
  if (!Number.isFinite(capacity) || capacity < 2 || capacity > 20) {
    return { ok: false, error: 'La capacité doit être entre 2 et 20.' };
  }

  const activity = input.activity.trim() || name;
  const city = input.city.trim() || 'Lyon';
  const levelLabel = input.levelLabel.trim() || 'tous niveaux';
  const vibe = input.vibe.trim() || 'fun';
  const nextSession = input.nextSession.trim() || 'À définir';
  const blurb = input.blurb.trim() || `Équipe ${name} — rejoins-nous !`;

  if (useLocalStore(ownerId)) {
    const state = await loadLocal();
    const team: Team = syncMemberCount({
      id: `t-${Date.now()}`,
      name,
      universe: input.universe,
      activity,
      ownerId,
      memberIds: [ownerId],
      membersCount: 1,
      capacity,
      city,
      levelLabel,
      vibe,
      nextSession,
      blurb,
      locked: input.locked !== false,
    });
    state.teams = [team, ...state.teams];
    await saveLocal(state);
    return { ok: true, team };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data: row, error } = await supabase
    .from('teams')
    .insert({
      name,
      universe: input.universe,
      activity,
      city,
      level_label: levelLabel,
      vibe,
      next_session: nextSession,
      blurb,
      capacity,
      owner_id: ownerId,
    })
    .select('*')
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? 'Création impossible.' };
  }

  const { error: memErr } = await supabase.from('team_members').upsert({
    team_id: row.id,
    user_id: ownerId,
    role: 'owner',
  });
  if (memErr) {
    await supabase.from('teams').delete().eq('id', row.id);
    return { ok: false, error: memErr.message };
  }

  return { ok: true, team: mapDbTeam(row, [ownerId]) };
}

export async function dissolveTeam(
  teamId: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (useLocalStore(ownerId)) {
    const state = await loadLocal();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || team.ownerId !== ownerId) {
      return { ok: false, error: 'Seul le chef peut dissoudre l’équipe.' };
    }
    state.teams = state.teams.filter((t) => t.id !== teamId);
    state.joinRequests = state.joinRequests.filter((r) => r.teamId !== teamId);
    await saveLocal(state);
    return { ok: true };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase indisponible.' };

  const { data: team } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();
  if (!team || team.owner_id !== ownerId) {
    return { ok: false, error: 'Seul le chef peut dissoudre l’équipe.' };
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Réinitialise le store démo (tests). */
export async function resetTeamsDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
