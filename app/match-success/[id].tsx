import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Atmosphere } from '../../src/components/Atmosphere';
import { CommonPointsBlock } from '../../src/components/CommonPointsBlock';
import { Button } from '../../src/components/ui';
import {
  Avatar,
  elevation,
  fonts,
  radii,
  spacing,
  withHexAlpha,
} from '../../src/design-system';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { mockUsers } from '../../src/data/mock';
import { getCommonPoints } from '../../src/lib/commonPoints';
import { getMatch, type MatchResult } from '../../src/lib/matching';
import { safeBack } from '../../src/lib/navigation';
import { openChatWithUser, resolveUserById } from '../../src/lib/users';

export default function MatchSuccessScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchResult | null | undefined>(undefined);
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !id) {
      setMatch(null);
      return;
    }
    (async () => {
      const local = getMatch(user, mockUsers, id);
      if (local) {
        if (active) setMatch(local);
        return;
      }
      const remote = await resolveUserById(id);
      if (!active) return;
      if (!remote) {
        setMatch(null);
        return;
      }
      setMatch(getMatch(user, [remote], id) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [user, id]);

  const commonPoints = useMemo(
    () => (user && match ? getCommonPoints(user, match.user) : []),
    [user, match],
  );

  if (!user || !id) return null;

  if (match === undefined) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  if (!match) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => safeBack('/(tabs)/discover')} style={styles.closeRow}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text style={[styles.missing, { color: colors.ink }]}>Profil introuvable</Text>
          <Button
            label="Jumelo du jour"
            onPress={() => safeBack('/(tabs)/discover')}
            style={styles.cta}
          />
        </SafeAreaView>
      </Atmosphere>
    );
  }

  const peer = match.user;
  const peerFirst = peer.name.split(' ')[0];

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => safeBack('/(tabs)/discover')}
          style={[styles.closeRow, { backgroundColor: colors.white, borderColor: colors.border }]}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarsRow}>
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: withHexAlpha(colors.primary, 0.3),
                    backgroundColor: colors.white,
                  },
                ]}
              >
                <Avatar
                  name={user.name}
                  photo={user.photo}
                  personaId={user.avatarPersonaId}
                  color={user.avatarColor}
                  size={52}
                />
              </View>
              <View style={[styles.linkBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="people" size={16} color="#fff" />
              </View>
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: withHexAlpha(colors.accent, 0.35),
                    backgroundColor: colors.white,
                  },
                ]}
              >
                <Avatar
                  name={peer.name}
                  photo={peer.photo}
                  personaId={peer.avatarPersonaId}
                  color={peer.avatarColor}
                  size={52}
                />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.ink }]}>Jumelo formé</Text>
            <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
              Toi et {peerFirst} — ce qui vous relie vraiment.
            </Text>
          </View>

          <View
            style={[
              styles.pointsCard,
              {
                backgroundColor: colors.white,
                borderColor: withHexAlpha(colors.primary, 0.12),
              },
              elevation.soft,
            ]}
          >
            <CommonPointsBlock
              points={commonPoints}
              score={match.score}
              reasons={match.reasons}
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label="Discuter"
            icon="chatbubble-outline"
            loading={openingChat}
            onPress={async () => {
              setOpeningChat(true);
              try {
                const path = await openChatWithUser(user.id, match.user.id);
                router.replace(path as `/chat/${string}`);
              } finally {
                setOpeningChat(false);
              }
            }}
          />
          <Button
            label="Voir le profil"
            icon="person-outline"
            variant="secondary"
            onPress={() => router.replace(`/user/${match.user.id}`)}
            style={{ marginTop: spacing.sm }}
          />
          <Button
            label="Jumelo du jour"
            icon="compass-outline"
            variant="ghost"
            onPress={() => safeBack('/(tabs)/discover')}
            style={{ marginTop: spacing.xs }}
          />
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  closeRow: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    marginRight: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    fontFamily: fonts.display,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -6,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  pointsCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cta: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
});
