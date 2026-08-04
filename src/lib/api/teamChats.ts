import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mockChats,
  mockMessages,
  mockUsers,
  type ChatMessage,
  type ChatThread,
  type Team,
} from '../../data/mock';

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

function seedMessagesFor(chatId: string, teamId: string): StoredMessage[] {
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
        text: "J'amène ma gratte",
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
    name: seed?.name ?? `${team.name} · groupe`,
    preview: last
      ? `${last.senderName}: ${last.text}`
      : 'Chat privé de l’équipe — dis bonjour !',
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
        capacity: 5,
        city: '',
        levelLabel: '',
        vibe: '',
        nextSession: '',
        blurb: '',
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

function toUiThread(chat: TeamChatRecord): ChatThread {
  return {
    id: chat.id,
    teamId: chat.teamId,
    name: chat.name,
    isGroup: true,
    preview: chat.preview,
    updatedAt: formatThreadTime(chat.updatedAt),
    unread: 0,
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

/** Crée le chat de groupe s’il n’existe pas encore. */
export async function ensureTeamChat(team: Team): Promise<TeamChatRecord> {
  const state = await loadLocal();
  const existing = state.chats.find((c) => c.teamId === team.id);
  if (existing) {
    // Garde le nom à jour si l’équipe a été renommée
    const expectedName = `${team.name} · groupe`;
    if (!existing.name.includes(team.name)) {
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
  const threads: ChatThread[] = [];
  for (const team of memberTeams) {
    const chat = await ensureTeamChat(team);
    threads.push(toUiThread(chat));
  }
  return threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
  return chat.messages.map((m) => toUiMessage(m, myUserId));
}

export async function sendTeamChatMessage(params: {
  chatId: string;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<ChatMessage | null> {
  const text = params.body.trim();
  if (!text) return null;

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
  await saveLocal(state);
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
