import { mockChats, mockUsers, type UserProfile } from '../data/mock';
import { getProfileById } from './api/profiles';
import { getOrCreateDmConversation } from './api/messages';
import { isSupabaseConfigured } from './supabase';
import { canWriteSupabaseUserId } from './userIds';

export function getUserById(id: string): UserProfile | undefined {
  return mockUsers.find((u) => u.id === id);
}

/** Résout un profil : Supabase si configuré + UUID réel, sinon mocks locaux. */
export async function resolveUserById(id: string): Promise<UserProfile | undefined> {
  if (isSupabaseConfigured() && canWriteSupabaseUserId(id)) {
    const remote = await getProfileById(id);
    if (remote) return remote;
  }
  return getUserById(id);
}

export function chatPathForUser(userId: string): string {
  const existing = mockChats.find((c) => c.peerId === userId);
  if (existing) return `/chat/${existing.id}`;

  const map: Record<string, string> = {
    'u-lea': 'c-lea',
    'u-maxime': 'c-maxime',
    'u-sara': 'c-sara',
    'u-noah': 'c-lea',
    'u-karim': 'c-valorant',
    'u-maya': 'c-lea',
  };
  return `/chat/${map[userId] ?? 'c-lea'}`;
}

/**
 * Ouvre un DM : conversation Supabase (UUID) ou AsyncStorage (`fb-*` / `u-*`).
 */
export async function openChatWithUser(
  myId: string,
  peerId: string,
): Promise<string> {
  const peer = await resolveUserById(peerId);
  const convId = await getOrCreateDmConversation(myId, peerId, peer
    ? { name: peer.name, photo: peer.photo, avatarColor: peer.avatarColor }
    : undefined);
  if (convId) return `/chat/${convId}`;
  return chatPathForUser(peerId);
}
