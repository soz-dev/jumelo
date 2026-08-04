import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandLogo } from '../../src/components/BrandLogo';
import { ThemeSwitcherButton } from '../../src/components/ThemeSwitcher';
import {
  EmptyState,
  HeaderRow,
  Icon,
  Screen,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTeams } from '../../src/context/TeamsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { listAdminNotices, type AdminNotice } from '../../src/lib/adminStore';
import { listMyDmThreads, type DmThread } from '../../src/lib/api/messages';
import { listTeamChatsForMember } from '../../src/lib/api/teamChats';

type ListThread = {
  id: string;
  name: string;
  preview: string;
  updatedAt: string;
  unread: number;
  peerId?: string;
  photo?: string;
  avatarColor?: string;
  avatarLetter?: string;
  isGroup?: boolean;
};

export default function ChatListScreen() {
  const { colors } = useTheme();
  const { user, usingSupabase } = useAuth();
  const { teams } = useTeams();
  const [query, setQuery] = useState('');
  const [remoteThreads, setRemoteThreads] = useState<DmThread[]>([]);
  const [teamThreads, setTeamThreads] = useState<ListThread[]>([]);
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const notices = await listAdminNotices();
        if (active) setAdminNotices(notices);

        if (!user?.id) {
          if (active) {
            setRemoteThreads([]);
            setTeamThreads([]);
          }
          return;
        }

        // listMyDmThreads route déjà vers AsyncStorage pour fb-* / u-*
        const [rows, groups] = await Promise.all([
          listMyDmThreads(user.id),
          listTeamChatsForMember(user.id, teams),
        ]);
        if (!active) return;
        setRemoteThreads(rows);
        setTeamThreads(
          groups.map((t) => ({
            id: t.id,
            name: t.name,
            preview: t.preview,
            updatedAt: t.updatedAt,
            unread: t.unread,
            avatarColor: t.avatarColor,
            avatarLetter: t.avatarLetter,
            isGroup: true,
          })),
        );
      })();

      return () => {
        active = false;
      };
    }, [usingSupabase, user, teams]),
  );

  const threads = useMemo(() => {
    const q = query.trim().toLowerCase();

    const dmThreads: ListThread[] = remoteThreads.map((t) => ({
      id: t.id,
      name: t.peerName,
      preview: t.preview,
      updatedAt: t.updatedAt,
      unread: t.unread,
      peerId: t.peerId,
      photo: t.peerPhoto,
      avatarColor: t.peerAvatarColor,
    }));

    // Notices admin (démo) — une entrée par conversation admin-*
    const seenAdmin = new Set<string>();
    const adminThreads: ListThread[] = [];
    for (const n of adminNotices) {
      if (seenAdmin.has(n.conversationId)) continue;
      seenAdmin.add(n.conversationId);
      adminThreads.push({
        id: n.conversationId,
        name: `Admin → ${n.peerName}`,
        preview: n.body,
        updatedAt: 'Admin',
        unread: 1,
        peerId: n.peerId,
        avatarColor: '#12212B',
        avatarLetter: 'A',
      });
    }

    const source: ListThread[] = [...adminThreads, ...teamThreads, ...dmThreads];

    return source.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.preview.toLowerCase().includes(q),
    );
  }, [query, remoteThreads, teamThreads, adminNotices]);

  return (
    <Screen atmosphere="soft">
      <ScrollView contentContainerStyle={styles.content}>
        <HeaderRow
          title="Messages"
          subtitle="DMs, groupes & notices"
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BrandLogo size={34} />
              <ThemeSwitcherButton />
            </View>
          }
        />

        <View
          style={[
            styles.search,
            {
              backgroundColor: withHexAlpha(colors.white, 0.78),
              borderColor: withHexAlpha(colors.border, 0.95),
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher..."
            placeholderTextColor={colors.inkFaint}
            style={[styles.searchInput, { color: colors.ink }]}
          />
        </View>

        {threads.length === 0 ? (
          <EmptyState
            title="Aucune conversation"
            description="Intègre une équipe pour son chat de groupe, ou ouvre un profil puis tape « Discuter »."
            lottie="spark"
            actionLabel="Découvrir"
            onAction={() => router.push('/(tabs)/discover')}
          />
        ) : null}

        {threads.map((thread) => {
          const peer = thread.peerId
            ? mockUsers.find((u) => u.id === thread.peerId)
            : undefined;
          const photo = thread.photo ?? peer?.photo;

          return (
            <Pressable
              key={thread.id}
              style={[
                styles.row,
                {
                  backgroundColor: thread.isGroup
                    ? withHexAlpha(colors.primary, 0.06)
                    : withHexAlpha(colors.white, 0.55),
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: thread.isGroup
                    ? withHexAlpha(colors.primary, 0.12)
                    : withHexAlpha(colors.border, 0.8),
                },
              ]}
              onPress={() => router.push(`/chat/${thread.id}`)}
            >
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  if (thread.peerId) router.push(`/user/${thread.peerId}`);
                }}
              >
                {photo && !thread.isGroup ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.groupAvatar,
                      { backgroundColor: thread.avatarColor ?? colors.primarySoft },
                    ]}
                  >
                    {thread.isGroup ? (
                      <Ionicons name="people" size={22} color={colors.primaryDark} />
                    ) : (
                      <Text style={[styles.groupLetter, { color: colors.primaryDark }]}>
                        {thread.avatarLetter ?? thread.name[0]}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
                      {thread.name}
                    </Text>
                    {thread.isGroup ? (
                      <View style={[styles.groupBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.groupBadgeText, { color: colors.primaryDark }]}>
                          Groupe
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12 }}>
                    {thread.updatedAt}
                  </Text>
                </View>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }} numberOfLines={1}>
                  {thread.preview}
                </Text>
              </View>
              {thread.unread > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.badgeText}>{thread.unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15 },
  empty: {
    fontFamily: fonts.body,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLetter: { fontFamily: fonts.bodyBold, fontSize: 18 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 16 },
  groupBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  groupBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12 },
});
