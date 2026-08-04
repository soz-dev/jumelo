import type { ChatMessage } from '../../data/mock';
import {
  getLocalDmPeerId,
  getOrCreateLocalDm,
  listLocalDmMessages,
  listLocalDmThreads,
  sendLocalDmMessage,
} from '../dmStore';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { canWriteSupabaseUserId, isLocalUserId } from '../userIds';

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type DmThread = {
  id: string;
  peerId: string;
  peerName: string;
  peerPhoto?: string;
  peerAvatarColor?: string;
  preview: string;
  updatedAt: string;
  unread: number;
};

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

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatThreadTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export function toChatMessage(row: DbMessage, myId: string): ChatMessage {
  return {
    id: row.id,
    fromMe: row.sender_id === myId,
    text: row.body,
    at: formatAt(row.created_at),
  };
}

/** Liste les messages d’une conversation. */
export async function listMessages(
  conversationId: string,
  myUserId: string,
): Promise<ChatMessage[]> {
  if (useLocalStore(myUserId)) {
    return listLocalDmMessages(conversationId, myUserId);
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return listLocalDmMessages(conversationId, myUserId);
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error || !data) return [];
  return (data as DbMessage[]).map((row) => toChatMessage(row, myUserId));
}

/** Envoie un message. TODO: realtime subscription pour le chat live. */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<ChatMessage | null> {
  const trimmed = params.body.trim();
  if (!trimmed) return null;
  const { checkChatMessage } = await import('../profanity');
  if (!checkChatMessage(trimmed).ok) return null;

  if (useLocalStore(params.senderId)) {
    return sendLocalDmMessage({
      conversationId: params.conversationId,
      senderId: params.senderId,
      body: trimmed,
    });
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return sendLocalDmMessage({
      conversationId: params.conversationId,
      senderId: params.senderId,
      body: trimmed,
    });
  }

  // Toujours l’uid de session (évite spoofing client de sender_id).
  const { data: auth } = await supabase.auth.getUser();
  const senderId = auth.user?.id;
  if (!senderId) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: senderId,
      body: trimmed,
    })
    .select('*')
    .single();

  if (error || !data) return null;

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.conversationId);

  try {
    const peerId = await getDmPeerId(params.conversationId, senderId);
    if (peerId) {
      const { notifyUser } = await import('../notifications');
      const { getCachedProfile } = await import('../profileDirectory');
      const sender = await getCachedProfile(senderId);
      const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
      await notifyUser({
        userId: peerId,
        title: sender?.name?.trim() || 'Nouveau message',
        body: preview,
        data: {
          type: 'dm',
          conversationId: params.conversationId,
          senderId,
        },
        kind: 'message',
      });
    }
  } catch {
    // best-effort
  }

  return toChatMessage(data as DbMessage, senderId);
}

/**
 * Crée (ou retrouve) une conversation 1:1 entre deux users.
 * Local (`fb-*` / `u-*`) → AsyncStorage ; sinon Supabase (+ RLS).
 */
export async function getOrCreateDmConversation(
  myId: string,
  peerId: string,
  peer?: { name?: string; photo?: string; avatarColor?: string },
): Promise<string | null> {
  if (useLocalStore(myId) || useLocalStore(peerId)) {
    return getOrCreateLocalDm(myId, peerId, peer);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return getOrCreateLocalDm(myId, peerId, peer);
  }

  const { data: myRows } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', myId);

  const myConvIds = (myRows ?? []).map((r) => r.conversation_id as string);
  if (myConvIds.length > 0) {
    const { data: dmConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('is_group', false)
      .in('id', myConvIds);

    const dmIds = (dmConvs ?? []).map((c) => c.id as string);
    if (dmIds.length > 0) {
      const { data: peerRows } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', peerId)
        .in('conversation_id', dmIds);

      const hit = peerRows?.[0]?.conversation_id as string | undefined;
      if (hit) return hit;
    }
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ is_group: false })
    .select('id')
    .single();

  if (error || !created) return null;

  // Self d’abord → is_conversation_member devient true, puis peer (RLS)
  const { error: selfError } = await supabase.from('conversation_members').insert({
    conversation_id: created.id,
    user_id: myId,
  });
  if (selfError) return null;

  const { error: peerError } = await supabase.from('conversation_members').insert({
    conversation_id: created.id,
    user_id: peerId,
  });
  if (peerError) return null;

  return created.id as string;
}

/** Peer UUID d’une conversation DM (autre que moi). */
export async function getDmPeerId(
  conversationId: string,
  myId: string,
): Promise<string | null> {
  if (useLocalStore(myId) || conversationId.startsWith('dm-') || conversationId.startsWith('c-')) {
    return getLocalDmPeerId(conversationId, myId);
  }

  const supabase = getSupabase();
  if (!supabase) return getLocalDmPeerId(conversationId, myId);

  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', myId)
    .maybeSingle();

  if (error || !data) return null;
  return data.user_id as string;
}

/** Threads DM de l’utilisateur connecté. */
export async function listMyDmThreads(myId: string): Promise<DmThread[]> {
  if (useLocalStore(myId)) {
    return listLocalDmThreads(myId);
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return listLocalDmThreads(myId);
  }

  const { data: myRows } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', myId);

  const convIds = (myRows ?? []).map((r) => r.conversation_id as string);
  if (convIds.length === 0) return [];

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, updated_at, is_group')
    .eq('is_group', false)
    .in('id', convIds)
    .order('updated_at', { ascending: false });

  if (!convs?.length) return [];

  const threads: DmThread[] = [];

  for (const conv of convs) {
    const { data: members } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conv.id);

    const peerId = (members ?? [])
      .map((m) => m.user_id as string)
      .find((id) => id !== myId);
    if (!peerId) continue;

    const { data: peer } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, avatar_color')
      .eq('id', peerId)
      .maybeSingle();

    const { data: lastMsg } = await supabase
      .from('messages')
      .select('body, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    threads.push({
      id: conv.id as string,
      peerId,
      peerName: (peer?.name as string | undefined) || 'Jumelo',
      peerPhoto: (peer?.avatar_url as string | null | undefined) ?? undefined,
      peerAvatarColor: (peer?.avatar_color as string | undefined) ?? undefined,
      preview: (lastMsg?.body as string | undefined) || 'Nouvelle conversation',
      updatedAt: formatThreadTime(
        (lastMsg?.created_at as string | undefined) || (conv.updated_at as string),
      ),
      unread: 0,
    });
  }

  return threads;
}
