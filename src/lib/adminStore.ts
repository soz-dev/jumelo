import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockUsers, type Team, type UserProfile } from '../data/mock';
import {
  getOrCreateDmConversation,
  sendMessage,
} from './api/messages';
import { listProfiles, patchProfileFields } from './api/profiles';
import { dissolveTeam, listTeams } from './api/teams';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { canWriteSupabaseUserId } from './userIds';

const OVERRIDES_KEY = '@jumelo/admin-overrides';
const NOTICES_KEY = '@jumelo/admin-notices';
const DELETED_KEY = '@jumelo/admin-deleted';
const BANS_KEY = '@jumelo/admin-bans';
const REPORTS_KEY = '@jumelo/admin-reports';
const ACTIVITY_KEY = '@jumelo/admin-activity';
const HIDDEN_TEAMS_KEY = '@jumelo/admin-hidden-teams';
const TEAM_RENAMES_KEY = '@jumelo/admin-team-renames';
const WARNINGS_KEY = '@jumelo/admin-warnings';

export type AdminMember = {
  id: string;
  name: string;
  email: string;
  photo?: string;
  avatarColor: string;
  city?: string;
  source: 'demo' | 'supabase' | 'local';
  deleted?: boolean;
  banned?: boolean;
  suspended?: boolean;
  warnCount?: number;
};

export type AdminNotice = {
  id: string;
  peerId: string;
  peerName: string;
  body: string;
  createdAt: string;
  conversationId: string;
};

export type AdminBanState = {
  banned: boolean;
  suspended: boolean;
  reason?: string;
  updatedAt: string;
};

export type AdminReport = {
  id: string;
  targetType: 'user' | 'team' | 'content';
  targetId: string;
  targetLabel: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  reporterLabel: string;
};

export type AdminActivity = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type AdminTeamRow = Team & {
  hidden?: boolean;
  displayName: string;
};

export type AdminDashboard = {
  users: number;
  teams: number;
  reportsPending: number;
  reportsTotal: number;
  banned: number;
  suspended: number;
  hiddenTeams: number;
  warnings: number;
};

type Overrides = Record<
  string,
  Partial<{ name: string; photo: string; avatarColor: string; email: string }>
>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function logActivity(action: string, detail: string): Promise<void> {
  const rows = await readJson<AdminActivity[]>(ACTIVITY_KEY, []);
  rows.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
  await writeJson(ACTIVITY_KEY, rows.slice(0, 200));
}

function profileToMember(p: UserProfile, source: AdminMember['source']): AdminMember {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    photo: p.photo,
    avatarColor: p.avatarColor,
    city: p.city,
    source,
  };
}

function applyOverrides(member: AdminMember, overrides: Overrides): AdminMember {
  const o = overrides[member.id];
  if (!o) return member;
  return {
    ...member,
    name: o.name ?? member.name,
    photo: o.photo ?? member.photo,
    avatarColor: o.avatarColor ?? member.avatarColor,
    email: o.email ?? member.email,
  };
}

/** Liste membres : démo + Supabase (si config) + overrides locaux. */
export async function listAdminMembers(excludeId?: string): Promise<AdminMember[]> {
  const [overrides, deleted, bans, warnings] = await Promise.all([
    readJson<Overrides>(OVERRIDES_KEY, {}),
    readJson<string[]>(DELETED_KEY, []),
    readJson<Record<string, AdminBanState>>(BANS_KEY, {}),
    readJson<Record<string, number>>(WARNINGS_KEY, {}),
  ]);
  const deletedSet = new Set(deleted);

  const byId = new Map<string, AdminMember>();

  for (const u of mockUsers) {
    byId.set(u.id, applyOverrides(profileToMember(u, 'demo'), overrides));
  }

  if (isSupabaseConfigured()) {
    try {
      const remote = await listProfiles(excludeId);
      for (const p of remote) {
        byId.set(p.id, applyOverrides(profileToMember(p, 'supabase'), overrides));
      }
    } catch {
      // RLS / réseau — garder démo
    }
  }

  return [...byId.values()]
    .filter((m) => !deletedSet.has(m.id))
    .filter((m) => (excludeId ? m.id !== excludeId : true))
    .map((m) => ({
      ...m,
      banned: bans[m.id]?.banned ?? false,
      suspended: bans[m.id]?.suspended ?? false,
      warnCount: warnings[m.id] ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function getAdminMember(id: string): Promise<AdminMember | null> {
  const all = await listAdminMembers();
  return all.find((m) => m.id === id) ?? null;
}

export async function renameAdminMember(
  id: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Le nom est requis.' };

  const overrides = await readJson<Overrides>(OVERRIDES_KEY, {});
  overrides[id] = { ...overrides[id], name: trimmed };
  await writeJson(OVERRIDES_KEY, overrides);

  if (canWriteSupabaseUserId(id)) {
    try {
      await patchProfileFields(id, { name: trimmed });
    } catch {
      // best-effort
    }
  }
  await logActivity('rename_user', `${id} → ${trimmed}`);
  return { ok: true };
}

export async function setAdminMemberPhoto(
  id: string,
  photoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = photoUrl.trim();
  if (!url) return { ok: false, error: 'URL d’image requise.' };

  const overrides = await readJson<Overrides>(OVERRIDES_KEY, {});
  overrides[id] = { ...overrides[id], photo: url };
  await writeJson(OVERRIDES_KEY, overrides);

  if (canWriteSupabaseUserId(id)) {
    try {
      await patchProfileFields(id, { avatar_url: url });
    } catch {
      // best-effort
    }
  }
  await logActivity('set_avatar', id);
  return { ok: true };
}

export async function deleteAdminMember(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deleted = await readJson<string[]>(DELETED_KEY, []);
  if (!deleted.includes(id)) {
    deleted.push(id);
    await writeJson(DELETED_KEY, deleted);
  }

  if (canWriteSupabaseUserId(id)) {
    try {
      const supabase = getSupabase();
      await supabase?.from('profiles').delete().eq('id', id);
    } catch {
      // local tombstone suffit en démo
    }
  }
  await logActivity('delete_user', id);
  return { ok: true };
}

export async function setMemberBanState(
  id: string,
  patch: { banned?: boolean; suspended?: boolean; reason?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bans = await readJson<Record<string, AdminBanState>>(BANS_KEY, {});
  const prev = bans[id] ?? {
    banned: false,
    suspended: false,
    updatedAt: new Date().toISOString(),
  };
  bans[id] = {
    banned: patch.banned ?? prev.banned,
    suspended: patch.suspended ?? prev.suspended,
    reason: patch.reason ?? prev.reason,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(BANS_KEY, bans);
  await logActivity(
    patch.banned ? 'ban_user' : patch.suspended ? 'suspend_user' : 'unban_user',
    `${id}${patch.reason ? ` · ${patch.reason}` : ''}`,
  );
  return { ok: true };
}

export async function warnAdminMember(
  id: string,
  reason: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const trimmed = reason.trim() || 'Avertissement modération';
  const warnings = await readJson<Record<string, number>>(WARNINGS_KEY, {});
  const count = (warnings[id] ?? 0) + 1;
  warnings[id] = count;
  await writeJson(WARNINGS_KEY, warnings);
  await logActivity('warn_user', `${id} (#${count}) · ${trimmed}`);
  return { ok: true, count };
}

/**
 * Envoie un message admin → membre.
 * Supabase : crée/ouvre un DM. Démo : notice AsyncStorage (thread `admin-*`).
 */
export async function sendAdminMessage(params: {
  fromUserId: string;
  peer: AdminMember;
  body: string;
}): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const trimmed = params.body.trim();
  if (!trimmed) return { ok: false, error: 'Message vide.' };

  const canCloud =
    isSupabaseConfigured() &&
    canWriteSupabaseUserId(params.fromUserId) &&
    canWriteSupabaseUserId(params.peer.id);

  if (canCloud) {
    try {
      const convId = await getOrCreateDmConversation(params.fromUserId, params.peer.id);
      if (!convId) {
        return { ok: false, error: 'Impossible de créer la conversation (RLS ?).' };
      }
      const sent = await sendMessage({
        conversationId: convId,
        senderId: params.fromUserId,
        body: `[Admin Jumelo] ${trimmed}`,
      });
      if (!sent) {
        return { ok: true, conversationId: convId };
      }
      await logActivity('message_user', params.peer.id);
      return { ok: true, conversationId: convId };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Envoi cloud impossible.',
      };
    }
  }

  const conversationId = `admin-${params.peer.id}`;
  const notice: AdminNotice = {
    id: `n-${Date.now()}`,
    peerId: params.peer.id,
    peerName: params.peer.name,
    body: trimmed,
    createdAt: new Date().toISOString(),
    conversationId,
  };
  const notices = await readJson<AdminNotice[]>(NOTICES_KEY, []);
  notices.unshift(notice);
  await writeJson(NOTICES_KEY, notices);
  await logActivity('message_user_demo', params.peer.id);
  return { ok: true, conversationId };
}

export async function listAdminNotices(): Promise<AdminNotice[]> {
  return readJson<AdminNotice[]>(NOTICES_KEY, []);
}

export async function listAdminTeams(viewerId?: string | null): Promise<AdminTeamRow[]> {
  const [teams, hidden, renames] = await Promise.all([
    listTeams(viewerId ?? null),
    readJson<string[]>(HIDDEN_TEAMS_KEY, []),
    readJson<Record<string, string>>(TEAM_RENAMES_KEY, {}),
  ]);
  const hiddenSet = new Set(hidden);
  return teams.map((t) => ({
    ...t,
    name: renames[t.id] ?? t.name,
    displayName: renames[t.id] ?? t.name,
    hidden: hiddenSet.has(t.id),
  }));
}

export async function renameAdminTeam(
  teamId: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Nom requis.' };
  const renames = await readJson<Record<string, string>>(TEAM_RENAMES_KEY, {});
  renames[teamId] = trimmed;
  await writeJson(TEAM_RENAMES_KEY, renames);
  await logActivity('rename_team', `${teamId} → ${trimmed}`);
  return { ok: true };
}

export async function hideAdminTeam(
  teamId: string,
  hidden: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await readJson<string[]>(HIDDEN_TEAMS_KEY, []);
  const next = hidden
    ? rows.includes(teamId)
      ? rows
      : [...rows, teamId]
    : rows.filter((id) => id !== teamId);
  await writeJson(HIDDEN_TEAMS_KEY, next);
  await logActivity(hidden ? 'hide_team' : 'unhide_team', teamId);
  return { ok: true };
}

export async function dissolveAdminTeam(
  teamId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const teams = await listTeams(actorId);
  const team = teams.find((t) => t.id === teamId);
  if (!team) return { ok: false, error: 'Équipe introuvable.' };

  // Dissolution admin : utilise l’ownerId réel pour le chemin local / cloud
  const result = await dissolveTeam(teamId, team.ownerId);
  if (!result.ok) {
    // Fallback local hard-delete si l’acteur n’est pas owner cloud
    try {
      const all = await listTeams(null);
      if (!all.find((t) => t.id === teamId)) {
        await logActivity('dissolve_team', teamId);
        return { ok: true };
      }
    } catch {
      // ignore
    }
    return result;
  }
  await logActivity('dissolve_team', `${teamId} (${team.name})`);
  return { ok: true };
}

export async function listAdminReports(): Promise<AdminReport[]> {
  const rows = await readJson<AdminReport[]>(REPORTS_KEY, []);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function seedDemoReports(): Promise<AdminReport[]> {
  const existing = await readJson<AdminReport[]>(REPORTS_KEY, []);
  if (existing.length > 0) return existing;

  const seed: AdminReport[] = [
    {
      id: 'rep-1',
      targetType: 'user',
      targetId: 'u-maxime',
      targetLabel: 'Maxime',
      reason: 'Spam messages / harcèlement signalé',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      reporterLabel: 'Léa',
    },
    {
      id: 'rep-2',
      targetType: 'team',
      targetId: 't-valorant',
      targetLabel: 'Valorant Lyon',
      reason: 'Contenu inapproprié dans le blurb',
      status: 'pending',
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      reporterLabel: 'Sara',
    },
    {
      id: 'rep-3',
      targetType: 'content',
      targetId: 'bio-u-noah',
      targetLabel: 'Bio Noah',
      reason: 'Lien externe suspect',
      status: 'pending',
      createdAt: new Date(Date.now() - 10_800_000).toISOString(),
      reporterLabel: 'Karim',
    },
  ];
  await writeJson(REPORTS_KEY, seed);
  await logActivity('seed_reports', `${seed.length} signalements démo`);
  return seed;
}

export async function setReportStatus(
  id: string,
  status: AdminReport['status'],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await readJson<AdminReport[]>(REPORTS_KEY, []);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: 'Signalement introuvable.' };
  rows[idx] = { ...rows[idx], status };
  await writeJson(REPORTS_KEY, rows);
  await logActivity('report_' + status, id);
  return { ok: true };
}

export async function listAdminActivity(): Promise<AdminActivity[]> {
  return readJson<AdminActivity[]>(ACTIVITY_KEY, []);
}

export async function getAdminDashboard(viewerId?: string | null): Promise<AdminDashboard> {
  const [members, teams, reports, bans, warnings, hidden] = await Promise.all([
    listAdminMembers(),
    listAdminTeams(viewerId),
    listAdminReports(),
    readJson<Record<string, AdminBanState>>(BANS_KEY, {}),
    readJson<Record<string, number>>(WARNINGS_KEY, {}),
    readJson<string[]>(HIDDEN_TEAMS_KEY, []),
  ]);

  const banValues = Object.values(bans);
  return {
    users: members.length,
    teams: teams.length,
    reportsPending: reports.filter((r) => r.status === 'pending').length,
    reportsTotal: reports.length,
    banned: banValues.filter((b) => b.banned).length,
    suspended: banValues.filter((b) => b.suspended).length,
    hiddenTeams: hidden.length,
    warnings: Object.values(warnings).reduce((a, n) => a + n, 0),
  };
}

/** Avatars de secours (stub « pick ») */
export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'https://ui-avatars.com/api/?name=J&background=0F8F8A&color=fff&size=400',
];
