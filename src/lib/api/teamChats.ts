import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mockChats,
  mockMessages,
  mockUsers,
  type ChatMessage,
  type ChatThread,
  type Team,
} from '../../data/mock';
import { canViewSeededDemoContent } from '../admin';

const STORAGE_KEY = '@jumelo/team-chats';

type StoredMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export type TeamChatRecord = {
  id: string;
  teamId: string;
  name: string;
  preview: string;
  updatedAt: string;
  avatarLetter?: string;
  avatarColor?: string;
  messages: StoredMessage[];
  /** Curseur de lecture par userId (ISO). */
  lastReadAtByUser?: Record<string, string>;
};

type TeamChatsState = {
  chats: TeamChatRecord[];
};

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Maintenant';
  }
}

function formatThreadTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

/** Id stable du chat de groupe pour une équipe. */
export function teamChatIdFor(teamId: string): string {
  const seed = mockChats.find((c) => c.isGroup && c.teamId === teamId);
  return seed?.id ?? `cg-${teamId}`;
}

/** Ids `m1`, `m2`… réservés aux payloads seedés mock. */
function isMockSeedMessageId(id: string): boolean {
  return /^m\d+$/.test(id);
}

function isSeededTeamChatId(chatId: string): boolean {
  return mockChats.some((c) => c.isGroup && c.id === chatId);
}

/** Messages visibles : seeds mock uniquement pour le compte admin. */
function visibleTeamMessages(chat: TeamChatRecord): StoredMessage[] {
  if (canViewSeededDemoContent()) return chat.messages;
  if (!isSeededTeamChatId(chat.id)) return chat.messages;
  return chat.messages.filter((m) => !isMockSeedMessageId(m.id));
}

function seedMessagesFor(chatId: string, teamId: string): StoredMessage[] {
  if (!canViewSeededDemoContent()) return [];

  const seedThread = mockChats.find((c) => c.id === chatId);
  const team = seedThread?.teamId === teamId ? seedThread : undefined;
  const ownerGuess =
    mockUsers.find((u) => team?.name.includes(u.name.split(' ')[0] ?? ''))?.id ??
    mockUsers.find((u) => u.id.startsWith('u-'))?.id;

  // Seeds connus (texte sans préfixe « Nom: »)
  if (chatId === 'c-valorant') {
    return [
      {
        id: 'm1',
        senderId: 'u-karim',
        senderName: 'Karim',
        text: 'GG les gens 🔥',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ];
  }
  if (chatId === 'c-funk') {
    return [
      {
        id: 'm1',
        senderId: 'u-maxime',
        senderName: 'Maxime',
        text: 'On lance une ranked ?',
        createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      },
    ];
  }

  const fallback = mockMessages[chatId] ?? [];
  return fallback.map((m, index) => {
    const senderId = m.fromMe ? 'u-lea' : ownerGuess ?? 'u-karim';
    const sender = mockUsers.find((u) => u.id === senderId);
    return {
      id: m.id || `m-${index}`,
      senderId,
      senderName: sender?.name ?? 'Membre',
      text: m.text.replace(/^[^:]+:\s*/, ''),
      createdAt: new Date(Date.now() - (fallback.length - index) * 60_000).toISOString(),
    };
  });
}

function buildChatFromTeam(team: Team): TeamChatRecord {
  const id = teamChatIdFor(team.id);
  const seed = mockChats.find((c) => c.isGroup && c.teamId === team.id);
  const messages = seedMessagesFor(id, team.id);
  const last = messages[messages.length - 1];
  const letter = seed?.avatarLetter ?? (team.name.trim().charAt(0).toUpperCase() || 'É');
  return {
    id,
    teamId: team.id,
    name:
      seed?.name ??
      `${team.name} · jumelo`,
    preview: last
      ? `${last.senderName}: ${last.text}`
      : team.capacity <= 2
        ? 'Chat privé du jumelo — dis bonjour !'
        : 'Chat privé du groupe — dis bonjour !',
    updatedAt: last?.createdAt ?? new Date().toISOString(),
    avatarLetter: letter,
    avatarColor: seed?.avatarColor ?? '#A7F3D0',
    messages,
  };
}

function cloneSeed(): TeamChatsState {
  const seededTeamIds = new Set(
    mockChats.filter((c) => c.isGroup && c.teamId).map((c) => c.teamId as string),
  );
  const chats: TeamChatRecord[] = [];
  for (const teamId of seededTeamIds) {
    const seed = mockChats.find((c) => c.teamId === teamId && c.isGroup);
    if (!seed?.teamId) continue;
    chats.push(
      buildChatFromTeam({
        id: seed.teamId,
        name: seed.name.replace(/\s·\sgroupe$/, ''),
        universe: 'gaming',
        activity: '',
        ownerId: '',
        memberIds: [],
        membersCount: 0,
        capacity: 2,
        city: '',
        levelLabel: '',
        vibe: '',
        nextSession: '',
        blurb: '',
        locked: true,
      }),
    );
  }
  return { chats };
}

async function loadLocal(): Promise<TeamChatsState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as TeamChatsState;
    if (!parsed?.chats) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return cloneSeed();
  }
}

async function saveLocal(state: TeamChatsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedUnreadHint(chatId: string): number {
  return mockChats.find((c) => c.id === chatId && c.isGroup)?.unread ?? 0;
}

function ensureMyReadCursor(chat: TeamChatRecord, myUserId: string): boolean {
  if (chat.lastReadAtByUser?.[myUserId]) return false;

  const incoming = chat.messages.filter((m) => m.senderId !== myUserId);
  const hint = seedUnreadHint(chat.id);
  let cursor: string;

  if (hint > 0 && incoming.length > 0) {
    const keepUnread = Math.min(hint, incoming.length);
    if (keepUnread >= incoming.length) {
      cursor = new Date(0).toISOString();
    } else {
      cursor = incoming[incoming.length - keepUnread - 1]!.createdAt;
    }
  } else {
    const last = chat.messages[chat.messages.length - 1];
    cursor = last?.createdAt ?? new Date().toISOString();
  }

  chat.lastReadAtByUser = {
    ...(chat.lastReadAtByUser ?? {}),
    [myUserId]: cursor,
  };
  return true;
}

function countUnread(chat: TeamChatRecord, myUserId: string): number {
  ensureMyReadCursor(chat, myUserId);
  const cursor = chat.lastReadAtByUser?.[myUserId];
  if (!cursor) return 0;
  return visibleTeamMessages(chat).filter(
    (m) => m.senderId !== myUserId && m.createdAt > cursor,
  ).length;
}

function resolveReadStatus(
  chat: TeamChatRecord,
  myUserId: string,
): { lastFromMe: boolean; readStatus: 'vu' | 'envoye' | null } {
  const messages = visibleTeamMessages(chat);
  const last = messages[messages.length - 1];
  if (!last) return { lastFromMe: false, readStatus: null };
  const lastFromMe = last.senderId === myUserId;
  if (!lastFromMe) return { lastFromMe: false, readStatus: null };

  const others = Object.entries(chat.lastReadAtByUser ?? {}).filter(([uid]) => uid !== myUserId);
  const someoneRead = others.some(([, at]) => at >= last.createdAt);
  return { lastFromMe: true, readStatus: someoneRead ? 'vu' : 'envoye' };
}

function toUiThread(chat: TeamChatRecord, myUserId: string): ChatThread {
  const { lastFromMe, readStatus } = resolveReadStatus(chat, myUserId);
  const messages = visibleTeamMessages(chat);
  const last = messages[messages.length - 1];
  const preview = last
    ? `${last.senderName}: ${last.text}`
    : chat.preview.includes(':')
      ? 'Chat privé — dis bonjour !'
      : chat.preview;
  return {
    id: chat.id,
    teamId: chat.teamId,
    name: chat.name,
    isGroup: true,
    preview,
    updatedAt: formatThreadTime(last?.createdAt ?? chat.updatedAt),
    unread: countUnread(chat, myUserId),
    lastFromMe,
    readStatus,
    avatarLetter: chat.avatarLetter,
    avatarColor: chat.avatarColor,
  };
}

function toUiMessage(msg: StoredMessage, myUserId: string): ChatMessage {
  return {
    id: msg.id,
    fromMe: msg.senderId === myUserId,
    text: msg.text,
    at: formatAt(msg.createdAt),
    senderName: msg.senderName,
  };
}

/** Crée le chat jumelo/groupe s’il n’existe pas encore. */
export async function ensureTeamChat(team: Team): Promise<TeamChatRecord> {
  const state = await loadLocal();
  const existing = state.chats.find((c) => c.teamId === team.id);
  if (existing) {
    // Garde le nom à jour si le jumelo/groupe a été renommé
    const kind = team.capacity <= 2 ? 'jumelo' : 'groupe';
    const expectedName = `${team.name} · ${kind}`;
    const legacyDuo = `${team.name} · duo`;
    if (
      existing.name !== expectedName &&
      (existing.name === legacyDuo ||
        !existing.name.includes(team.name) ||
        !existing.name.endsWith(` · ${kind}`))
    ) {
      existing.name = expectedName;
      await saveLocal(state);
    }
    return existing;
  }
  const chat = buildChatFromTeam(team);
  state.chats = [chat, ...state.chats];
  await saveLocal(state);
  return chat;
}

/** Liste les chats de groupe accessibles (membres / chefs uniquement). */
export async function listTeamChatsForMember(
  userId: string | null | undefined,
  teams: Team[],
): Promise<ChatThread[]> {
  if (!userId) return [];
  const memberTeams = teams.filter(
    (t) => t.ownerId === userId || t.memberIds.includes(userId),
  );

  // Assure l’existence de chaque chat
  for (const team of memberTeams) {
    await ensureTeamChat(team);
  }

  const state = await loadLocal();
  let dirty = false;
  const threads: ChatThread[] = [];
  for (const team of memberTeams) {
    const chat = state.chats.find((c) => c.teamId === team.id);
    if (!chat) continue;
    if (ensureMyReadCursor(chat, userId)) dirty = true;
    threads.push(toUiThread(chat, userId));
  }
  if (dirty) await saveLocal(state);

  return threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Marque le chat de groupe comme lu pour l’utilisateur. */
export async function markTeamChatRead(chatId: string, myUserId: string): Promise<void> {
  if (!chatId || !myUserId) return;
  const state = await loadLocal();
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  const last = chat.messages[chat.messages.length - 1];
  const at = last?.createdAt ?? new Date().toISOString();
  chat.lastReadAtByUser = {
    ...(chat.lastReadAtByUser ?? {}),
    [myUserId]: at,
  };
  await saveLocal(state);
}

export async function countTeamChatsUnread(
  userId: string | null | undefined,
  teams: Team[],
): Promise<number> {
  if (!userId) return 0;
  const threads = await listTeamChatsForMember(userId, teams);
  return threads.reduce((sum, t) => sum + t.unread, 0);
}

export async function getTeamChatById(chatId: string): Promise<TeamChatRecord | null> {
  const state = await loadLocal();
  return state.chats.find((c) => c.id === chatId) ?? null;
}

export async function getTeamChatByTeamId(teamId: string): Promise<TeamChatRecord | null> {
  const state = await loadLocal();
  return state.chats.find((c) => c.teamId === teamId) ?? null;
}

export function isTeamChatId(chatId: string): boolean {
  if (chatId.startsWith('cg-')) return true;
  return mockChats.some((c) => c.isGroup && c.id === chatId);
}

export async function listTeamChatMessages(
  chatId: string,
  myUserId: string,
): Promise<ChatMessage[]> {
  const chat = await getTeamChatById(chatId);
  if (!chat) return [];
  return visibleTeamMessages(chat).map((m) => toUiMessage(m, myUserId));
}

export async function sendTeamChatMessage(params: {
  chatId: string;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<ChatMessage | null> {
  const text = params.body.trim();
  if (!text) return null;
  const { checkChatMessage } = await import('../profanity');
  if (!checkChatMessage(text).ok) return null;

  const state = await loadLocal();
  let chat: TeamChatRecord | undefined = state.chats.find((c) => c.id === params.chatId);
  // Récupère un chat cg-<teamId> créé hors ensureTeamChat (ex. course)
  if (!chat && params.chatId.startsWith('cg-')) {
    const teamId = params.chatId.slice(3);
    chat = state.chats.find((c) => c.teamId === teamId);
    if (!chat) {
      chat = {
        id: params.chatId,
        teamId,
        name: 'Chat de groupe',
        preview: 'Chat privé de l’équipe — dis bonjour !',
        updatedAt: new Date().toISOString(),
        avatarLetter: 'É',
        avatarColor: '#A7F3D0',
        messages: [],
      };
      state.chats = [chat, ...state.chats];
    }
  }
  if (!chat) return null;

  const msg: StoredMessage = {
    id: `tm-${Date.now()}`,
    senderId: params.senderId,
    senderName: params.senderName,
    text,
    createdAt: new Date().toISOString(),
  };
  chat.messages = [...chat.messages, msg];
  chat.preview = `${params.senderName}: ${text}`;
  chat.updatedAt = msg.createdAt;
  chat.lastReadAtByUser = {
    ...(chat.lastReadAtByUser ?? {}),
    [params.senderId]: msg.createdAt,
  };
  await saveLocal(state);

  try {
    const { listTeams } = await import('./teams');
    const { notifyUser } = await import('../notifications');
    const teams = await listTeams(params.senderId);
    const team = teams.find((t) => t.id === chat.teamId);
    const recipients = (team?.memberIds ?? []).filter((id) => id && id !== params.senderId);
    const preview = text.length > 80 ? `${text.slice(0, 77)}…` : text;
    await Promise.all(
      recipients.map((userId) =>
        notifyUser({
          userId,
          title: chat.name || team?.name || 'Message d’équipe',
          body: `${params.senderName}: ${preview}`,
          data: {
            type: 'team_chat',
            chatId: chat.id,
            teamId: chat.teamId,
            senderId: params.senderId,
          },
          kind: 'message',
        }),
      ),
    );
  } catch {
    // best-effort
  }

  return toUiMessage(msg, params.senderId);
}

/** Supprime le chat de groupe d’une équipe (dissolution). */
export async function removeTeamChat(teamId: string): Promise<void> {
  const state = await loadLocal();
  state.chats = state.chats.filter((c) => c.teamId !== teamId);
  await saveLocal(state);
}

export async function resetTeamChatsDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
