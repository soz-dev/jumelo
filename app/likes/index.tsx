import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { listIncomingLikes } from '../../src/lib/api/likes';
import type { LikeRecord } from '../../src/lib/likesStore';
import { safeBack } from '../../src/lib/navigation';
import { useRequirePremium } from '../../src/lib/premiumStore';

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return 'à l’instant';
  if (ms < 3_600_000) return `il y a ${Math.floor(ms / 60_000)} min`;
  if (ms < 86_400_000) return `il y a ${Math.floor(ms / 3_600_000)} h`;
  return `il y a ${Math.floor(ms / 86_400_000)} j`;
}

export default function LikesInboxScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { ready: premiumReady, allowed } = useRequirePremium();
  const [likes, setLikes] = useState<LikeRecord[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user || !allowed) {
        setLikes([]);
        return () => {
          active = false;
        };
      }
      (async () => {
        const incoming = await listIncomingLikes(user.id);
        if (active) setLikes(incoming);
      })();
      return () => {
        active = false;
      };
    }, [user, allowed]),
  );

  if (!user) return null;
  if (!premiumReady || !allowed) {
    return (
      <Atmosphere variant="soft">
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere variant="soft">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => safeBack('/(tabs)/home')}
            style={[styles.iconBtn, { backgroundColor: colors.white, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={[styles.title, { color: colors.ink }]}>Invites reçues</Text>
          <View style={{ width: 40 }} />
        </View>

        {likes === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {likes.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={36} color={colors.inkFaint} />
                <Text style={[styles.emptyTitle, { color: colors.ink }]}>Aucune invite pour l’instant</Text>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, textAlign: 'center' }}>
                  Lance un cas de test depuis Home, ou attends qu’un profil veuille jumeler.
                </Text>
              </View>
            ) : (
              likes.map((like) => {
                const peer = mockUsers.find((u) => u.id === like.fromUserId);
                const name = peer?.name ?? 'Profil';
                const photo =
                  peer?.photo ??
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F8F8A&color=fff&size=200`;
                return (
                  <Pressable
                    key={`${like.fromUserId}-${like.createdAt}`}
                    onPress={() => router.push(`/liked-me/${like.fromUserId}`)}
                    style={[styles.row, { backgroundColor: colors.white, borderColor: colors.border }]}
                  >
                    <Image source={{ uri: photo }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: colors.ink }]}>
                        {name} veut jumeler
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
                        {relativeTime(like.createdAt)}
                      </Text>
                    </View>
                    {!like.read ? (
                      <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 10,
  },
  empty: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
