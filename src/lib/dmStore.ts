import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  mockChats,
  mockMessages,
  mockUsers,
  type ChatMessage,
} from '../data/mock';

const STORAGE_KEY = '@jumelo/dm-chats';

export type LocalDmThread = {
  id: string;
  peerId: string;
  peerName: string;
  peerPhoto?: string;
  peerAvatarColor?: string;
  preview: string;
  updatedAt: string;
  unread: number;
};

type StoredMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type LocalDmRecord = {
  id: string;
  peerId: string;
  peerName: string;
  peerPhoto?: string;
  peerAvatarColor?: string;
  preview: string;
  updatedAt: string;
  memberIds: string[];
  /** Threads seedés depuis mockChats — visibles pour tout compte local. */
  seeded?: boolean;
  messages: StoredMessage[];
};

type DmState = {
  chats: LocalDmRecord[];
};

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function localDmIdFor(userA: string, userB: string): string {
  const [a, b] = orderedPair(userA, userB);
  return `dm-${a}__${b}`;
}

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

function peerMeta(peerId: string): {
  name: string;
  photo?: string;
  avatarColor?: string;
} {
  const peer = mockUsers.find((u) => u.id === peerId);
  return {
    name: peer?.name ?? 'Jumelo',
    photo: peer?.photo,
    avatarColor: peer?.avatarColor,
  };
}

function seedMessagesFor(chatId: string, peerId: string): StoredMessage[] {
  const seed = mockMessages[chatId] ?? [];
  const now = Date.now();
  return seed.map((m, index) => ({
    id: m.id || `m-${index}`,
    senderId: m.fromMe ? '__me__' : peerId,
    text: m.text,
    createdAt: new Date(now - (seed.length - index) * 60_000).toISOString(),
  }));
}

function buildSeedChat(thread: (typeof mockChats)[number]): LocalDmRecord | null {
  if (thread.isGroup || !thread.peerId) return null;
  const meta = peerMeta(thread.peerId);
  const messages = seedMessagesFor(thread.id, thread.peerId);
  const last = messages[messages.length - 1];
  return {
    id: thread.id,
    peerId: thread.peerId,
    peerName: thread.name || meta.name,
    peerPhoto: meta.photo,
    peerAvatarColor: thread.avatarColor ?? meta.avatarColor,
    preview: last?.text ?? thread.preview,
    updatedAt: last?.createdAt ?? new Date().toISOString(),
    memberIds: [thread.peerId],
    seeded: true,
    messages,
  };
}

function cloneSeed(): DmState {
  const chats: LocalDmRecord[] = [];
  for (const thread of mockChats) {
    const chat = buildSeedChat(thread);
    if (chat) chats.push(chat);
  }
  return { chats };
}

async function loadLocal(): Promise<DmState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DmState;
    if (!parsed?.chats || !Array.isArray(parsed.chats)) {
      const seed = cloneSeed();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return cloneSeed();
  }
}

async function saveLocal(state: DmState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toUiMessage(msg: StoredMessage, myUserId: string): ChatMessage {
  const fromMe = msg.senderId === myUserId || msg.senderId === '__me__';
  return {
    id: msg.id,
    fromMe,
    text: msg.text,
    at: formatAt(msg.createdAt),
  };
}

function toThread(chat: LocalDmRecord): LocalDmThread {
  return {
    id: chat.id,
    peerId: chat.peerId,
    peerName: chat.peerName,
    peerPhoto: chat.peerPhoto,
    peerAvatarColor: chat.peerAvatarColor,
    preview: chat.preview,
    updatedAt: formatThreadTime(chat.updatedAt),
    unread: 0,
  };
}

/** Crée ou retrouve un DM local (ids `c-*` seedés ou `dm-*`). */
export async function getOrCreateLocalDm(
  myId: string,
  peerId: string,
  peer?: { name?: string; photo?: string; avatarColor?: string },
): Promise<string> {
  const state = await loadLocal();

  const byPeer = state.chats.find(
    (c) =>
      c.peerId === peerId ||
      (c.memberIds.includes(myId) && c.memberIds.includes(peerId)),
  );
  if (byPeer) {
    if (!byPeer.memberIds.includes(myId)) {
      byPeer.memberIds = [...byPeer.memberIds, myId];
      await saveLocal(state);
    }
    return byPeer.id;
  }

  const seedHit = mockChats.find((c) => !c.isGroup && c.peerId === peerId);
  if (seedHit) {
    const built = buildSeedChat(seedHit);
    if (built) {
      built.memberIds = [myId, peerId];
      state.chats = [built, ...state.chats.filter((c) => c.id !== built.id)];
      await saveLocal(state);
      return built.id;
    }
  }

  const meta = peerMeta(peerId);
  const id = localDmIdFor(myId, peerId);
  const existing = state.chats.find((c) => c.id === id);
  if (existing) {
    if (!existing.memberIds.includes(myId)) {
      existing.memberIds = [...existing.memberIds, myId];
      await saveLocal(state);
    }
    return existing.id;
  }

  const chat: LocalDmRecord = {
    id,
    peerId,
    peerName: peer?.name ?? meta.name,
    peerPhoto: peer?.photo ?? meta.photo,
    peerAvatarColor: peer?.avatarColor ?? meta.avatarColor,
    preview: 'Nouvelle conversation',
    updatedAt: new Date().toISOString(),
    memberIds: [myId, peerId],
    messages: [],
  };
  state.chats = [chat, ...state.chats];
  await saveLocal(state);
  return id;
}

export async function listLocalDmThreads(myId: string): Promise<LocalDmThread[]> {
  if (!myId) return [];
  const state = await loadLocal();
  const visible = state.chats.filter(
    (c) => c.seeded || c.memberIds.includes(myId) || c.peerId === myId,
  );
  return visible
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toThread);
}

export async function listLocalDmMessages(
  conversationId: string,
  myUserId: string,
): Promise<ChatMessage[]> {
  const state = await loadLocal();
  let chat = state.chats.find((c) => c.id === conversationId);
  if (!chat) {
    const seed = mockChats.find((c) => c.id === conversationId && !c.isGroup);
    if (seed) {
      const built = buildSeedChat(seed);
      if (built) {
        state.chats = [built, ...state.chats];
        await saveLocal(state);
        chat = built;
      }
    }
  }
  if (!chat) return [];
  return chat.messages.map((m) => toUiMessage(m, myUserId));
}

export async function sendLocalDmMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<ChatMessage | null> {
  const text = params.body.trim();
  if (!text) return null;

  const state = await loadLocal();
  let chat = state.chats.find((c) => c.id === params.conversationId);
  if (!chat) {
    const seed = mockChats.find((c) => c.id === params.conversationId && !c.isGroup);
    if (seed) {
      const built = buildSeedChat(seed);
      if (built) {
        built.memberIds = [params.senderId, seed.peerId!];
        state.chats = [built, ...state.chats];
        chat = built;
      }
    }
  }
  if (!chat) return null;

  if (!chat.memberIds.includes(params.senderId)) {
    chat.memberIds = [...chat.memberIds, params.senderId];
  }

  const msg: StoredMessage = {
    id: `dm-${Date.now()}`,
    senderId: params.senderId,
    text,
    createdAt: new Date().toISOString(),
  };
  chat.messages = [...chat.messages, msg];
  chat.preview = text;
  chat.updatedAt = msg.createdAt;
  await saveLocal(state);
  return toUiMessage(msg, params.senderId);
}

export async function getLocalDmPeerId(
  conversationId: string,
  myId: string,
): Promise<string | null> {
  const state = await loadLocal();
  const chat = state.chats.find((c) => c.id === conversationId);
  if (!chat) {
    const seed = mockChats.find((c) => c.id === conversationId && !c.isGroup);
    return seed?.peerId ?? null;
  }
  if (chat.peerId && chat.peerId !== myId) return chat.peerId;
  return chat.memberIds.find((id) => id !== myId) ?? null;
}

export async function resetLocalDmsDemoState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
