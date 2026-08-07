import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyTrialBanner } from '../../src/components/DailyTrialBanner';
import { JumeloValidationBanner } from '../../src/components/JumeloValidationBanner';
import { safeBack } from '../../src/lib/navigation';

import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import {
  ChatMessage,
  mockChats,
  mockMessages,
  mockUsers,
  type UserProfile,
} from '../../src/data/mock';
import { useIsAdmin } from '../../src/lib/admin';
import { Avatar } from '../../src/design-system';
import {
  getAdminMember,
  listAdminNotices,
  sendAdminMessage,
} from '../../src/lib/adminStore';
import { getDmPeerId, listMessages, markDmRead, sendMessage } from '../../src/lib/api/messages';
import {
  getTeamChatById,
  isTeamChatId,
  listTeamChatMessages,
  markTeamChatRead,
  sendTeamChatMessage,
} from '../../src/lib/api/teamChats';
import { getProfileById } from '../../src/lib/api/profiles';
import { getTeam } from '../../src/lib/api/teams';
import { ensureDailyTrialConversation } from '../../src/lib/dailyJumelo';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { isDuoCapacity } from '../../src/lib/teamKind';

function normalizeRouteId(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export default function ChatDetailScreen() {
  const { colors } = useTheme();
  const { user: me } = useAuth();
  const { refresh: refreshTeams } = useTeams();
  const isAdmin = useIsAdmin();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = normalizeRouteId(params.id);
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

  // Prefill mock uniquement pour le compte admin (évite un flash de msgs fictifs).
  const initial = useMemo(
    () => (isAdmin ? mockMessages[id ?? ''] ?? [] : []),
    [id, isAdmin],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(
    useRemote || isDmThread || teamChatHint || isAdminThread,
  );
  const [peer, setPeer] = useState<UserProfile | undefined>(mockPeer);
  const [groupTitle, setGroupTitle] = useState<string | undefined>(
    thread?.isGroup ? thread.name : undefined,
  );
  const [isGroup, setIsGroup] = useState(Boolean(thread?.isGroup || teamChatHint));
  const [teamIdForBanner, setTeamIdForBanner] = useState<string | null>(null);
  const [isJumeloChat, setIsJumeloChat] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const insets = useSafeAreaInsets();

  // Heal trial seed URL → vrai dm-*
  useEffect(() => {
    if (!me?.id || !id || !isDmThread) return;
    let active = true;
    (async () => {
      const healed = await ensureDailyTrialConversation(me.id);
      if (!active || !healed || healed === id) return;
      router.replace(`/chat/${healed}`);
    })();
    return () => {
      active = false;
    };
  }, [me?.id, id, isDmThread]);

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
          setTeamIdForBanner(null);
          setIsJumeloChat(false);
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
        await markTeamChatRead(id, me.id);
        const resolvedTeamId =
          chat?.teamId ??
          (id.startsWith('cg-') ? id.slice(3) : thread?.teamId) ??
          null;
        let jumelo = false;
        let title = chat?.name ?? thread?.name ?? 'Chat jumelo';
        if (resolvedTeamId) {
          const team = await getTeam(resolvedTeamId, me.id);
          if (team) {
            jumelo = isDuoCapacity(team.capacity);
            title = `${team.name} · jumelo`;
            const allIds = [team.ownerId, ...team.memberIds.filter((mid) => mid !== team.ownerId)];
            setTeamMemberIds(allIds);
          } else {
            jumelo = true;
          }
        }
        if (active) {
          setIsGroup(true);
          setGroupTitle(title);
          setTeamIdForBanner(resolvedTeamId);
          setIsJumeloChat(jumelo);
          setPeer(undefined);
          setMessages(rows);
          setLoadingRemote(false);
        }
        return;
      }

      // DM : Supabase (UUID) ou AsyncStorage local (fb-* / u-* / c-* / dm-*)
      setLoadingRemote(true);
      const [rows, peerId] = await Promise.all([listMessages(id, me.id), getDmPeerId(id, me.id)]);
      await markDmRead(id, me.id);
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
        setTeamIdForBanner(null);
        setIsJumeloChat(false);
        setLoadingRemote(false);
      }
    })();

    // TODO: supabase.channel(`messages:${id}`).on('postgres_changes', ...) pour le live
    return () => {
      active = false;
    };
  }, [id, me, mockPeer, thread, isAdminThread]);

  const openMembers = useCallback(async () => {
    setMembersOpen(true);
    if (teamMembers.length > 0 || teamMemberIds.length === 0) return;
    setLoadingMembers(true);
    const profiles = await Promise.all(
      teamMemberIds.map((mid) => {
        const local = mockUsers.find((u) => u.id === mid);
        if (local) return Promise.resolve(local);
        return getProfileById(mid).catch(() => null);
      }),
    );
    setTeamMembers(profiles.filter(Boolean) as UserProfile[]);
    setLoadingMembers(false);
  }, [teamMemberIds, teamMembers]);

  const onTrialFormed = useCallback(
    (teamId: string) => {
      void refreshTeams();
      Alert.alert('Jumelo formé', 'Votre duo est prêt. Place à la gestion du jumelo.', [
        {
          text: 'Voir le jumelo',
          onPress: () => router.replace(`/jumelo/${teamId}`),
        },
      ]);
      setTimeout(() => {
        router.replace(`/jumelo/${teamId}`);
      }, 600);
    },
    [refreshTeams],
  );

  const onConversationHealed = useCallback(
    (conversationId: string) => {
      if (conversationId && conversationId !== id) {
        router.replace(`/chat/${conversationId}`);
      }
    },
    [id],
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || !id || !me || sending) return;

    const { checkChatMessage } = await import('../../src/lib/profanity');
    const safety = checkChatMessage(text);
    if (!safety.ok) {
      Alert.alert('Message bloqué', safety.error ?? 'Langage interdit.');
      return;
    }

    setSending(true);
    setDraft('');

    try {
      if (isAdminThread) {
        const peerId = id.replace(/^admin-/, '');
        const member = (await getAdminMember(peerId)) ?? {
          id: peerId,
          name: peer?.name ?? 'Membre',
          email: peer?.email ?? '',
          photo: peer?.photo,
          avatarColor: peer?.avatarColor ?? '#0186F0',
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
        } else {
          setDraft(text);
          Alert.alert('Envoi impossible', 'Réessaie dans un instant.');
        }
        return;
      }

      if (isTeamChatId(id)) {
        const saved = await sendTeamChatMessage({
          chatId: id,
          senderId: me.id,
          senderName: me.name,
          body: text,
        });
        if (saved) {
          setMessages((prev) => [...prev, saved]);
        } else {
          setDraft(text);
          Alert.alert('Envoi impossible', 'Le message n’a pas pu être enregistré.');
        }
        return;
      }

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
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setDraft(text);
        Alert.alert('Envoi impossible', 'Le message n’a pas pu être enregistré.');
      }
    } finally {
      setSending(false);
    }
  }, [draft, id, me, isAdminThread, peer, sending]);

  const title = isAdminThread
    ? peer?.name
      ? `Admin → ${peer.name}`
      : 'Notice admin'
    : isGroup
      ? groupTitle ?? 'Chat jumelo'
      : peer?.name ?? thread?.name ?? (useRemote ? 'Conversation' : 'Chat');

  return (
    <>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <View style={[styles.header, { backgroundColor: colors.cream, borderBottomColor: colors.border }]}>
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
              Jumelo · chat privé
            </Text>
          ) : peer?.online ? (
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12 }}>
              ● En ligne
            </Text>
          ) : null}
        </View>
        <View style={{ width: isGroup ? 44 : 60 }}>
          {isGroup ? (
            <Pressable onPress={() => void openMembers()} style={{ padding: 10 }}>
              <Ionicons name="people-outline" size={22} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {isJumeloChat && teamIdForBanner ? (
          <JumeloValidationBanner
            teamId={teamIdForBanner}
            onTeamNameChange={(name) => setGroupTitle(`${name} · jumelo`)}
          />
        ) : null}
        {loadingRemote ? (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontFamily: fonts.body, color: colors.inkMuted }}>Chargement…</Text>
          </View>
        ) : null}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
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

        {isDmThread && id && !isJumeloChat ? (
          <DailyTrialBanner
            conversationId={id}
            sticky
            onFormed={onTrialFormed}
            onConversationHealed={onConversationHealed}
          />
        ) : null}

        <View style={[styles.composer, { backgroundColor: colors.white, borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!sending}
            placeholder={
              isGroup || isJumeloChat ? 'Écrire au jumelo…' : 'Écrire un message…'
            }
            placeholderTextColor={colors.inkFaint}
            style={[styles.input, { backgroundColor: colors.cream, color: colors.ink }]}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={send}
            disabled={sending || !draft.trim()}
            style={[
              styles.send,
              {
                backgroundColor: colors.accent,
                opacity: sending || !draft.trim() ? 0.55 : 1,
              },
            ]}
          >
            <Text style={{ color: '#fff', fontFamily: fonts.bodyBold }}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={membersOpen}
        transparent
        animationType="none"
        onRequestClose={() => setMembersOpen(false)}
      >
        <Pressable style={styles.membersBackdrop} onPress={() => setMembersOpen(false)}>
          <Animated.View entering={SlideInDown.springify().damping(80).stiffness(250)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Pressable
            style={[styles.membersSheet, { backgroundColor: colors.white, paddingBottom: Math.max(insets.bottom, 24) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.membersHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.membersTitle, { color: colors.ink }]}>
              Membres · {teamMembers.length || teamMemberIds.length}
            </Text>
            {loadingMembers ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {teamMembers.map((member) => (
                  <Pressable
                    key={member.id}
                    style={styles.memberRow}
                    onPress={() => { setMembersOpen(false); router.push(`/user/${member.id}`); }}
                  >
                    {member.photo ? (
                      <Image source={{ uri: member.photo }} style={styles.memberAvatar} />
                    ) : (
                      <Avatar name={member.name} color={member.avatarColor} size={40} />
                    )}
                    <Text style={[styles.memberName, { color: colors.ink }]}>{member.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>          </Animated.View>        </Pressable>
      </Modal>
    </>
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
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
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
  membersBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(1,24,103,0.35)',
  },
  membersSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  membersHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  membersTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  memberName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
});
