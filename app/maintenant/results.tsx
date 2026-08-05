import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScoreBadge } from '../../src/components/ui';
import { safeBack } from '../../src/lib/navigation';
import {
  UniverseId,
  getCategory,
  getSubCategory,
} from '../../src/constants/catalog';
import { fonts, radii, spacing } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { UserProfile, leaProfile, mockUsers } from '../../src/data/mock';
import {
  isOfficialJumelage,
  MatchResult,
  MATCH_THRESHOLD,
  rankMatches,
} from '../../src/lib/matching';
import { chatPathForUser } from '../../src/lib/users';

/** Cas de test MVP : toujours au moins un partenaire en ligne */
function getDemoResults(me: UserProfile, universeId: UniverseId): MatchResult[] {
  let ranked = rankMatches(me, mockUsers).filter((m) =>
    m.user.universes.includes(universeId),
  );

  if (ranked.length === 0) {
    ranked = rankMatches(me, mockUsers);
  }

  // Si on est connecté en tant que Léa, on montre Noah / Karim ; sinon Léa en tête
  if (ranked.length === 0) {
    const fallback =
      me.id === leaProfile.id
        ? mockUsers.find((u) => u.id === 'u-noah') ?? mockUsers[1]
        : leaProfile;
    return [
      {
        user: { ...fallback, online: true },
        score: 92,
        reasons: [],
      },
    ];
  }

  return ranked.slice(0, 3).map((m, index) => ({
    ...m,
    score: Math.max(m.score, 90 - index * 4),
    user: { ...m.user, online: true },
  }));
}

export default function MaintenantResultsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    universe?: string;
    sub?: string;
    platform?: string;
    activity?: string;
    vibe?: string;
    demo?: string;
  }>();

  const universeId = (
    typeof params.universe === 'string' && params.universe ? params.universe : 'gaming'
  ) as UniverseId;
  const cat = getCategory(universeId);
  const subId = typeof params.sub === 'string' ? params.sub : '';
  const sub = subId ? getSubCategory(universeId, subId) : undefined;
  const activityLabel =
    (typeof params.activity === 'string' && params.activity) ||
    sub?.label ||
    cat?.shortLabel ||
    'session';

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
        <Text style={{ padding: spacing.lg, fontFamily: fonts.body, color: colors.ink }}>
          Connecte-toi pour voir les jumelages.
        </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text
            style={{
              paddingHorizontal: spacing.lg,
              color: colors.primary,
              fontFamily: fonts.bodyBold,
            }}
          >
            Se connecter
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const results = getDemoResults(user, universeId);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cream }]}>
      <View style={styles.top}>
        <Pressable
          style={[styles.back, { backgroundColor: colors.white, borderColor: colors.border }]}
          onPress={() => safeBack('/maintenant')}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.icon, { backgroundColor: colors.primary }]}>
          <Ionicons name="flash" size={28} color="#fff" />
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>Jumelo maintenant</Text>
        <Text style={[styles.sub, { color: colors.inkMuted }]}>
          Choisis ton binôme — jumelage 1:1, pas une grosse team
        </Text>

        <View style={styles.resultHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.count, { color: colors.ink }]}>
              {results.length} jumelo{results.length > 1 ? 's' : ''} possible
              {results.length > 1 ? 's' : ''}
            </Text>
            <Text style={{ color: colors.inkMuted, fontFamily: fonts.body, fontSize: 13 }}>
              Disponibles maintenant · triés par compatibilité
            </Text>
          </View>
          <Pressable style={styles.redo} onPress={() => router.replace('/maintenant')}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fonts.bodyMedium }}>Refaire</Text>
          </Pressable>
        </View>

        {results.map((match, index) => {
          const jumelage = isOfficialJumelage(match.score);
          return (
          <View
            key={match.user.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.white,
                borderTopColor: cat?.color ?? colors.primary,
              },
              jumelage && index === 0
                ? { borderColor: colors.primary, borderWidth: 1.5, borderTopWidth: 4 }
                : null,
            ]}
          >
            {jumelage && index === 0 ? (
              <View style={[styles.matchFound, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="people" size={14} color={colors.primaryDark} />
                <Text style={{ color: colors.primaryDark, fontFamily: fonts.bodyBold, fontSize: 12 }}>
                  Jumelage trouvé · score {match.score}% (≥ {MATCH_THRESHOLD})
                </Text>
              </View>
            ) : null}
            <Pressable
              style={styles.cardTop}
              onPress={() => router.push(`/user/${match.user.id}`)}
            >
              <View>
                <Image
                  source={{
                    uri:
                      match.user.photo ??
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(match.user.name)}`,
                  }}
                  style={styles.avatar}
                />
                <View style={[styles.online, { borderColor: colors.white }]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.ink }]}>{match.user.name}</Text>
                  <View style={[styles.onlinePill, { backgroundColor: colors.primarySoft }]}>
                    <Text
                      style={{
                        color: colors.primaryDark,
                        fontFamily: fonts.bodyBold,
                        fontSize: 11,
                      }}
                    >
                      EN LIGNE
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.inkMuted, fontFamily: fonts.body }}>
                  {activityLabel}
                </Text>
                <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, marginTop: 4 }}>
                  Appuyer pour voir le profil · vibe {match.user.vibes.join(' · ')}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <ScoreBadge score={match.score} />
                <Text
                  style={{
                    color: jumelage ? colors.primary : colors.inkFaint,
                    fontFamily: fonts.bodyBold,
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  {jumelage ? 'JUMELAGE' : 'SCORE'}
                </Text>
              </View>
            </Pressable>

            <View style={styles.btns}>
              <Pressable
                style={[styles.chatBtn, { borderColor: colors.border }]}
                onPress={() => router.push(chatPathForUser(match.user.id))}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.ink} />
                <Text style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>Discuter</Text>
              </Pressable>
              <Pressable
                style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  router.push({
                    pathname: '/invite/[userId]',
                    params: {
                      userId: match.user.id,
                      activity: activityLabel,
                    },
                  })
                }
              >
                <Ionicons name="game-controller-outline" size={16} color="#fff" />
                <Text style={{ fontFamily: fonts.bodyBold, color: '#fff' }}>Inviter au jeu</Text>
              </Pressable>
            </View>
          </View>
          );
        })}

        <View style={[styles.hint, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="pulse" size={16} color={colors.primaryDark} />
          <Text style={{ flex: 1, color: colors.primaryDark, fontFamily: fonts.body }}>
            Cas de test MVP : un jumelo possible est toujours proposé. Jumelage officiel dès{' '}
            {MATCH_THRESHOLD}%.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.display, fontSize: 32, marginTop: spacing.md },
  sub: { fontFamily: fonts.body, marginTop: 4, marginBottom: spacing.lg },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  count: { fontFamily: fonts.bodyBold, fontSize: 16 },
  redo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: {
    borderRadius: radii.lg,
    borderTopWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  matchFound: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  onlinePill: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 3 },
  btns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  inviteBtn: {
    flex: 1.2,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: 12,
  },
  hint: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});
