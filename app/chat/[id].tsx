import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { safeBack } from '../../src/lib/navigation';

import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  ChatMessage,
  mockChats,
  mockMessages,
  mockUsers,
  type UserProfile,
} from '../../src/data/mock';
import {
  getAdminMember,
  listAdminNotices,
  sendAdminMessage,
} from '../../src/lib/adminStore';
import { getDmPeerId, listMessages, sendMessage } from '../../src/lib/api/messages';
import {
  getTeamChatById,
  isTeamChatId,
  listTeamChatMessages,
  sendTeamChatMessage,
} from '../../src/lib/api/teamChats';
import { getProfileById } from '../../src/lib/api/profiles';
import { isSupabaseConfigured } from '../../src/lib/supabase';

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const thread = mockChats.find((c) => c.id === id);
  const mockPeer = mockUsers.find((u) => u.id === thread?.peerId);
  const teamChatHint = Boolean(id && isTeamChatId(id));

  const isAdminThread = Boolean(id?.startsWith('admin-'));

  // UUID conversation → Supabase ; c-* / dm-* → AsyncStorage (fb-* / u-*)
  const useRemote =
    Boolean(
      me &&
        isSupabaseConfigured() &&
        id &&
        !id.startsWith('c-') &&
        !id.startsWith('cg-') &&
        !id.startsWith('admin-') &&
        !id.startsWith('dm-') &&
        !me.id.startsWith('u-') &&
        !me.id.startsWith('fb-'),
    );

  /** DM local ou cloud (hors groupe équipe / admin). */
  const isDmThread = Boolean(id && !isAdminThread && !isTeamChatId(id));

  const initial = useMemo(() => mockMessages[id ?? ''] ?? [], [id]);
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState('');
  const [loadingRemote, setLoadingRemote] = useState(
    useRemote || isDmThread || teamChatHint || isAdminThread,
  );
  const [peer, setPeer] = useState<UserProfile | undefined>(mockPeer);
  const [groupTitle, setGroupTitle] = useState<string | undefined>(
    thread?.isGroup ? thread.name : undefined,
  );
  const [isGroup, setIsGroup] = useState(Boolean(thread?.isGroup || teamChatHint));

  useEffect(() => {
    if (!id || !me) {
      setMessages(initial);
      setPeer(mockPeer);
      setLoadingRemote(false);
      return;
    }

    let active = true;

    (async () => {
      if (isAdminThread) {
        setLoadingRemote(true);
        const notices = await listAdminNotices();
        const forThread = notices.filter((n) => n.conversationId === id);
        const peerId = id.replace(/^admin-/, '');
        const adminPeer =
          mockUsers.find((u) => u.id === peerId) ??
          (await getProfileById(peerId).catch(() => null)) ??
          undefined;
        if (active) {
          setIsGroup(false);
          setGroupTitle(undefined);
          setPeer(adminPeer ?? undefined);
          setMessages(
            forThread
              .slice()
              .reverse()
              .map((n) => ({
                id: n.id,
                fromMe: true,
                text: `[Admin] ${n.body}`,
                at: new Date(n.createdAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })),
          );
          setLoadingRemote(false);
        }
        return;
      }

      if (isTeamChatId(id)) {
        setLoadingRemote(true);
        const [chat, rows] = await Promise.all([
          getTeamChatById(id),
          listTeamChatMessages(id, me.id),
        ]);
        if (active) {
          setIsGroup(true);
          setGroupTitle(chat?.name ?? thread?.name ?? 'Chat de groupe');
          setPeer(undefined);
          setMessages(rows);
          setLoadingRemote(false);
        }
        return;
      }

      // DM : Supabase (UUID) ou AsyncStorage local (fb-* / u-* / c-* / dm-*)
      setLoadingRemote(true);
      const [rows, peerId] = await Promise.all([listMessages(id, me.id), getDmPeerId(id, me.id)]);
      let remotePeer: UserProfile | undefined = mockPeer;
      if (peerId) {
        remotePeer =
          mockUsers.find((u) => u.id === peerId) ??
          (await getProfileById(peerId).catch(() => null)) ??
          undefined;
      }
      if (active) {
        setMessages(rows);
        setPeer(remotePeer);
        setIsGroup(false);
        setGroupTitle(undefined);
        setLoadingRemote(false);
      }
    })();

    // TODO: supabase.channel(`messages:${id}`).on('postgres_changes', ...) pour le live
    return () => {
      active = false;
    };
  }, [id, me, mockPeer, thread, isAdminThread]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !id) return;

    const { checkChatMessage } = await import('../../src/lib/profanity');
    const safety = checkChatMessage(text);
    if (!safety.ok) {
      Alert.alert('Message bloqué', safety.error ?? 'Langage interdit.');
      return;
    }

    setDraft('');

    if (isAdminThread && me) {
      const peerId = id.replace(/^admin-/, '');
      const member = (await getAdminMember(peerId)) ?? {
        id: peerId,
        name: peer?.name ?? 'Membre',
        email: peer?.email ?? '',
        photo: peer?.photo,
        avatarColor: peer?.avatarColor ?? '#0F8F8A',
        source: 'demo' as const,
      };
      const result = await sendAdminMessage({
        fromUserId: me.id,
        peer: member,
        body: text,
      });
      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            fromMe: true,
            text: `[Admin] ${text}`,
            at: 'Maintenant',
          },
        ]);
      }
      return;
    }

    if (isTeamChatId(id) && me) {
      const saved = await sendTeamChatMessage({
        chatId: id,
        senderId: me.id,
        senderName: me.name,
        body: text,
      });
      if (saved) {
        setMessages((prev) => [...prev, saved]);
      }
      return;
    }

    if (me) {
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        fromMe: true,
        text,
        at: 'Maintenant',
      };
      setMessages((prev) => [...prev, optimistic]);
      const saved = await sendMessage({
        conversationId: id,
        senderId: me.id,
        body: text,
      });
      if (saved) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      } else {
        // Échec persist → retire l’optimiste pour ne pas mentir à l’utilisateur
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    }
  }, [draft, id, me, isAdminThread, peer]);

  const title = isAdminThread
    ? peer?.name
      ? `Admin → ${peer.name}`
      : 'Notice admin'
    : isGroup
      ? groupTitle ?? 'Chat de groupe'
      : peer?.name ?? thread?.name ?? (useRemote ? 'Conversation' : 'Chat');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => safeBack('/(tabs)/chat')}>
          <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>{'< Retour'}</Text>
        </Pressable>
        <View style={styles.peer}>
          {isGroup ? (
            <View style={[styles.avatar, styles.groupAvatar, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="people" size={20} color={colors.primaryDark} />
            </View>
          ) : peer?.photo ? (
            <Image source={{ uri: peer.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]} />
          )}
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {title}
          </Text>
          {isGroup ? (
            <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 12 }}>
              Groupe privé · membres uniquement
            </Text>
          ) : peer?.online ? (
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12 }}>
              ● En ligne
            </Text>
          ) : null}
        </View>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {loadingRemote ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Chargement…</Text>
          </View>
        ) : null}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.fromMe
                  ? { alignSelf: 'flex-end', backgroundColor: colors.primary }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.white,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
              ]}
            >
              {isGroup && !item.fromMe && item.senderName ? (
                <Text style={[styles.sender, { color: colors.primaryDark }]}>{item.senderName}</Text>
              ) : null}
              <Text
                style={[
                  styles.bubbleText,
                  { color: item.fromMe ? '#fff' : colors.ink },
                ]}
              >
                {item.text}
              </Text>
              <Text
                style={[
                  styles.at,
                  { color: item.fromMe ? 'rgba(255,255,255,0.75)' : colors.inkFaint },
                ]}
              >
                {item.at}
              </Text>
            </View>
          )}
        />

        <View style={[styles.composer, { backgroundColor: colors.white, borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={isGroup ? 'Écrire au groupe…' : 'Écrire un message…'}
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, { backgroundColor: colors.cream, color: colors.ink }]}
          />
          <Pressable onPress={send} style={[styles.send, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  peer: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 4 },
  groupAvatar: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodyBold, fontSize: 16 },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubble: {
    maxWidth: '80%',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sender: { fontFamily: fonts.bodyBold, fontSize: 12, marginBottom: 4 },
  bubbleText: { fontFamily: fonts.body, lineHeight: 20 },
  at: { marginTop: 6, fontFamily: fonts.body, fontSize: 11 },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  send: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});
